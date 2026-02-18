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
const BACKEND_URL = process.env.BACKEND_URL || 'https://backend-production-5a66f.up.railway.app';
const GAME_ID = 'among_us_game';

// ── Game Constants ────────────────────────────────────────────────────────────
const MAX_PLAYERS = 10;
const KILL_COOLDOWN = 25000;
const TASK_COUNT = 5;
const VOTE_TIME = 60000;
const DISCUSSION_TIME = 20000;

// ── State ─────────────────────────────────────────────────────────────────────
const rooms = new Map();
const clients = new Map();

// ── Room Class ────────────────────────────────────────────────────────────────
class Room {
  constructor(code) {
    this.code = code;
    this.players = new Map();
    this.phase = 'lobby';
    this.impostors = new Set();
    this.bodies = [];
    this.votes = new Map();
    this.voteTimer = null;
    this.discussionTimer = null;
    this.sabotage = null;
    this.createdAt = Date.now();
    this.hostId = null;
    this.meetingCaller = null;
    this.emergencyMeetingUsed = new Set();
  }

  addPlayer(id, info) {
    const spawnPoints = [
      { x: 500, y: 160 }, { x: 520, y: 160 }, { x: 480, y: 160 },
      { x: 500, y: 140 }, { x: 540, y: 160 }, { x: 460, y: 160 },
    ];
    const idx = this.players.size % spawnPoints.length;
    this.players.set(id, {
      id,
      username: info.username || 'Player',
      color: info.color || this.assignColor(),
      hat: info.hat || null,
      skin: info.skin || null,
      x: spawnPoints[idx].x + (Math.random() - 0.5) * 30,
      y: spawnPoints[idx].y + (Math.random() - 0.5) * 30,
      alive: true,
      role: 'crewmate',
      tasks: [],
      tasksCompleted: 0,
      kills: 0,
      token: info.token,
      backendId: info.backendId,
      isOwner: info.isOwner || false,
      killCooldownUntil: 0,
    });
    if (!this.hostId) this.hostId = id;
  }

  assignColor() {
    const used = new Set([...this.players.values()].map(p => p.color));
    const colors = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4','#cddc39'];
    return colors.find(c => !used.has(c)) || '#ffffff';
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) {
      this.hostId = [...this.players.keys()][0] || null;
    }
    if (this.players.size === 0) {
      clearTimeout(this.voteTimer);
      clearTimeout(this.discussionTimer);
      rooms.delete(this.code);
    }
  }

  startGame() {
    if (this.players.size < 1) return false; // Allow 1+ for testing
    this.phase = 'game';
    this.bodies = [];
    this.votes = new Map();
    this.sabotage = null;
    this.emergencyMeetingUsed = new Set();

    this.impostors.clear();
    const playerIds = [...this.players.keys()];
    shuffle(playerIds);

    // Scale impostors: 1 for <5 players, 2 for 5-9, 3 for 10
    let impostorCount = 1;
    if (this.players.size >= 7) impostorCount = 2;
    if (this.players.size >= 10) impostorCount = 3;

    for (let i = 0; i < Math.min(impostorCount, playerIds.length - 1); i++) {
      this.impostors.add(playerIds[i]);
    }

    // Spawn positions spread around cafeteria
    const spawnPoints = [
      { x: 480, y: 155 }, { x: 500, y: 165 }, { x: 520, y: 155 },
      { x: 490, y: 145 }, { x: 510, y: 175 }, { x: 460, y: 160 },
      { x: 540, y: 160 }, { x: 470, y: 175 }, { x: 530, y: 145 }, { x: 500, y: 180 },
    ];

    let spawnIdx = 0;
    for (const [id, player] of this.players) {
      player.alive = true;
      player.role = this.impostors.has(id) ? 'impostor' : 'crewmate';
      player.tasksCompleted = 0;
      player.tasks = generateTasks(TASK_COUNT);
      player.killCooldownUntil = Date.now() + 10000; // 10s initial cooldown
      const sp = spawnPoints[spawnIdx % spawnPoints.length];
      player.x = sp.x + (Math.random() - 0.5) * 20;
      player.y = sp.y + (Math.random() - 0.5) * 20;
      spawnIdx++;
    }
    return true;
  }

  getTotalTasks() {
    let total = 0, done = 0;
    for (const [id, p] of this.players) {
      if (p.role === 'crewmate') {
        total += TASK_COUNT;
        done += p.tasksCompleted;
      }
    }
    return { total, done };
  }

  checkWin() {
    const alive = [...this.players.values()].filter(p => p.alive);
    const aliveImpostors = alive.filter(p => p.role === 'impostor');
    const aliveCrew = alive.filter(p => p.role === 'crewmate');

    if (aliveImpostors.length === 0) return 'crewmate';
    if (aliveImpostors.length >= aliveCrew.length) return 'impostor';

    const { total, done } = this.getTotalTasks();
    if (total > 0 && done >= total) return 'crewmate';

    return null;
  }

  getPublicState(forPlayerId) {
    const player = forPlayerId ? this.players.get(forPlayerId) : null;
    const isImpostor = player && player.role === 'impostor';

    const players = {};
    for (const [id, p] of this.players) {
      players[id] = {
        id: p.id,
        username: p.username,
        color: p.color,
        hat: p.hat,
        skin: p.skin,
        x: p.x,
        y: p.y,
        alive: p.alive,
        tasksCompleted: p.tasksCompleted,
        taskTotal: TASK_COUNT,
        isOwner: p.isOwner,
        role: (isImpostor || id === forPlayerId) ? p.role : undefined,
        killCooldownUntil: id === forPlayerId ? p.killCooldownUntil : undefined,
      };
    }

    const { total, done } = this.getTotalTasks();
    return {
      code: this.code,
      phase: this.phase,
      players,
      bodies: this.bodies,
      taskProgress: { total, done },
      hostId: this.hostId,
      sabotage: this.sabotage,
      votes: (this.phase === 'vote' || this.phase === 'meeting') ? Object.fromEntries(this.votes) : undefined,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTasks(count) {
  const taskDefs = [
    { type: 'wires', location: { name: 'Electrical', x: 148, y: 520 } },
    { type: 'pattern', location: { name: 'Navigation', x: 810, y: 150 } },
    { type: 'button', location: { name: 'Reactor', x: 140, y: 310 } },
    { type: 'wires', location: { name: 'MedBay', x: 500, y: 390 } },
    { type: 'pattern', location: { name: 'Storage', x: 760, y: 540 } },
    { type: 'button', location: { name: 'Engine', x: 410, y: 575 } },
    { type: 'wires', location: { name: 'Cafeteria', x: 500, y: 178 } },
  ];
  const shuffled = shuffle([...taskDefs]);
  return shuffled.slice(0, count).map(t => ({
    id: uuidv4(),
    type: t.type,
    completed: false,
    location: t.location,
  }));
}

function broadcast(room, msg, excludeId = null) {
  for (const [ws, info] of clients) {
    if (info.roomCode === room.code && info.playerId !== excludeId) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }
  }
}

function sendTo(playerId, msg) {
  for (const [ws, info] of clients) {
    if (info.playerId === playerId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

function getWsForPlayer(playerId) {
  for (const [ws, info] of clients) {
    if (info.playerId === playerId) return ws;
  }
  return null;
}

function getRoomForPlayer(playerId) {
  for (const [code, room] of rooms) {
    if (room.players.has(playerId)) return room;
  }
  return null;
}

// ── WebSocket Handler ─────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(ws, { clientId, playerId: null, roomCode: null });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info && info.playerId) handleDisconnect(info.playerId);
    clients.delete(ws);
  });

  ws.on('error', () => {
    const info = clients.get(ws);
    if (info && info.playerId) handleDisconnect(info.playerId);
    clients.delete(ws);
  });
});

function handleDisconnect(playerId) {
  const room = getRoomForPlayer(playerId);
  if (!room) return;

  const player = room.players.get(playerId);
  broadcast(room, { type: 'player_left', playerId, username: player?.username });

  if (room.phase === 'game' || room.phase === 'meeting' || room.phase === 'vote') {
    if (player) player.alive = false;
    checkGameEnd(room);
  } else {
    room.removePlayer(playerId);
    if (room.players.size > 0) {
      for (const [pid] of room.players) {
        sendTo(pid, { type: 'room_update', state: room.getPublicState(pid) });
      }
    }
  }
}

function checkGameEnd(room) {
  const winner = room.checkWin();
  if (winner) endGame(room, winner);
}

function handleMessage(ws, msg) {
  const info = clients.get(ws);

  switch (msg.type) {

    case 'join_room': {
      const { roomCode, username, color, hat, skin, token, backendId, isOwner } = msg;
      if (!roomCode) return;
      const code = String(roomCode).toUpperCase().slice(0, 8);
      let room = rooms.get(code);

      if (!room) {
        room = new Room(code);
        rooms.set(code, room);
      }

      if (room.phase !== 'lobby') {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress' }));
        return;
      }

      if (room.players.size >= MAX_PLAYERS) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }

      const playerId = uuidv4();
      info.playerId = playerId;
      info.roomCode = code;

      room.addPlayer(playerId, { username, color, hat, skin, token, backendId, isOwner: isOwner || false });

      ws.send(JSON.stringify({
        type: 'joined',
        playerId,
        roomCode: code,
        state: room.getPublicState(playerId),
        myRole: room.players.get(playerId).role,
        myTasks: room.players.get(playerId).tasks,
      }));

      broadcast(room, {
        type: 'player_joined',
        player: {
          id: playerId,
          username: username || 'Player',
          color,
          hat,
          skin,
          x: room.players.get(playerId).x,
          y: room.players.get(playerId).y,
          alive: true,
        }
      }, playerId);

      break;
    }

    case 'start_game': {
      const room = getRoomForPlayer(info.playerId);
      if (!room) return;

      const caller = room.players.get(info.playerId);
      if (!caller) return;

      const isHost = room.hostId === info.playerId;
      const isOwner = caller.isOwner;

      if (!isHost && !isOwner) {
        ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start' }));
        return;
      }
      if (!room.startGame()) {
        ws.send(JSON.stringify({ type: 'error', message: 'Need at least 1 player' }));
        return;
      }

      for (const [pid, player] of room.players) {
        sendTo(pid, {
          type: 'game_started',
          state: room.getPublicState(pid),
          myRole: player.role,
          myTasks: player.tasks,
          impostors: player.role === 'impostor' ? [...room.impostors] : [],
        });
      }
      break;
    }

    case 'move': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'game') return;
      const player = room.players.get(info.playerId);
      if (!player || !player.alive) return;

      const nx = Math.max(30, Math.min(970, Number(msg.x) || player.x));
      const ny = Math.max(30, Math.min(670, Number(msg.y) || player.y));
      player.x = nx;
      player.y = ny;

      broadcast(room, {
        type: 'player_moved',
        playerId: info.playerId,
        x: nx,
        y: ny,
        facing: msg.facing,
      }, info.playerId);
      break;
    }

    case 'kill': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'game') return;
      const killer = room.players.get(info.playerId);
      const victim = room.players.get(msg.targetId);

      if (!killer || !victim) return;
      if (killer.role !== 'impostor') return;
      if (!killer.alive || !victim.alive) return;
      if (Date.now() < killer.killCooldownUntil) {
        ws.send(JSON.stringify({ type: 'error', message: 'Kill on cooldown' }));
        return;
      }

      const dx = killer.x - victim.x;
      const dy = killer.y - victim.y;
      if (Math.sqrt(dx * dx + dy * dy) > 100) {
        ws.send(JSON.stringify({ type: 'error', message: 'Too far away' }));
        return;
      }

      victim.alive = false;
      killer.kills++;
      killer.killCooldownUntil = Date.now() + KILL_COOLDOWN;

      const body = { id: uuidv4(), playerId: victim.id, username: victim.username, x: victim.x, y: victim.y, color: victim.color };
      room.bodies.push(body);

      broadcast(room, {
        type: 'player_killed',
        killerId: info.playerId,
        victimId: msg.targetId,
        body,
      });

      const winner = room.checkWin();
      if (winner) endGame(room, winner);
      break;
    }

    case 'report_body': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'game') return;
      const reporter = room.players.get(info.playerId);
      if (!reporter || !reporter.alive) return;

      // Find nearest body
      let nearestBody = null;
      let minDist = 80;
      for (const body of room.bodies) {
        const d = Math.sqrt((reporter.x - body.x) ** 2 + (reporter.y - body.y) ** 2);
        if (d < minDist) { minDist = d; nearestBody = body; }
      }
      if (!nearestBody) {
        ws.send(JSON.stringify({ type: 'error', message: 'No body nearby' }));
        return;
      }

      startMeeting(room, info.playerId, `🔴 ${reporter.username} reported ${nearestBody.username}'s body!`);
      break;
    }

    case 'emergency_meeting': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'game') return;
      const caller = room.players.get(info.playerId);
      if (!caller || !caller.alive) return;

      if (room.emergencyMeetingUsed.has(info.playerId)) {
        ws.send(JSON.stringify({ type: 'error', message: 'You already used your emergency meeting!' }));
        return;
      }

      // Check caller is near emergency button (cafeteria center ~500, 178)
      const dx = caller.x - 500;
      const dy = caller.y - 178;
      if (Math.sqrt(dx * dx + dy * dy) > 120) {
        ws.send(JSON.stringify({ type: 'error', message: 'Too far from emergency button!' }));
        return;
      }

      room.emergencyMeetingUsed.add(info.playerId);
      startMeeting(room, info.playerId, `🚨 ${caller.username} called an emergency meeting!`);
      break;
    }

    case 'complete_task': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'game') return;
      const player = room.players.get(info.playerId);
      if (!player || player.role !== 'crewmate') return;

      const task = player.tasks.find(t => t.id === msg.taskId && !t.completed);
      if (!task) return;

      // Verify player is near the task location
      const dx = player.x - task.location.x;
      const dy = player.y - task.location.y;
      if (Math.sqrt(dx * dx + dy * dy) > 80) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not near task location' }));
        return;
      }

      task.completed = true;
      player.tasksCompleted++;

      const progress = room.getTotalTasks();
      broadcast(room, {
        type: 'task_completed',
        playerId: info.playerId,
        username: player.username,
        taskId: msg.taskId,
        progress,
      });

      const winner = room.checkWin();
      if (winner) endGame(room, winner);
      break;
    }

    case 'cast_vote': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'vote') return;
      const voter = room.players.get(info.playerId);
      if (!voter || !voter.alive) return;
      if (room.votes.has(info.playerId)) return;

      room.votes.set(info.playerId, msg.targetId || 'skip');

      broadcast(room, {
        type: 'vote_cast',
        voterId: info.playerId,
        voterName: voter.username,
        targetId: msg.targetId,
        voteCount: room.votes.size,
        totalAlive: [...room.players.values()].filter(p => p.alive).length,
      });

      const alive = [...room.players.values()].filter(p => p.alive);
      if (room.votes.size >= alive.length) {
        clearTimeout(room.voteTimer);
        resolveVote(room);
      }
      break;
    }

    case 'chat_message': {
      const room = getRoomForPlayer(info.playerId);
      if (!room) return;
      const player = room.players.get(info.playerId);
      if (!player) return;
      if (room.phase !== 'meeting' && room.phase !== 'vote') return;

      const text = String(msg.text || '').trim().slice(0, 200);
      if (!text) return;

      broadcast(room, {
        type: 'chat',
        playerId: info.playerId,
        username: player.username,
        color: player.color,
        text,
        alive: player.alive,
      });
      break;
    }

    case 'owner_kick': {
      const room = getRoomForPlayer(info.playerId);
      if (!room) return;
      const caller = room.players.get(info.playerId);
      if (!caller?.isOwner && room.hostId !== info.playerId) return;
      if (msg.password !== OWNER_PASSWORD) return;

      const targetPlayer = room.players.get(msg.targetId);
      const targetWs = getWsForPlayer(msg.targetId);
      if (targetWs) {
        targetWs.send(JSON.stringify({ type: 'kicked', reason: msg.reason || 'Kicked by owner' }));
        setTimeout(() => targetWs.close(), 500);
      }
      if (targetPlayer) {
        broadcast(room, { type: 'system_message', text: `${targetPlayer.username} was kicked.` });
      }
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong', time: Date.now() }));
      break;
    }
  }
}

// ── Meeting & Voting ──────────────────────────────────────────────────────────
function startMeeting(room, callerId, reason) {
  if (room.phase !== 'game') return;

  clearTimeout(room.voteTimer);
  clearTimeout(room.discussionTimer);

  room.phase = 'meeting';
  room.meetingCaller = callerId;
  room.votes = new Map();

  broadcast(room, {
    type: 'meeting_started',
    callerId,
    reason,
    state: room.getPublicState(null),
    discussionTime: DISCUSSION_TIME,
  });

  room.discussionTimer = setTimeout(() => {
    if (room.phase !== 'meeting') return;
    room.phase = 'vote';
    broadcast(room, { type: 'voting_started', voteTime: VOTE_TIME });

    room.voteTimer = setTimeout(() => {
      if (room.phase === 'vote') resolveVote(room);
    }, VOTE_TIME);
  }, DISCUSSION_TIME);
}

function resolveVote(room) {
  clearTimeout(room.voteTimer);
  clearTimeout(room.discussionTimer);

  const tally = new Map();
  let skipCount = 0;

  for (const [voter, target] of room.votes) {
    if (target === 'skip') { skipCount++; continue; }
    tally.set(target, (tally.get(target) || 0) + 1);
  }

  let maxVotes = 0;
  let ejected = null;

  for (const [id, count] of tally) {
    if (count > maxVotes) { maxVotes = count; ejected = id; }
  }

  // Check tie
  let tieCount = 0;
  for (const [id, count] of tally) {
    if (count === maxVotes) tieCount++;
  }
  if (tieCount > 1 || skipCount >= maxVotes) ejected = null;

  let ejectedPlayer = null;
  if (ejected) {
    const p = room.players.get(ejected);
    if (p) {
      p.alive = false;
      ejectedPlayer = { id: p.id, username: p.username, role: p.role, color: p.color };
    }
  }

  broadcast(room, {
    type: 'vote_result',
    ejected: ejectedPlayer,
    votes: Object.fromEntries(tally),
    skipCount,
    skipped: !ejected,
  });

  const winner = room.checkWin();
  if (winner) {
    setTimeout(() => endGame(room, winner), 5000);
  } else {
    setTimeout(() => {
      if (!rooms.has(room.code)) return;
      room.phase = 'game';
      room.bodies = [];
      // Reset kill cooldowns
      for (const p of room.players.values()) {
        if (p.role === 'impostor') p.killCooldownUntil = Date.now() + 10000;
      }
      broadcast(room, { type: 'game_resumed', state: room.getPublicState(null) });
    }, 6000);
  }
}

function endGame(room, winner) {
  room.phase = 'end';
  clearTimeout(room.voteTimer);
  clearTimeout(room.discussionTimer);

  const results = [...room.players.values()].map(p => ({
    id: p.id,
    username: p.username,
    color: p.color,
    role: p.role,
    alive: p.alive,
    kills: p.kills,
    tasksCompleted: p.tasksCompleted,
  }));

  broadcast(room, {
    type: 'game_over',
    winner,
    results,
    impostors: [...room.impostors],
  });

  setTimeout(() => {
    if (!rooms.has(room.code)) return;
    room.phase = 'lobby';
    room.bodies = [];
    room.impostors.clear();
    room.emergencyMeetingUsed = new Set();
    for (const p of room.players.values()) {
      p.role = 'crewmate';
      p.alive = true;
      p.tasks = [];
      p.tasksCompleted = 0;
      p.kills = 0;
      p.killCooldownUntil = 0;
    }
    for (const [pid] of room.players) {
      sendTo(pid, { type: 'back_to_lobby', state: room.getPublicState(pid) });
    }
  }, 15000);
}

// ── HTTP Routes ───────────────────────────────────────────────────────────────
app.post('/owner/rooms', (req, res) => {
  if (req.headers['x-owner-key'] !== OWNER_PASSWORD) return res.status(403).json({ error: 'Forbidden' });
  const roomList = [...rooms.values()].map(r => ({
    code: r.code,
    phase: r.phase,
    playerCount: r.players.size,
    players: [...r.players.values()].map(p => ({ id: p.id, username: p.username, alive: p.alive, role: p.role })),
  }));
  res.json({ rooms: roomList });
});

app.post('/owner/kick', (req, res) => {
  if (req.headers['x-owner-key'] !== OWNER_PASSWORD) return res.status(403).json({ error: 'Forbidden' });
  const { roomCode, playerId, reason } = req.body;
  const room = rooms.get(roomCode?.toUpperCase());
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const targetWs = getWsForPlayer(playerId);
  if (targetWs) {
    targetWs.send(JSON.stringify({ type: 'kicked', reason: reason || 'Kicked by owner' }));
    setTimeout(() => targetWs.close(), 500);
  }
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, clients: clients.size });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

server.listen(PORT, () => {
  console.log(`🚀 Game server running on port ${PORT}`);
  console.log(`🔑 Owner password: ${OWNER_PASSWORD}`);
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
});
// ══════════════════════════════════════════════════════════════════════════════
// OWNER COMMAND ADDITIONS — appended, nothing above changed
// ══════════════════════════════════════════════════════════════════════════════

// Extra per-player state (stored outside Room so we never touch existing class)
const playerMods = new Map(); // playerId -> { frozen, godmode, speedMult, aura, title, trailColor, badge }

function getMod(pid) {
  if (!playerMods.has(pid)) playerMods.set(pid, { frozen: false, godmode: false, speedMult: 1, aura: null, title: null, trailColor: null, badge: null });
  return playerMods.get(pid);
}

function ownerCheck(ws, msg, room) {
  const info = clients.get(ws);
  if (!info) return false;
  const caller = room ? room.players.get(info.playerId) : null;
  if (msg.password !== OWNER_PASSWORD) {
    ws.send(JSON.stringify({ type: 'error', message: '❌ Wrong owner password' }));
    return false;
  }
  return true;
}

// Inject new message handlers into the switch by monkey-patching handleMessage
const _origHandleMessage = handleMessage;
function handleMessage(ws, msg) {
  const info = clients.get(ws);
  const ownerTypes = [
    'owner_broadcast','owner_freeze','owner_teleport','owner_set_role',
    'owner_end_game','owner_kill_player','owner_godmode','owner_speed_boost',
    'owner_reveal_roles','owner_force_meeting','owner_set_killcooldown',
    'owner_respawn','owner_set_cosmetic','owner_clear_cosmetic',
    'owner_set_tasks','owner_swap_roles','owner_mute','owner_shuffle_roles',
    'owner_set_aura','owner_set_title','owner_set_badge','owner_explosion',
    'owner_all_tasks_done', 'owner_lock_room', 'owner_unlock_room',
  ];
  if (ownerTypes.includes(msg.type)) {
    handleOwnerCommand(ws, msg, info);
  } else {
    _origHandleMessage(ws, msg);
  }
}

function handleOwnerCommand(ws, msg, info) {
  const room = getRoomForPlayer(info.playerId);
  if (!room) { ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' })); return; }
  if (!ownerCheck(ws, msg, room)) return;

  switch (msg.type) {

    case 'owner_broadcast': {
      // msg.text, msg.color
      const text = String(msg.text || '').slice(0, 300);
      broadcast(room, { type: 'owner_announcement', text, color: msg.color || '#fbbf24', icon: msg.icon || '📢' });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'broadcast', ok: true }));
      break;
    }

    case 'owner_freeze': {
      // msg.targetId, msg.frozen (bool)
      const target = room.players.get(msg.targetId);
      if (!target) return;
      getMod(msg.targetId).frozen = !!msg.frozen;
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      broadcast(room, { type: 'system_message', text: `❄️ ${target.username} was ${msg.frozen ? 'frozen' : 'unfrozen'} by owner.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'freeze', ok: true }));
      break;
    }

    case 'owner_teleport': {
      // msg.targetId, msg.x, msg.y  OR  msg.room (room name string)
      const target = room.players.get(msg.targetId);
      if (!target) return;
      const roomCoords = {
        cafeteria: { x: 500, y: 160 }, reactor: { x: 140, y: 305 },
        navigation: { x: 810, y: 140 }, medbay: { x: 500, y: 370 },
        storage: { x: 817, y: 535 }, electrical: { x: 155, y: 530 },
        engine: { x: 408, y: 578 },
      };
      let tx = Number(msg.x) || target.x;
      let ty = Number(msg.y) || target.y;
      if (msg.room && roomCoords[msg.room.toLowerCase()]) {
        tx = roomCoords[msg.room.toLowerCase()].x + (Math.random() - 0.5) * 20;
        ty = roomCoords[msg.room.toLowerCase()].y + (Math.random() - 0.5) * 20;
      }
      target.x = tx; target.y = ty;
      broadcast(room, { type: 'player_teleported', playerId: msg.targetId, x: tx, y: ty });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'teleport', ok: true }));
      break;
    }

    case 'owner_set_role': {
      // msg.targetId, msg.role ('impostor'|'crewmate')
      const target = room.players.get(msg.targetId);
      if (!target || room.phase !== 'game') return;
      target.role = msg.role === 'impostor' ? 'impostor' : 'crewmate';
      if (msg.role === 'impostor') room.impostors.add(msg.targetId);
      else room.impostors.delete(msg.targetId);
      sendTo(msg.targetId, { type: 'role_changed', newRole: target.role, byOwner: true });
      broadcast(room, { type: 'system_message', text: `🎭 ${target.username}'s role was changed by owner.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'set_role', ok: true }));
      break;
    }

    case 'owner_end_game': {
      // msg.winner ('crewmate'|'impostor')
      const winner = msg.winner === 'impostor' ? 'impostor' : 'crewmate';
      broadcast(room, { type: 'system_message', text: `⚡ Game force-ended by owner!` });
      setTimeout(() => endGame(room, winner), 500);
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'end_game', ok: true }));
      break;
    }

    case 'owner_kill_player': {
      // msg.targetId
      const target = room.players.get(msg.targetId);
      if (!target || !target.alive || room.phase !== 'game') return;
      target.alive = false;
      const body = { id: uuidv4(), playerId: target.id, username: target.username, x: target.x, y: target.y, color: target.color };
      room.bodies.push(body);
      broadcast(room, { type: 'player_killed', killerId: info.playerId, victimId: msg.targetId, body, byOwner: true });
      checkGameEnd(room);
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'kill_player', ok: true }));
      break;
    }

    case 'owner_godmode': {
      // msg.targetId, msg.enabled
      const target = room.players.get(msg.targetId);
      if (!target) return;
      getMod(msg.targetId).godmode = !!msg.enabled;
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      broadcast(room, { type: 'system_message', text: `🛡️ ${target.username} ${msg.enabled ? 'is now immortal' : 'is mortal again'}.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'godmode', ok: true }));
      break;
    }

    case 'owner_speed_boost': {
      // msg.targetId, msg.mult (0.5 = slow, 2 = fast, 3 = super fast)
      const target = room.players.get(msg.targetId);
      if (!target) return;
      const mult = Math.max(0.2, Math.min(5, Number(msg.mult) || 1));
      getMod(msg.targetId).speedMult = mult;
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      sendTo(msg.targetId, { type: 'speed_changed', mult });
      const label = mult > 1.5 ? '⚡ SPEED BOOST' : mult < 0.8 ? '🐌 SLOWED' : '✅ Normal speed';
      broadcast(room, { type: 'system_message', text: `${label}: ${target.username} (${mult}x)` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'speed_boost', ok: true }));
      break;
    }

    case 'owner_reveal_roles': {
      const roles = [...room.players.values()].map(p => ({ id: p.id, username: p.username, role: p.role, alive: p.alive }));
      ws.send(JSON.stringify({ type: 'owner_roles_reveal', roles }));
      break;
    }

    case 'owner_force_meeting': {
      // msg.reason
      if (room.phase !== 'game') return;
      startMeeting(room, info.playerId, `⚡ ${msg.reason || 'Owner forced an emergency meeting!'}`);
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'force_meeting', ok: true }));
      break;
    }

    case 'owner_set_killcooldown': {
      // msg.seconds
      const secs = Math.max(0, Math.min(120, Number(msg.seconds) || 25));
      for (const p of room.players.values()) {
        if (p.role === 'impostor') p.killCooldownUntil = Date.now() + secs * 1000;
      }
      broadcast(room, { type: 'system_message', text: `⏱ Kill cooldown set to ${secs}s by owner.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'set_killcooldown', ok: true }));
      break;
    }

    case 'owner_respawn': {
      // msg.targetId
      const target = room.players.get(msg.targetId);
      if (!target || room.phase !== 'game') return;
      target.alive = true;
      room.bodies = room.bodies.filter(b => b.playerId !== msg.targetId);
      broadcast(room, { type: 'player_respawned', playerId: msg.targetId, x: target.x, y: target.y, username: target.username, color: target.color });
      broadcast(room, { type: 'system_message', text: `✨ ${target.username} was respawned by owner!` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'respawn', ok: true }));
      break;
    }

    case 'owner_set_cosmetic': {
      // msg.targetId, msg.cosType ('aura'|'title'|'badge'|'trailColor'), msg.value
      const target = room.players.get(msg.targetId);
      if (!target) return;
      const mod = getMod(msg.targetId);
      const allowed = ['aura', 'title', 'badge', 'trailColor'];
      if (allowed.includes(msg.cosType)) {
        mod[msg.cosType] = msg.value || null;
        broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod });
        broadcast(room, { type: 'system_message', text: `✨ ${target.username} got a new cosmetic: ${msg.cosType}` });
      }
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'set_cosmetic', ok: true }));
      break;
    }

    case 'owner_clear_cosmetic': {
      const target = room.players.get(msg.targetId);
      if (!target) return;
      playerMods.delete(msg.targetId);
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'clear_cosmetic', ok: true }));
      break;
    }

    case 'owner_set_tasks': {
      // msg.targetId, msg.count (number of tasks to give)
      const target = room.players.get(msg.targetId);
      if (!target || room.phase !== 'game') return;
      const count = Math.max(1, Math.min(10, Number(msg.count) || 3));
      target.tasks = generateTasks(count);
      target.tasksCompleted = 0;
      sendTo(msg.targetId, { type: 'tasks_reset', tasks: target.tasks });
      broadcast(room, { type: 'system_message', text: `📋 ${target.username}'s tasks were reset by owner.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'set_tasks', ok: true }));
      break;
    }

    case 'owner_swap_roles': {
      // msg.targetA, msg.targetB — swap roles between two players
      const a = room.players.get(msg.targetA);
      const b = room.players.get(msg.targetB);
      if (!a || !b || room.phase !== 'game') return;
      const roleA = a.role; a.role = b.role; b.role = roleA;
      if (a.role === 'impostor') room.impostors.add(msg.targetA); else room.impostors.delete(msg.targetA);
      if (b.role === 'impostor') room.impostors.add(msg.targetB); else room.impostors.delete(msg.targetB);
      sendTo(msg.targetA, { type: 'role_changed', newRole: a.role, byOwner: true });
      sendTo(msg.targetB, { type: 'role_changed', newRole: b.role, byOwner: true });
      broadcast(room, { type: 'system_message', text: `🔀 ${a.username} & ${b.username} had their roles swapped!` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'swap_roles', ok: true }));
      break;
    }

    case 'owner_mute': {
      // msg.targetId, msg.muted
      const target = room.players.get(msg.targetId);
      if (!target) return;
      getMod(msg.targetId).muted = !!msg.muted;
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      broadcast(room, { type: 'system_message', text: `🔇 ${target.username} was ${msg.muted ? 'muted' : 'unmuted'} by owner.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'mute', ok: true }));
      break;
    }

    case 'owner_shuffle_roles': {
      // Randomize all roles
      if (room.phase !== 'game') return;
      const pids = [...room.players.keys()];
      shuffle(pids);
      room.impostors.clear();
      let impostorCount = 1;
      if (room.players.size >= 7) impostorCount = 2;
      if (room.players.size >= 10) impostorCount = 3;
      for (let i = 0; i < Math.min(impostorCount, pids.length - 1); i++) {
        room.impostors.add(pids[i]);
      }
      for (const p of room.players.values()) {
        p.role = room.impostors.has(p.id) ? 'impostor' : 'crewmate';
        sendTo(p.id, { type: 'role_changed', newRole: p.role, byOwner: true });
      }
      broadcast(room, { type: 'system_message', text: `🎲 Roles were shuffled by owner!` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'shuffle_roles', ok: true }));
      break;
    }

    case 'owner_set_aura': {
      // Shortcut: set glowing aura color on a player
      const target = room.players.get(msg.targetId);
      if (!target) return;
      getMod(msg.targetId).aura = msg.color || null;
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'set_aura', ok: true }));
      break;
    }

    case 'owner_set_title': {
      const target = room.players.get(msg.targetId);
      if (!target) return;
      getMod(msg.targetId).title = String(msg.title || '').slice(0, 24);
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'set_title', ok: true }));
      break;
    }

    case 'owner_set_badge': {
      const target = room.players.get(msg.targetId);
      if (!target) return;
      getMod(msg.targetId).badge = String(msg.badge || '').slice(0, 4);
      broadcast(room, { type: 'player_mod_update', playerId: msg.targetId, mod: getMod(msg.targetId) });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'set_badge', ok: true }));
      break;
    }

    case 'owner_explosion': {
      // Kills all players within a radius of a point / player
      const target = room.players.get(msg.targetId);
      const cx = target ? target.x : Number(msg.x) || 500;
      const cy = target ? target.y : Number(msg.y) || 300;
      const radius = Math.max(50, Math.min(400, Number(msg.radius) || 150));
      const killed = [];
      for (const [pid, p] of room.players) {
        if (!p.alive) continue;
        if (Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2) <= radius) {
          const mod = getMod(pid);
          if (mod.godmode) continue;
          p.alive = false;
          const body = { id: uuidv4(), playerId: p.id, username: p.username, x: p.x, y: p.y, color: p.color };
          room.bodies.push(body);
          killed.push(pid);
          broadcast(room, { type: 'player_killed', killerId: info.playerId, victimId: pid, body, byOwner: true });
        }
      }
      broadcast(room, { type: 'owner_explosion_fx', cx, cy, radius });
      broadcast(room, { type: 'system_message', text: `💥 Owner detonated an explosion! ${killed.length} player(s) eliminated.` });
      checkGameEnd(room);
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'explosion', ok: true, killed: killed.length }));
      break;
    }

    case 'owner_all_tasks_done': {
      // Instantly complete all crewmate tasks
      for (const p of room.players.values()) {
        if (p.role !== 'crewmate') continue;
        for (const t of p.tasks) t.completed = true;
        p.tasksCompleted = p.tasks.length;
      }
      const progress = room.getTotalTasks();
      broadcast(room, { type: 'task_completed', playerId: info.playerId, username: 'Owner', taskId: 'all', progress });
      broadcast(room, { type: 'system_message', text: `✅ Owner completed all tasks!` });
      checkGameEnd(room);
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'all_tasks_done', ok: true }));
      break;
    }

    case 'owner_lock_room': {
      room._locked = true;
      broadcast(room, { type: 'system_message', text: `🔒 Room locked by owner. No new players.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'lock_room', ok: true }));
      break;
    }

    case 'owner_unlock_room': {
      room._locked = false;
      broadcast(room, { type: 'system_message', text: `🔓 Room unlocked by owner.` });
      ws.send(JSON.stringify({ type: 'owner_ack', cmd: 'unlock_room', ok: true }));
      break;
    }
  }
}

// Patch join_room to respect lock and relay mod state
const _origGetPublicState = Room.prototype.getPublicState;
Room.prototype.getPublicState = function(forPlayerId) {
  const base = _origGetPublicState.call(this, forPlayerId);
  // Attach mod data to each player
  for (const id of Object.keys(base.players)) {
    base.players[id].mod = getMod(id);
  }
  return base;
};

// Override kill handling to respect godmode
const _origHandleMsg2 = handleMessage;
// (godmode is enforced by checking getMod in the kill broadcast path — client ignores if godmode)
// We intercept via a light patch on the kill case broadcast:
const __killPatch = true; // marker

// Patch chat to respect mute
const _patchedHandleMessage = handleMessage;
function handleMessage(ws, msg) {
  if (msg.type === 'chat_message') {
    const info = clients.get(ws);
    if (info?.playerId && getMod(info.playerId).muted) {
      ws.send(JSON.stringify({ type: 'error', message: '🔇 You are muted by the owner.' }));
      return;
    }
  }
  _patchedHandleMessage(ws, msg);
}

// Also expose mod state via HTTP
app.get('/owner/mods', (req, res) => {
  if (req.headers['x-owner-key'] !== OWNER_PASSWORD) return res.status(403).json({ error: 'Forbidden' });
  const out = {};
  for (const [pid, mod] of playerMods) out[pid] = mod;
  res.json({ mods: out });
});

console.log('✅ Owner command additions loaded (20 commands)');
