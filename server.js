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
const BACKEND_URL = process.env.BACKEND_URL || 'https://my-game-backend.up.railway.app';
const GAME_ID = 'among_us_game';

// ── Game Constants ────────────────────────────────────────────────────────────
const MAX_PLAYERS = 6;
const KILL_COOLDOWN = 25000;
const TASK_COUNT = 5;
const VOTE_TIME = 60000;
const DISCUSSION_TIME = 15000;

// ── State ─────────────────────────────────────────────────────────────────────
const rooms = new Map();   // roomCode -> Room
const clients = new Map(); // ws -> clientInfo

// ── Room Class ────────────────────────────────────────────────────────────────
class Room {
  constructor(code) {
    this.code = code;
    this.players = new Map(); // playerId -> PlayerState
    this.phase = 'lobby';     // lobby | game | meeting | vote | end
    this.impostors = new Set();
    this.bodies = [];
    this.votes = new Map();
    this.voteTimer = null;
    this.sabotage = null;
    this.createdAt = Date.now();
    this.hostId = null;
    this.meetingCaller = null;
  }

  addPlayer(id, info) {
    this.players.set(id, {
      id,
      username: info.username,
      color: info.color || this.assignColor(),
      hat: info.hat || null,
      skin: info.skin || null,
      x: 400 + Math.random() * 200,
      y: 300 + Math.random() * 100,
      alive: true,
      role: 'crewmate',
      tasks: [],
      tasksCompleted: 0,
      kills: 0,
      token: info.token,
      backendId: info.backendId,
      isOwner: info.isOwner || false,
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
      rooms.delete(this.code);
    }
  }

  startGame() {
    if (this.players.size < 2) return false;
    this.phase = 'game';
    this.bodies = [];
    this.votes = new Map();
    this.sabotage = null;

    // Assign impostors
    this.impostors.clear();
    const playerIds = [...this.players.keys()];
    shuffle(playerIds);
    const impostorCount = this.players.size >= 5 ? 2 : 1;
    for (let i = 0; i < impostorCount; i++) {
      this.impostors.add(playerIds[i]);
    }

    // Assign roles and tasks
    for (const [id, player] of this.players) {
      player.alive = true;
      player.role = this.impostors.has(id) ? 'impostor' : 'crewmate';
      player.tasksCompleted = 0;
      player.tasks = generateTasks(TASK_COUNT);
      // Spawn positions
      player.x = 300 + Math.random() * 400;
      player.y = 250 + Math.random() * 300;
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
    const player = this.players.get(forPlayerId);
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
        // Only reveal impostor identities to other impostors
        role: (isImpostor || id === forPlayerId) ? p.role : undefined,
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
      votes: this.phase === 'vote' ? Object.fromEntries(this.votes) : undefined,
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
  const types = ['wires', 'button', 'pattern', 'download', 'reactor'];
  const tasks = [];
  for (let i = 0; i < count; i++) {
    tasks.push({
      id: uuidv4(),
      type: types[i % types.length],
      completed: false,
      location: getTaskLocation(i),
    });
  }
  return tasks;
}

function getTaskLocation(index) {
  const locations = [
    { name: 'Electrical', x: 180, y: 520 },
    { name: 'Navigation', x: 800, y: 150 },
    { name: 'MedBay', x: 500, y: 400 },
    { name: 'Storage', x: 750, y: 550 },
    { name: 'Reactor', x: 120, y: 300 },
    { name: 'Cafeteria', x: 430, y: 180 },
  ];
  return locations[index % locations.length];
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
    if (info && info.playerId) {
      handleDisconnect(info.playerId);
    }
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
    // Mark as dead instead of removing during game
    if (player) player.alive = false;
    checkGameEnd(room);
  } else {
    room.removePlayer(playerId);
    if (room.players.size > 0) {
      broadcast(room, { type: 'room_update', state: room.getPublicState(null) });
    }
  }
}

function handleMessage(ws, msg) {
  const info = clients.get(ws);

  switch (msg.type) {

    case 'join_room': {
      const { roomCode, username, color, hat, skin, token, backendId, isOwner } = msg;
      const code = roomCode.toUpperCase();
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
          username,
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
      if (room.hostId !== info.playerId && !room.players.get(info.playerId)?.isOwner) {
        ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start' }));
        return;
      }
      if (!room.startGame()) {
        ws.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players' }));
        return;
      }

      // Send personalized start to each player
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

      player.x = Math.max(50, Math.min(950, msg.x));
      player.y = Math.max(50, Math.min(650, msg.y));

      broadcast(room, {
        type: 'player_moved',
        playerId: info.playerId,
        x: player.x,
        y: player.y,
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

      // Check distance
      const dx = killer.x - victim.x;
      const dy = killer.y - victim.y;
      if (Math.sqrt(dx * dx + dy * dy) > 80) {
        ws.send(JSON.stringify({ type: 'error', message: 'Too far away' }));
        return;
      }

      victim.alive = false;
      killer.kills++;
      room.bodies.push({ id: uuidv4(), playerId: victim.id, x: victim.x, y: victim.y, color: victim.color });

      broadcast(room, {
        type: 'player_killed',
        killerId: info.playerId,
        victimId: msg.targetId,
        body: room.bodies[room.bodies.length - 1],
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

      startMeeting(room, info.playerId, `${reporter.username} reported a body!`);
      break;
    }

    case 'emergency_meeting': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'game') return;
      const caller = room.players.get(info.playerId);
      if (!caller || !caller.alive) return;

      startMeeting(room, info.playerId, `${caller.username} called an emergency meeting!`);
      break;
    }

    case 'complete_task': {
      const room = getRoomForPlayer(info.playerId);
      if (!room || room.phase !== 'game') return;
      const player = room.players.get(info.playerId);
      if (!player || !player.alive || player.role !== 'crewmate') return;

      const task = player.tasks.find(t => t.id === msg.taskId && !t.completed);
      if (!task) return;

      task.completed = true;
      player.tasksCompleted++;

      const progress = room.getTotalTasks();
      broadcast(room, {
        type: 'task_completed',
        playerId: info.playerId,
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
      if (room.votes.has(info.playerId)) return; // already voted

      room.votes.set(info.playerId, msg.targetId || 'skip');

      broadcast(room, {
        type: 'vote_cast',
        voterId: info.playerId,
        hasVoted: true,
      });

      // Check if all alive players voted
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
      // Only allow chat during meeting/vote
      if (room.phase !== 'meeting' && room.phase !== 'vote') return;

      const text = String(msg.text || '').slice(0, 200);
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
      if (!caller?.isOwner && caller?.id !== room.hostId) return;
      if (msg.password !== OWNER_PASSWORD) return;

      const targetWs = getWsForPlayer(msg.targetId);
      if (targetWs) {
        targetWs.send(JSON.stringify({ type: 'kicked', reason: msg.reason || 'Kicked by owner' }));
        targetWs.close();
      }
      broadcast(room, { type: 'system_message', text: `${room.players.get(msg.targetId)?.username} was kicked.` });
      break;
    }

    case 'owner_force_start': {
      const room = getRoomForPlayer(info.playerId);
      if (!room) return;
      const caller = room.players.get(info.playerId);
      if (!caller?.isOwner) return;
      if (msg.password !== OWNER_PASSWORD) return;
      if (!room.startGame()) return;

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

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    }
  }
}

// ── Meeting & Voting ──────────────────────────────────────────────────────────
function startMeeting(room, callerId, reason) {
  room.phase = 'meeting';
  room.meetingCaller = callerId;
  room.votes = new Map();

  broadcast(room, {
    type: 'meeting_started',
    callerId,
    reason,
    state: room.getPublicState(null),
  });

  // Discussion phase then voting
  setTimeout(() => {
    if (room.phase !== 'meeting') return;
    room.phase = 'vote';
    broadcast(room, { type: 'voting_started' });

    room.voteTimer = setTimeout(() => {
      if (room.phase === 'vote') resolveVote(room);
    }, VOTE_TIME);
  }, DISCUSSION_TIME);
}

function resolveVote(room) {
  clearTimeout(room.voteTimer);
  const tally = new Map();
  let maxVotes = 0;
  let ejected = null;

  for (const [voter, target] of room.votes) {
    if (target === 'skip') continue;
    tally.set(target, (tally.get(target) || 0) + 1);
    if (tally.get(target) > maxVotes) {
      maxVotes = tally.get(target);
      ejected = target;
    }
  }

  // Check for tie
  let tieCount = 0;
  for (const [id, count] of tally) {
    if (count === maxVotes) tieCount++;
  }
  if (tieCount > 1) ejected = null;

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
    skipped: !ejected,
  });

  const winner = room.checkWin();
  if (winner) {
    setTimeout(() => endGame(room, winner), 4000);
  } else {
    setTimeout(() => {
      room.phase = 'game';
      room.bodies = [];
      broadcast(room, { type: 'game_resumed', state: room.getPublicState(null) });
    }, 5000);
  }
}

function endGame(room, winner) {
  room.phase = 'end';
  clearTimeout(room.voteTimer);

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

  // Reset to lobby after 15s
  setTimeout(() => {
    if (rooms.has(room.code)) {
      room.phase = 'lobby';
      room.bodies = [];
      room.impostors.clear();
      for (const p of room.players.values()) {
        p.role = 'crewmate';
        p.alive = true;
        p.tasks = [];
        p.tasksCompleted = 0;
      }
      broadcast(room, { type: 'back_to_lobby', state: room.getPublicState(null) });
    }
  }, 15000);
}

// ── HTTP Owner API ────────────────────────────────────────────────────────────
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
    targetWs.close();
  }
  res.json({ success: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

server.listen(PORT, () => {
  console.log(`🚀 Game server running on port ${PORT}`);
  console.log(`🔑 Owner password: ${OWNER_PASSWORD}`);
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
});
