const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3001;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Zeno2026';
const MAX_PLAYERS = 10, KILL_COOLDOWN = 25000, TASK_COUNT = 5, VOTE_TIME = 60000, DISCUSSION_TIME = 20000;

const rooms = new Map(), clients = new Map(), playerMods = new Map();

function getMod(pid) {
  if (!playerMods.has(pid)) playerMods.set(pid,{frozen:false,godmode:false,speedMult:1,aura:null,title:null,trailColor:null,badge:null,muted:false});
  return playerMods.get(pid);
}

class Room {
  constructor(code){this.code=code;this.players=new Map();this.phase='lobby';this.impostors=new Set();this.bodies=[];this.votes=new Map();this.voteTimer=null;this.discussionTimer=null;this.hostId=null;this.emergencyMeetingUsed=new Set();this._locked=false;this.createdAt=Date.now();}
  addPlayer(id,info){const spawns=[{x:480,y:155},{x:500,y:165},{x:520,y:155},{x:490,y:145},{x:510,y:175},{x:460,y:160},{x:540,y:160},{x:470,y:175},{x:530,y:145},{x:500,y:180}];const sp=spawns[this.players.size%spawns.length];this.players.set(id,{id,username:info.username||'Player',color:info.color||this._assignColor(),hat:info.hat||null,skin:info.skin||null,pfId:info.pfId||null,x:sp.x+(Math.random()-.5)*20,y:sp.y+(Math.random()-.5)*20,alive:true,role:'crewmate',tasks:[],tasksCompleted:0,kills:0,isOwner:info.isOwner||false,killCooldownUntil:0});if(!this.hostId)this.hostId=id;}
  _assignColor(){const used=new Set([...this.players.values()].map(p=>p.color));const pal=['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4','#cddc39'];return pal.find(c=>!used.has(c))||'#ffffff';}
  removePlayer(id){this.players.delete(id);if(this.hostId===id)this.hostId=[...this.players.keys()][0]||null;if(this.players.size===0){clearTimeout(this.voteTimer);clearTimeout(this.discussionTimer);rooms.delete(this.code);}}
  startGame(){if(this.players.size<1)return false;this.phase='game';this.bodies=[];this.votes=new Map();this.emergencyMeetingUsed=new Set();this.impostors.clear();const ids=shuffle([...this.players.keys()]);const ic=this.players.size>=10?3:this.players.size>=7?2:1;for(let i=0;i<Math.min(ic,ids.length-1);i++)this.impostors.add(ids[i]);const sps=[{x:480,y:155},{x:500,y:165},{x:520,y:155},{x:490,y:145},{x:510,y:175},{x:460,y:160},{x:540,y:160},{x:470,y:175},{x:530,y:145},{x:500,y:180}];let si=0;for(const[id,p]of this.players){p.alive=true;p.role=this.impostors.has(id)?'impostor':'crewmate';p.tasksCompleted=0;p.kills=0;p.tasks=generateTasks(TASK_COUNT);p.killCooldownUntil=Date.now()+10000;const sp=sps[si++%sps.length];p.x=sp.x+(Math.random()-.5)*20;p.y=sp.y+(Math.random()-.5)*20;}return true;}
  getTotalTasks(){let total=0,done=0;for(const p of this.players.values())if(p.role==='crewmate'){total+=TASK_COUNT;done+=p.tasksCompleted;}return{total,done};}
  checkWin(){const alive=[...this.players.values()].filter(p=>p.alive);const imps=alive.filter(p=>p.role==='impostor');const crew=alive.filter(p=>p.role!=='impostor');if(imps.length===0)return'crewmate';if(imps.length>=crew.length)return'impostor';const{total,done}=this.getTotalTasks();if(total>0&&done>=total)return'crewmate';return null;}
  getPublicState(forId){const viewer=forId?this.players.get(forId):null;const isImp=viewer?.role==='impostor';const players={};for(const[id,p]of this.players){players[id]={id,username:p.username,color:p.color,hat:p.hat,skin:p.skin,x:p.x,y:p.y,alive:p.alive,tasksCompleted:p.tasksCompleted,taskTotal:TASK_COUNT,isOwner:p.isOwner,role:(isImp||id===forId)?p.role:undefined,mod:getMod(id)};}const{total,done}=this.getTotalTasks();return{code:this.code,phase:this.phase,players,bodies:this.bodies,taskProgress:{total,done},hostId:this.hostId,votes:(this.phase==='vote'||this.phase==='meeting')?Object.fromEntries(this.votes):undefined};}
}

function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function generateTasks(count){const defs=[{type:'wires',location:{name:'Electrical',x:148,y:520}},{type:'pattern',location:{name:'Navigation',x:810,y:150}},{type:'button',location:{name:'Reactor',x:140,y:310}},{type:'wires',location:{name:'MedBay',x:500,y:390}},{type:'pattern',location:{name:'Storage',x:760,y:540}},{type:'button',location:{name:'Engine',x:410,y:575}},{type:'wires',location:{name:'Cafeteria',x:500,y:178}}];return shuffle([...defs]).slice(0,count).map(t=>({id:uuidv4(),type:t.type,completed:false,location:t.location}));}
function broadcast(room,msg,excludeId=null){for(const[ws,info]of clients)if(info.roomCode===room.code&&info.playerId!==excludeId&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));}
function sendTo(pid,msg){for(const[ws,info]of clients)if(info.playerId===pid&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));}
function getWsForPlayer(pid){for(const[ws,info]of clients)if(info.playerId===pid)return ws;return null;}
function getRoomForPlayer(pid){for(const[,room]of rooms)if(room.players.has(pid))return room;return null;}
function ownerOk(ws,msg){if(msg.password!==OWNER_PASSWORD){ws.send(JSON.stringify({type:'error',message:'Wrong owner password'}));return false;}return true;}
function checkGameEnd(room){const w=room.checkWin();if(w)endGame(room,w);}

wss.on('connection',ws=>{
  clients.set(ws,{clientId:uuidv4(),playerId:null,roomCode:null});
  ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw);}catch{return;}handleMessage(ws,msg);});
  ws.on('close',()=>{const info=clients.get(ws);if(info?.playerId)handleDisconnect(info.playerId);clients.delete(ws);});
  ws.on('error',()=>{const info=clients.get(ws);if(info?.playerId)handleDisconnect(info.playerId);clients.delete(ws);});
});

function handleDisconnect(pid){const room=getRoomForPlayer(pid);if(!room)return;const player=room.players.get(pid);broadcast(room,{type:'player_left',playerId:pid,username:player?.username});if(room.phase==='game'||room.phase==='meeting'||room.phase==='vote'){if(player)player.alive=false;checkGameEnd(room);}else{room.removePlayer(pid);for(const[id]of room.players)sendTo(id,{type:'room_update',state:room.getPublicState(id)});}}

const OWNER_CMDS=new Set(['owner_broadcast','owner_freeze','owner_teleport','owner_set_role','owner_end_game','owner_kill_player','owner_godmode','owner_speed_boost','owner_reveal_roles','owner_force_meeting','owner_set_killcooldown','owner_respawn','owner_set_cosmetic','owner_clear_cosmetic','owner_set_tasks','owner_swap_roles','owner_mute','owner_shuffle_roles','owner_set_aura','owner_set_title','owner_set_badge','owner_explosion','owner_all_tasks_done','owner_lock_room','owner_unlock_room','owner_kick']);

function handleMessage(ws,msg){
  const info=clients.get(ws);
  if(msg.type==='chat_message'&&info?.playerId&&getMod(info.playerId).muted){ws.send(JSON.stringify({type:'error',message:'You are muted.'}));return;}
  if(OWNER_CMDS.has(msg.type)){handleOwnerCmd(ws,msg,info);return;}
  switch(msg.type){
    case 'join_room':{
      const code=String(msg.roomCode||'').toUpperCase().slice(0,8);if(!code)return;
      let room=rooms.get(code);if(!room){room=new Room(code);rooms.set(code,room);}
      if(room._locked){ws.send(JSON.stringify({type:'error',message:'Room is locked'}));return;}
      if(room.phase!=='lobby'){ws.send(JSON.stringify({type:'error',message:'Game in progress'}));return;}
      if(room.players.size>=MAX_PLAYERS){ws.send(JSON.stringify({type:'error',message:'Room full'}));return;}
      const pid=uuidv4();info.playerId=pid;info.roomCode=code;
      room.addPlayer(pid,msg);
      ws.send(JSON.stringify({type:'joined',playerId:pid,roomCode:code,state:room.getPublicState(pid),myRole:room.players.get(pid).role,myTasks:room.players.get(pid).tasks}));
      broadcast(room,{type:'player_joined',player:{id:pid,username:msg.username||'Player',color:msg.color,hat:msg.hat,x:room.players.get(pid).x,y:room.players.get(pid).y,alive:true}},pid);
      break;
    }
    case 'start_game':{
      const room=getRoomForPlayer(info.playerId);if(!room)return;
      const caller=room.players.get(info.playerId);if(!caller)return;
      if(room.hostId!==info.playerId&&!caller.isOwner){ws.send(JSON.stringify({type:'error',message:'Only host can start'}));return;}
      if(!room.startGame()){ws.send(JSON.stringify({type:'error',message:'Need players'}));return;}
      for(const[pid,p]of room.players)sendTo(pid,{type:'game_started',state:room.getPublicState(pid),myRole:p.role,myTasks:p.tasks,impostors:p.role==='impostor'?[...room.impostors]:[]});
      break;
    }
    case 'move':{
      const room=getRoomForPlayer(info.playerId);if(!room||room.phase!=='game')return;
      const p=room.players.get(info.playerId);if(!p||!p.alive||getMod(info.playerId).frozen)return;
      p.x=Math.max(30,Math.min(970,Number(msg.x)||p.x));p.y=Math.max(30,Math.min(670,Number(msg.y)||p.y));
      broadcast(room,{type:'player_moved',playerId:info.playerId,x:p.x,y:p.y},info.playerId);
      break;
    }
    case 'kill':{
      const room=getRoomForPlayer(info.playerId);if(!room||room.phase!=='game')return;
      const killer=room.players.get(info.playerId),victim=room.players.get(msg.targetId);
      if(!killer||!victim||killer.role!=='impostor'||!killer.alive||!victim.alive)return;
      if(getMod(msg.targetId).godmode){ws.send(JSON.stringify({type:'error',message:'Target has godmode'}));return;}
      if(Date.now()<killer.killCooldownUntil){ws.send(JSON.stringify({type:'error',message:'On cooldown'}));return;}
      if(Math.sqrt((killer.x-victim.x)**2+(killer.y-victim.y)**2)>100){ws.send(JSON.stringify({type:'error',message:'Too far'}));return;}
      victim.alive=false;killer.kills++;killer.killCooldownUntil=Date.now()+KILL_COOLDOWN;
      const body={id:uuidv4(),playerId:victim.id,username:victim.username,x:victim.x,y:victim.y,color:victim.color};
      room.bodies.push(body);broadcast(room,{type:'player_killed',killerId:info.playerId,victimId:msg.targetId,body});checkGameEnd(room);
      break;
    }
    case 'report_body':{
      const room=getRoomForPlayer(info.playerId);if(!room||room.phase!=='game')return;
      const rep=room.players.get(info.playerId);if(!rep||!rep.alive)return;
      let near=null,minD=80;for(const b of room.bodies){const d=Math.sqrt((rep.x-b.x)**2+(rep.y-b.y)**2);if(d<minD){minD=d;near=b;}}
      if(!near){ws.send(JSON.stringify({type:'error',message:'No body nearby'}));return;}
      startMeeting(room,info.playerId,`🔴 ${rep.username} reported ${near.username}'s body!`);
      break;
    }
    case 'emergency_meeting':{
      const room=getRoomForPlayer(info.playerId);if(!room||room.phase!=='game')return;
      const caller=room.players.get(info.playerId);if(!caller||!caller.alive)return;
      if(room.emergencyMeetingUsed.has(info.playerId)){ws.send(JSON.stringify({type:'error',message:'Already used emergency meeting'}));return;}
      if(Math.sqrt((caller.x-500)**2+(caller.y-178)**2)>120){ws.send(JSON.stringify({type:'error',message:'Too far from button'}));return;}
      room.emergencyMeetingUsed.add(info.playerId);startMeeting(room,info.playerId,`🚨 ${caller.username} called an emergency meeting!`);
      break;
    }
    case 'complete_task':{
      const room=getRoomForPlayer(info.playerId);if(!room||room.phase!=='game')return;
      const p=room.players.get(info.playerId);if(!p||p.role!=='crewmate')return;
      const task=p.tasks.find(t=>t.id===msg.taskId&&!t.completed);if(!task)return;
      if(Math.sqrt((p.x-task.location.x)**2+(p.y-task.location.y)**2)>80){ws.send(JSON.stringify({type:'error',message:'Not near task'}));return;}
      task.completed=true;p.tasksCompleted++;
      broadcast(room,{type:'task_completed',playerId:info.playerId,username:p.username,taskId:msg.taskId,progress:room.getTotalTasks()});
      checkGameEnd(room);
      break;
    }
    case 'cast_vote':{
      const room=getRoomForPlayer(info.playerId);if(!room||room.phase!=='vote')return;
      const voter=room.players.get(info.playerId);if(!voter||!voter.alive||room.votes.has(info.playerId))return;
      room.votes.set(info.playerId,msg.targetId||'skip');
      broadcast(room,{type:'vote_cast',voterId:info.playerId,voterName:voter.username,targetId:msg.targetId,voteCount:room.votes.size,totalAlive:[...room.players.values()].filter(p=>p.alive).length});
      if(room.votes.size>=[...room.players.values()].filter(p=>p.alive).length){clearTimeout(room.voteTimer);resolveVote(room);}
      break;
    }
    case 'chat_message':{
      const room=getRoomForPlayer(info.playerId);if(!room)return;
      if(room.phase!=='meeting'&&room.phase!=='vote')return;
      const p=room.players.get(info.playerId);if(!p)return;
      const text=String(msg.text||'').trim().slice(0,200);if(!text)return;
      broadcast(room,{type:'chat',playerId:info.playerId,username:p.username,color:p.color,text,alive:p.alive});
      break;
    }
    case 'ping': ws.send(JSON.stringify({type:'pong',time:Date.now()}));break;
  }
}

function handleOwnerCmd(ws,msg,info){
  const room=getRoomForPlayer(info.playerId);
  if(!room){ws.send(JSON.stringify({type:'error',message:'Not in a room'}));return;}
  if(!ownerOk(ws,msg))return;
  const ack=(cmd,extra={})=>ws.send(JSON.stringify({type:'owner_ack',cmd,...extra}));
  const COORDS={cafeteria:{x:500,y:160},reactor:{x:140,y:305},navigation:{x:810,y:140},medbay:{x:500,y:370},storage:{x:817,y:535},electrical:{x:155,y:530},engine:{x:408,y:578}};
  switch(msg.type){
    case 'owner_kick':{const targetWs=getWsForPlayer(msg.targetId);if(targetWs){targetWs.send(JSON.stringify({type:'kicked',reason:msg.reason||'Kicked'}));setTimeout(()=>targetWs.close(),500);}const tp=room.players.get(msg.targetId);if(tp)broadcast(room,{type:'system_message',text:`${tp.username} was kicked.`});break;}
    case 'owner_broadcast':{broadcast(room,{type:'owner_announcement',text:String(msg.text||'').slice(0,300),color:msg.color||'#fbbf24',icon:msg.icon||'📢'});ack('broadcast');break;}
    case 'owner_freeze':{const t=room.players.get(msg.targetId);if(!t)return;getMod(msg.targetId).frozen=!!msg.frozen;broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});broadcast(room,{type:'system_message',text:`${t.username} was ${msg.frozen?'frozen':'unfrozen'}.`});ack('freeze');break;}
    case 'owner_teleport':{const t=room.players.get(msg.targetId);if(!t)return;let tx=Number(msg.x)||t.x,ty=Number(msg.y)||t.y;if(msg.room&&COORDS[msg.room.toLowerCase()]){const c=COORDS[msg.room.toLowerCase()];tx=c.x+(Math.random()-.5)*20;ty=c.y+(Math.random()-.5)*20;}t.x=tx;t.y=ty;broadcast(room,{type:'player_teleported',playerId:msg.targetId,x:tx,y:ty});ack('teleport');break;}
    case 'owner_set_role':{const t=room.players.get(msg.targetId);if(!t||room.phase!=='game')return;t.role=msg.role==='impostor'?'impostor':'crewmate';if(msg.role==='impostor')room.impostors.add(msg.targetId);else room.impostors.delete(msg.targetId);sendTo(msg.targetId,{type:'role_changed',newRole:t.role,byOwner:true});broadcast(room,{type:'system_message',text:`${t.username}'s role was changed.`});ack('set_role');break;}
    case 'owner_end_game':{broadcast(room,{type:'system_message',text:'Game force-ended!'});setTimeout(()=>endGame(room,msg.winner==='impostor'?'impostor':'crewmate'),500);ack('end_game');break;}
    case 'owner_kill_player':{const t=room.players.get(msg.targetId);if(!t||!t.alive||room.phase!=='game')return;t.alive=false;const body={id:uuidv4(),playerId:t.id,username:t.username,x:t.x,y:t.y,color:t.color};room.bodies.push(body);broadcast(room,{type:'player_killed',killerId:info.playerId,victimId:msg.targetId,body,byOwner:true});checkGameEnd(room);ack('kill_player');break;}
    case 'owner_godmode':{const t=room.players.get(msg.targetId);if(!t)return;getMod(msg.targetId).godmode=!!msg.enabled;broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});broadcast(room,{type:'system_message',text:`${t.username} ${msg.enabled?'immortal':'mortal again'}.`});ack('godmode');break;}
    case 'owner_speed_boost':{const t=room.players.get(msg.targetId);if(!t)return;const mult=Math.max(.2,Math.min(5,Number(msg.mult)||1));getMod(msg.targetId).speedMult=mult;broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});sendTo(msg.targetId,{type:'speed_changed',mult});broadcast(room,{type:'system_message',text:`${t.username} speed → ${mult}x`});ack('speed_boost');break;}
    case 'owner_reveal_roles':{const roles=[...room.players.values()].map(p=>({id:p.id,username:p.username,role:p.role,alive:p.alive}));ws.send(JSON.stringify({type:'owner_roles_reveal',roles}));break;}
    case 'owner_force_meeting':{if(room.phase!=='game')return;startMeeting(room,info.playerId,`⚡ ${msg.reason||'Owner forced a meeting!'}`);ack('force_meeting');break;}
    case 'owner_set_killcooldown':{const secs=Math.max(0,Math.min(120,Number(msg.seconds)||25));for(const p of room.players.values())if(p.role==='impostor')p.killCooldownUntil=Date.now()+secs*1000;broadcast(room,{type:'system_message',text:`Kill cooldown → ${secs}s`});ack('set_killcooldown');break;}
    case 'owner_respawn':{const t=room.players.get(msg.targetId);if(!t||room.phase!=='game')return;t.alive=true;room.bodies=room.bodies.filter(b=>b.playerId!==msg.targetId);broadcast(room,{type:'player_respawned',playerId:msg.targetId,x:t.x,y:t.y,username:t.username,color:t.color});broadcast(room,{type:'system_message',text:`✨ ${t.username} respawned!`});ack('respawn');break;}
    case 'owner_set_cosmetic':{const t=room.players.get(msg.targetId);if(!t)return;const mod=getMod(msg.targetId);if(['aura','title','badge','trailColor'].includes(msg.cosType))mod[msg.cosType]=msg.value||null;broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod});ack('set_cosmetic');break;}
    case 'owner_clear_cosmetic':{playerMods.delete(msg.targetId);broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});ack('clear_cosmetic');break;}
    case 'owner_set_tasks':{const t=room.players.get(msg.targetId);if(!t||room.phase!=='game')return;t.tasks=generateTasks(Math.max(1,Math.min(10,Number(msg.count)||3)));t.tasksCompleted=0;sendTo(msg.targetId,{type:'tasks_reset',tasks:t.tasks});broadcast(room,{type:'system_message',text:`${t.username}'s tasks reset.`});ack('set_tasks');break;}
    case 'owner_swap_roles':{const a=room.players.get(msg.targetA),b=room.players.get(msg.targetB);if(!a||!b||room.phase!=='game')return;const tmp=a.role;a.role=b.role;b.role=tmp;if(a.role==='impostor')room.impostors.add(msg.targetA);else room.impostors.delete(msg.targetA);if(b.role==='impostor')room.impostors.add(msg.targetB);else room.impostors.delete(msg.targetB);sendTo(msg.targetA,{type:'role_changed',newRole:a.role,byOwner:true});sendTo(msg.targetB,{type:'role_changed',newRole:b.role,byOwner:true});broadcast(room,{type:'system_message',text:`🔀 ${a.username} & ${b.username} swapped!`});ack('swap_roles');break;}
    case 'owner_mute':{const t=room.players.get(msg.targetId);if(!t)return;getMod(msg.targetId).muted=!!msg.muted;broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});broadcast(room,{type:'system_message',text:`${t.username} ${msg.muted?'muted':'unmuted'}.`});ack('mute');break;}
    case 'owner_shuffle_roles':{if(room.phase!=='game')return;const pids=shuffle([...room.players.keys()]);room.impostors.clear();const ic=room.players.size>=10?3:room.players.size>=7?2:1;for(let i=0;i<Math.min(ic,pids.length-1);i++)room.impostors.add(pids[i]);for(const p of room.players.values()){p.role=room.impostors.has(p.id)?'impostor':'crewmate';sendTo(p.id,{type:'role_changed',newRole:p.role,byOwner:true});}broadcast(room,{type:'system_message',text:'🎲 Roles shuffled!'});ack('shuffle_roles');break;}
    case 'owner_set_aura':{const t=room.players.get(msg.targetId);if(!t)return;getMod(msg.targetId).aura=msg.color||null;broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});ack('set_aura');break;}
    case 'owner_set_title':{const t=room.players.get(msg.targetId);if(!t)return;getMod(msg.targetId).title=String(msg.title||'').slice(0,24);broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});ack('set_title');break;}
    case 'owner_set_badge':{const t=room.players.get(msg.targetId);if(!t)return;getMod(msg.targetId).badge=String(msg.badge||'').slice(0,4);broadcast(room,{type:'player_mod_update',playerId:msg.targetId,mod:getMod(msg.targetId)});ack('set_badge');break;}
    case 'owner_explosion':{const t=room.players.get(msg.targetId);const cx=t?t.x:Number(msg.x)||500,cy=t?t.y:Number(msg.y)||300;const radius=Math.max(50,Math.min(400,Number(msg.radius)||150));const killed=[];for(const[pid,p]of room.players){if(!p.alive||getMod(pid).godmode)continue;if(Math.sqrt((p.x-cx)**2+(p.y-cy)**2)<=radius){p.alive=false;killed.push(pid);const body={id:uuidv4(),playerId:p.id,username:p.username,x:p.x,y:p.y,color:p.color};room.bodies.push(body);broadcast(room,{type:'player_killed',killerId:info.playerId,victimId:pid,body,byOwner:true});}}broadcast(room,{type:'owner_explosion_fx',cx,cy,radius});broadcast(room,{type:'system_message',text:`💥 ${killed.length} eliminated!`});checkGameEnd(room);ack('explosion',{killed:killed.length});break;}
    case 'owner_all_tasks_done':{for(const p of room.players.values()){if(p.role!=='crewmate')continue;p.tasks.forEach(t=>t.completed=true);p.tasksCompleted=p.tasks.length;}broadcast(room,{type:'task_completed',playerId:info.playerId,username:'Owner',taskId:'all',progress:room.getTotalTasks()});broadcast(room,{type:'system_message',text:'✅ All tasks done!'});checkGameEnd(room);ack('all_tasks_done');break;}
    case 'owner_lock_room':{room._locked=true;broadcast(room,{type:'system_message',text:'🔒 Room locked.'});ack('lock_room');break;}
    case 'owner_unlock_room':{room._locked=false;broadcast(room,{type:'system_message',text:'🔓 Room unlocked.'});ack('unlock_room');break;}
  }
}

function startMeeting(room,callerId,reason){
  if(room.phase!=='game')return;clearTimeout(room.voteTimer);clearTimeout(room.discussionTimer);room.phase='meeting';room.votes=new Map();
  broadcast(room,{type:'meeting_started',callerId,reason,state:room.getPublicState(null),discussionTime:DISCUSSION_TIME});
  room.discussionTimer=setTimeout(()=>{if(room.phase!=='meeting')return;room.phase='vote';broadcast(room,{type:'voting_started',voteTime:VOTE_TIME});room.voteTimer=setTimeout(()=>{if(room.phase==='vote')resolveVote(room);},VOTE_TIME);},DISCUSSION_TIME);
}

function resolveVote(room){
  clearTimeout(room.voteTimer);clearTimeout(room.discussionTimer);const tally=new Map();let skipCount=0;
  for(const[,t]of room.votes){if(t==='skip'){skipCount++;continue;}tally.set(t,(tally.get(t)||0)+1);}
  let maxVotes=0,ejected=null;for(const[id,cnt]of tally)if(cnt>maxVotes){maxVotes=cnt;ejected=id;}
  let ties=0;for(const[,cnt]of tally)if(cnt===maxVotes)ties++;if(ties>1||skipCount>=maxVotes)ejected=null;
  let ejectedPlayer=null;if(ejected){const p=room.players.get(ejected);if(p){p.alive=false;ejectedPlayer={id:p.id,username:p.username,role:p.role,color:p.color};}}
  broadcast(room,{type:'vote_result',ejected:ejectedPlayer,votes:Object.fromEntries(tally),skipCount,skipped:!ejected});
  const winner=room.checkWin();
  if(winner)setTimeout(()=>endGame(room,winner),5000);
  else setTimeout(()=>{if(!rooms.has(room.code))return;room.phase='game';room.bodies=[];for(const p of room.players.values())if(p.role==='impostor')p.killCooldownUntil=Date.now()+10000;broadcast(room,{type:'game_resumed',state:room.getPublicState(null)});},6000);
}

function endGame(room,winner){
  room.phase='end';clearTimeout(room.voteTimer);clearTimeout(room.discussionTimer);
  const results=[...room.players.values()].map(p=>({id:p.id,username:p.username,color:p.color,role:p.role,alive:p.alive,kills:p.kills,tasksCompleted:p.tasksCompleted}));
  broadcast(room,{type:'game_over',winner,results,impostors:[...room.impostors]});
  setTimeout(()=>{if(!rooms.has(room.code))return;room.phase='lobby';room.bodies=[];room.impostors.clear();room.emergencyMeetingUsed=new Set();for(const p of room.players.values()){p.role='crewmate';p.alive=true;p.tasks=[];p.tasksCompleted=0;p.kills=0;p.killCooldownUntil=0;}for(const[pid]of room.players)sendTo(pid,{type:'back_to_lobby',state:room.getPublicState(pid)});},15000);
}

app.get('/health',(req,res)=>res.json({status:'ok',rooms:rooms.size,clients:clients.size}));
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

server.listen(PORT,()=>{console.log(`🚀 Space Traitors game server on port ${PORT}`);console.log(`🔑 Owner password: ${OWNER_PASSWORD}`);});
