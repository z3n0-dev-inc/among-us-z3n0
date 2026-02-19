const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
const OWNER_PW = process.env.OWNER_PW || 'Zeno2026';

const DISC_TIME = 25000;
const VOTE_TIME = 60000;
const MAX_PLAYERS = 10;

const TASK_LOCS = [
  { name: 'Cafeteria',   x: 500, y: 175 },
  { name: 'Reactor',     x: 140, y: 310 },
  { name: 'Navigation',  x: 810, y: 135 },
  { name: 'MedBay',      x: 500, y: 390 },
  { name: 'Storage',     x: 817, y: 535 },
  { name: 'Engine',      x: 408, y: 578 },
  { name: 'Electrical',  x: 148, y: 520 },
];
const TASK_TYPES = ['wires', 'mash', 'pattern', 'panel'];

const rooms   = new Map();
const sockets = new Map();

function uid() { return Math.random().toString(36).slice(2, 11); }
function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function roomPlayers(room) {
  const out = [];
  for (const [, p] of sockets) if (p.roomCode === room.code) out.push(p);
  return out;
}

function pub(p) {
  return {
    id: p.id, username: p.username, color: p.color,
    hat: p.hat || null, skin: p.skin || null,
    trailColor: p.trailColor || null, auraColor: p.auraColor || null,
    nameColor: p.nameColor || null, tags: p.tags || [],
    isOwner: p.isOwner || false, alive: p.alive,
    x: p.x, y: p.y,
  };
}

function stateFor(room) {
  const players = {};
  for (const p of roomPlayers(room)) players[p.id] = pub(p);
  return {
    code: room.code, phase: room.phase, hostId: room.hostId,
    taskProgress: room.taskProgress || { done: 0, total: 0 },
    players, bodies: room.bodies || [], votes: room.votes || {},
  };
}

function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room, msg, except = null) {
  const d = JSON.stringify(msg);
  for (const [ws, p] of sockets)
    if (p.roomCode === room.code && ws !== except && ws.readyState === WebSocket.OPEN)
      ws.send(d);
}

function genTasks(n = 5) {
  const locs = [...TASK_LOCS].sort(() => Math.random() - 0.5).slice(0, n);
  return locs.map((loc, i) => ({
    id: uid(), location: loc,
    type: TASK_TYPES[i % TASK_TYPES.length], completed: false,
  }));
}

function calcProgress(room) {
  let done = 0, total = 0;
  for (const p of roomPlayers(room)) {
    if (p.role === 'crewmate' && p.tasks) {
      total += p.tasks.length;
      done  += p.tasks.filter(t => t.completed).length;
    }
  }
  room.taskProgress = { done, total };
  return room.taskProgress;
}

function checkWin(room) {
  if (room.phase !== 'game') return false;
  const all   = roomPlayers(room);
  const alive  = all.filter(p => p.alive);
  const imps   = alive.filter(p => p.role === 'impostor');
  const crew   = alive.filter(p => p.role === 'crewmate');
  const allImps = all.filter(p => p.role === 'impostor');

  const tp = calcProgress(room);
  if (tp.total > 0 && tp.done >= tp.total) {
    endGame(room, 'crewmate', 'All tasks completed!'); return true;
  }
  if (allImps.length > 0 && allImps.every(p => !p.alive)) {
    endGame(room, 'crewmate', 'All impostors were eliminated!'); return true;
  }
  if (imps.length > 0 && imps.length >= crew.length) {
    endGame(room, 'impostor', 'Impostors have taken over!'); return true;
  }
  return false;
}

function endGame(room, winner, reason) {
  if (room.phase === 'ended') return;
  room.phase = 'ended';
  clearTimers(room);
  const results = roomPlayers(room).map(p => ({
    id: p.id, username: p.username, color: p.color, role: p.role, alive: p.alive,
    kills: p.kills || 0, tasksCompleted: (p.tasks || []).filter(t => t.completed).length,
  }));
  broadcast(room, { type: 'game_over', winner, reason, results });
  setTimeout(() => {
    if (!rooms.has(room.code)) return;
    for (const p of roomPlayers(room)) {
      p.role = null; p.alive = true; p.tasks = []; p.kills = 0; p.mods = {};
    }
    room.phase = 'waiting'; room.bodies = []; room.votes = {};
    room.taskProgress = { done: 0, total: 0 };
    broadcast(room, { type: 'back_to_lobby', state: stateFor(room) });
  }, 12000);
}

function clearTimers(room) {
  if (room._t1) { clearTimeout(room._t1); room._t1 = null; }
  if (room._t2) { clearTimeout(room._t2); room._t2 = null; }
}

function startMeeting(room, reason) {
  if (room.phase === 'ended') return;
  clearTimers(room);
  room.phase = 'meeting'; room.votes = {}; room.bodies = [];
  broadcast(room, {
    type: 'meeting_started', reason,
    state: stateFor(room), discussionTime: DISC_TIME,
  });
  room._t1 = setTimeout(() => {
    room.phase = 'vote';
    broadcast(room, { type: 'voting_started', voteTime: VOTE_TIME });
    room._t2 = setTimeout(() => resolveVote(room), VOTE_TIME);
  }, DISC_TIME);
}

function resolveVote(room) {
  clearTimers(room);
  const tally = {};
  for (const [, v] of Object.entries(room.votes || {}))
    if (v && v !== 'skip') tally[v] = (tally[v] || 0) + 1;

  let ejected = null, max = 0, tied = false;
  for (const [pid, cnt] of Object.entries(tally)) {
    if (cnt > max) { max = cnt; ejected = pid; tied = false; }
    else if (cnt === max) tied = true;
  }
  if (tied) ejected = null;

  let ejectedData = null;
  if (ejected) {
    const ep = roomPlayers(room).find(p => p.id === ejected);
    if (ep) { ep.alive = false; ejectedData = { ...pub(ep), role: ep.role }; }
  }

  broadcast(room, { type: 'vote_result', ejected: ejectedData, tally });
  setTimeout(() => {
    if (checkWin(room)) return;
    room.phase = 'game';
    broadcast(room, { type: 'game_resumed', state: stateFor(room) });
  }, 5000);
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const player = sockets.get(ws);

    switch (msg.type) {
      case 'join_room':
      case 'join': {
        let code = ((msg.roomCode || msg.room || '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!code) code = genCode();
        if (!rooms.has(code))
          rooms.set(code, { code, phase: 'waiting', hostId: null, bodies: [], votes: {}, taskProgress: { done: 0, total: 0 } });
        const room = rooms.get(code);
        if (roomPlayers(room).length >= MAX_PLAYERS) { send(ws, { type: 'error', message: 'Room is full!' }); return; }
        const id = uid();
        const p = {
          id, ws, roomCode: code,
          username: (msg.username || 'Player').slice(0, 16),
          color: msg.color || '#e74c3c',
          hat: msg.hat || null, skin: msg.skin || null,
          trailColor: msg.trailColor || null, auraColor: msg.auraColor || null,
          nameColor: msg.nameColor || null, tags: Array.isArray(msg.tags) ? msg.tags : [],
          isOwner: msg.isOwner || false, pfId: msg.pfId || null,
          alive: true, x: 400 + Math.random() * 200, y: 100 + Math.random() * 100,
          role: null, tasks: [], kills: 0, mods: {},
        };
        if (!room.hostId) room.hostId = id;
        sockets.set(ws, p);
        send(ws, { type: 'joined', playerId: id, roomCode: code, state: stateFor(room), myRole: null, myTasks: [] });
        broadcast(room, { type: 'player_joined', player: pub(p) }, ws);
        break;
      }

      case 'start_game': {
        if (!player) break;
        const room = rooms.get(player.roomCode);
        if (!room || room.phase !== 'waiting') break;
        if (room.hostId !== player.id && !player.isOwner) { send(ws, { type: 'error', message: 'Only the host can start.' }); break; }
        const ps = roomPlayers(room);
        if (ps.length < 2) { send(ws, { type: 'error', message: 'Need at least 2 players.' }); break; }
        room.phase = 'game'; room.bodies = []; room.votes = {};
        const numImps = Math.max(1, Math.floor(ps.length / 5));
        const sh = [...ps].sort(() => Math.random() - 0.5);
        sh.forEach((p, i) => {
          p.role = i < numImps ? 'impostor' : 'crewmate';
          p.alive = true; p.kills = 0; p.mods = {};
          p.x = 350 + Math.random() * 300; p.y = 100 + Math.random() * 100;
          p.tasks = p.role === 'crewmate' ? genTasks(5) : [];
        });
        calcProgress(room);
        for (const p of ps) send(p.ws, { type: 'game_started', state: stateFor(room), myRole: p.role, myTasks: p.tasks || [] });
        break;
      }

      case 'move': {
        if (!player) break;
        const room = rooms.get(player.roomCode);
        if (!room || room.phase !== 'game' || !player.alive) break;
        if (player.mods && player.mods.frozen) break;
        player.x = msg.x; player.y = msg.y;
        broadcast(room, { type: 'player_moved', playerId: player.id, x: msg.x, y: msg.y }, ws);
        break;
      }

      case 'kill': {
        if (!player || player.role !== 'impostor' || !player.alive) break;
        const room = rooms.get(player.roomCode);
        if (!room || room.phase !== 'game') break;
        const victim = roomPlayers(room).find(p => p.id === (msg.targetId || msg.victimId));
        if (!victim || !victim.alive || victim.role === 'impostor') break;
        victim.alive = false; player.kills = (player.kills || 0) + 1;
        const body = { id: uid(), playerId: victim.id, x: victim.x, y: victim.y, color: victim.color };
        (room.bodies = room.bodies || []).push(body);
        broadcast(room, { type: 'player_killed', victimId: victim.id, killerId: player.id, body });
        checkWin(room);
        break;
      }

      case 'report_body':
      case 'report': {
        if (!player || !player.alive) break;
        const room = rooms.get(player.roomCode);
        if (!room || room.phase !== 'game') break;
        startMeeting(room, player.username + ' reported a body!');
        break;
      }

      case 'emergency_meeting':
      case 'emergency': {
        if (!player || !player.alive) break;
        const room = rooms.get(player.roomCode);
        if (!room || room.phase !== 'game') break;
        startMeeting(room, player.username + ' called an emergency meeting!');
        break;
      }

      case 'complete_task': {
        if (!player || player.role !== 'crewmate' || !player.alive) break;
        const room = rooms.get(player.roomCode);
        if (!room || room.phase !== 'game') break;
        const task = (player.tasks || []).find(t => t.id === msg.taskId && !t.completed);
        if (!task) break;
        task.completed = true;
        const progress = calcProgress(room);
        broadcast(room, { type: 'task_completed', taskId: task.id, playerId: player.id, username: player.username, progress });
        checkWin(room);
        break;
      }

      case 'cast_vote':
      case 'vote': {
        if (!player || !player.alive) break;
        const room = rooms.get(player.roomCode);
        if (!room || room.phase !== 'vote') break;
        if (room.votes && room.votes[player.id] !== undefined) break;
        if (!room.votes) room.votes = {};
        room.votes[player.id] = msg.targetId || 'skip';
        broadcast(room, { type: 'vote_cast', voterId: player.id, voterName: player.username, targetId: msg.targetId || 'skip' });
        const alive = roomPlayers(room).filter(p => p.alive);
        if (alive.every(p => room.votes[p.id] !== undefined)) {
          clearTimeout(room._t2);
          setTimeout(() => resolveVote(room), 600);
        }
        break;
      }

      case 'chat_message':
      case 'chat': {
        if (!player) break;
        const room = rooms.get(player.roomCode);
        if (!room) break;
        const text = (msg.text || '').trim().slice(0, 200);
        if (!text) break;
        broadcast(room, { type: 'chat', username: player.username, color: player.color, text, alive: player.alive, tags: player.tags || [], nameColor: player.nameColor });
        break;
      }

      case 'update_cosmetics': {
        if (!player) break;
        ['hat', 'skin', 'trailColor', 'auraColor', 'nameColor'].forEach(k => { if (msg[k] !== undefined) player[k] = msg[k]; });
        const room = rooms.get(player.roomCode);
        if (room) broadcast(room, { type: 'player_cosmetics_updated', player: pub(player) });
        break;
      }

      case 'update_color': {
        if (!player) break;
        player.color = msg.color;
        const room = rooms.get(player.roomCode);
        if (room) broadcast(room, { type: 'player_cosmetics_updated', player: pub(player) });
        break;
      }

      case 'leave': {
        const p = sockets.get(ws);
        if (p) handleLeave(ws, p);
        break;
      }

      case 'ping': send(ws, { type: 'pong' }); break;

      default:
        if (player) handleOwner(ws, player, msg);
    }
  });

  ws.on('close', () => {
    const p = sockets.get(ws);
    if (p) handleLeave(ws, p);
  });

  ws.on('error', err => console.error('WS err:', err.message));
});

function handleLeave(ws, player) {
  const room = rooms.get(player.roomCode);
  sockets.delete(ws);
  if (!room) return;
  broadcast(room, { type: 'player_left', playerId: player.id, username: player.username });
  if (room.hostId === player.id) {
    const rem = roomPlayers(room);
    room.hostId = rem.length ? rem[0].id : null;
    if (room.hostId) broadcast(room, { type: 'room_update', state: stateFor(room) });
  }
  if (!roomPlayers(room).length) { clearTimers(room); rooms.delete(room.code); }
  else if (room.phase === 'game') checkWin(room);
}

function handleOwner(ws, player, msg) {
  if (msg.password !== OWNER_PW) return;
  const room = rooms.get(player.roomCode);
  if (!room) return;
  const target = msg.targetId ? roomPlayers(room).find(p => p.id === msg.targetId) : null;
  const ack = cmd => send(ws, { type: 'owner_ack', cmd });

  switch (msg.type) {
    case 'owner_kick':
      if (target) { send(target.ws, { type: 'kicked', reason: msg.reason || 'Kicked by owner' }); setTimeout(() => target.ws && target.ws.close(), 400); ack('Kicked ' + target.username); } break;
    case 'owner_kill_player':
      if (target && target.alive) { target.alive = false; const b = { id: uid(), x: target.x, y: target.y, color: target.color }; (room.bodies = room.bodies || []).push(b); broadcast(room, { type: 'player_killed', victimId: target.id, body: b }); checkWin(room); ack('Killed'); } break;
    case 'owner_respawn':
      if (target) { target.alive = true; broadcast(room, { type: 'player_respawned', playerId: target.id, username: target.username }); ack('Respawned'); } break;
    case 'owner_freeze':
      if (target) { target.mods = target.mods || {}; target.mods.frozen = !!msg.frozen; broadcast(room, { type: 'player_mod_update', playerId: target.id, mod: { ...target.mods } }); ack(msg.frozen ? 'Frozen' : 'Unfrozen'); } break;
    case 'owner_godmode':
      if (target) { target.mods = target.mods || {}; target.mods.godmode = !!msg.enabled; broadcast(room, { type: 'player_mod_update', playerId: target.id, mod: { ...target.mods } }); ack('Godmode'); } break;
    case 'owner_set_role':
      if (target) { target.role = msg.role; if (msg.role === 'crewmate' && !target.tasks.length) target.tasks = genTasks(5); send(target.ws, { type: 'role_changed', newRole: msg.role, byOwner: true }); ack('Role set'); } break;
    case 'owner_speed_boost':
      if (target) { target.mods = target.mods || {}; target.mods.speedMult = msg.mult || 1; broadcast(room, { type: 'player_mod_update', playerId: target.id, mod: { ...target.mods } }); ack('Speed set'); } break;
    case 'owner_teleport':
      if (target) { const dest = msg.room ? (TASK_LOCS.find(r => r.name.toLowerCase() === (msg.room || '').toLowerCase()) || TASK_LOCS[0]) : { x: msg.x || 500, y: msg.y || 300 }; target.x = dest.x; target.y = dest.y; broadcast(room, { type: 'player_teleported', playerId: target.id, x: dest.x, y: dest.y }); ack('Teleported'); } break;
    case 'owner_end_game':
      endGame(room, msg.winner || 'crewmate', msg.reason || 'Ended by owner'); break;
    case 'owner_force_meeting':
      startMeeting(room, msg.reason || '⚡ Emergency meeting called!'); ack('Meeting called'); break;
    case 'owner_shuffle_roles': {
      const ps = roomPlayers(room); const ni = Math.max(1, Math.floor(ps.length / 4));
      [...ps].sort(() => Math.random() - 0.5).forEach((p, i) => { p.role = i < ni ? 'impostor' : 'crewmate'; send(p.ws, { type: 'role_changed', newRole: p.role, byOwner: true }); });
      ack('Roles shuffled'); break;
    }
    case 'owner_reveal_roles': {
      const roles = {}; roomPlayers(room).forEach(p => roles[p.id] = p.role);
      broadcast(room, { type: 'owner_roles_reveal', roles }); ack('Revealed'); break;
    }
    case 'owner_broadcast':
      broadcast(room, { type: 'owner_announcement', text: msg.text || '', color: msg.color || '#fbbf24', icon: msg.icon || '📢' }); ack('Broadcast sent'); break;
    case 'owner_grant_tag':
      if (target) {
        target.tags = target.tags || [];
        if (msg.grant) { if (!target.tags.includes(msg.tagId)) target.tags.push(msg.tagId); }
        else target.tags = target.tags.filter(t => t !== msg.tagId);
        broadcast(room, { type: 'player_tags_update', playerId: target.id, tags: target.tags }); ack('Tags updated');
      } break;
    case 'owner_give_credits':
      if (target) { send(target.ws, { type: 'system_message', text: 'Owner gave you ' + msg.amount + ' credits!' }); ack('Credits sent'); } break;
    case 'owner_set_aura':
      if (target) { target.mods = target.mods || {}; target.mods.aura = msg.color; broadcast(room, { type: 'player_mod_update', playerId: target.id, mod: { ...target.mods } }); ack('Aura set'); } break;
    case 'owner_set_title':
      if (target) { target.mods = target.mods || {}; target.mods.title = msg.title; broadcast(room, { type: 'player_mod_update', playerId: target.id, mod: { ...target.mods } }); ack('Title set'); } break;
    case 'owner_all_tasks_done':
      for (const p of roomPlayers(room)) if (p.role === 'crewmate') p.tasks.forEach(t => t.completed = true);
      const tp = calcProgress(room); broadcast(room, { type: 'task_progress_update', progress: tp }); checkWin(room); ack('All tasks done'); break;
    case 'owner_explosion': {
      const cx = target ? target.x : (msg.x || 500), cy = target ? target.y : (msg.y || 300);
      broadcast(room, { type: 'owner_explosion_fx', cx, cy, radius: msg.radius || 200 }); ack('Explosion!'); break;
    }
    case 'owner_swap_roles': {
      const pA = roomPlayers(room).find(p => p.id === msg.targetA);
      const pB = roomPlayers(room).find(p => p.id === msg.targetB);
      if (pA && pB) { const t = pA.role; pA.role = pB.role; pB.role = t; send(pA.ws, { type: 'role_changed', newRole: pA.role, byOwner: true }); send(pB.ws, { type: 'role_changed', newRole: pB.role, byOwner: true }); ack('Roles swapped'); } break;
    }
  }
}

server.listen(PORT, () => console.log('Space Traitors listening on port ' + PORT));
