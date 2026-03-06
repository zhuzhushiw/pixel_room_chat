const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3001;
const MAX_MESSAGE_HISTORY = 40;
const AVATAR_OPTIONS = ['alice', 'grace', 'jack', 'joe', 'lea', 'monica', 'stephen', 'tom'];
const ROOM_BOUNDS = {
  minX: 64,
  maxX: 1088,
  minY: 88,
  maxY: 716,
};
const CLIENT_URL = process.env.CLIENT_URL || '';
const allowedOrigins = CLIENT_URL
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const rooms = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createPlayer({ id, name, color, avatar }) {
  return {
    id,
    name,
    color,
    avatar,
    x: ROOM_BOUNDS.minX + Math.floor(Math.random() * (ROOM_BOUNDS.maxX - ROOM_BOUNDS.minX - 40)),
    y: ROOM_BOUNDS.minY + Math.floor(Math.random() * (ROOM_BOUNDS.maxY - ROOM_BOUNDS.minY - 40)),
    direction: 'down',
    isMoving: false,
  };
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      players: new Map(),
      messages: [],
    });
  }

  return rooms.get(roomId);
}

function serializePlayers(players) {
  return Object.fromEntries(players.entries());
}

function makeMessage({ playerId, name, text }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    playerId,
    name,
    text: text.slice(0, 180),
    createdAt: Date.now(),
  };
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length === 0 ? true : allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  socket.on('join_room', ({ name, roomId, color, avatar }) => {
    const safeName = String(name || '').trim().slice(0, 24) || 'Guest';
    const safeRoomId = String(roomId || '').trim().toLowerCase().slice(0, 24) || 'lobby';
    const safeColor = String(color || '#3a86ff');
    const requestedAvatar = String(avatar || '').toLowerCase();
    const safeAvatar = AVATAR_OPTIONS.includes(requestedAvatar) ? requestedAvatar : 'alice';

    socket.data.roomId = safeRoomId;
    socket.join(safeRoomId);

    const room = getRoom(safeRoomId);
    const player = createPlayer({
      id: socket.id,
      name: safeName,
      color: safeColor,
      avatar: safeAvatar,
    });

    room.players.set(socket.id, player);

    const systemMessage = makeMessage({
      playerId: socket.id,
      name: 'system',
      text: `${safeName} joined ${safeRoomId}`,
    });
    room.messages.push(systemMessage);
    room.messages = room.messages.slice(-MAX_MESSAGE_HISTORY);

    socket.emit('room_state', {
      selfId: socket.id,
      roomId: safeRoomId,
      players: serializePlayers(room.players),
      messages: room.messages,
    });

    io.to(safeRoomId).emit('player_snapshot', serializePlayers(room.players));
    socket.to(safeRoomId).emit('chat_message', systemMessage);
  });

  socket.on('player_move', ({ x, y, direction, isMoving }) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }

    const room = rooms.get(roomId);
    const player = room?.players.get(socket.id);
    if (!player) {
      return;
    }

    player.x = clamp(Number(x) || player.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
    player.y = clamp(Number(y) || player.y, ROOM_BOUNDS.minY, ROOM_BOUNDS.maxY);
    player.direction = ['up', 'down', 'left', 'right'].includes(direction) ? direction : player.direction;
    player.isMoving = Boolean(isMoving);

    io.to(roomId).emit('player_snapshot', serializePlayers(room.players));
  });

  socket.on('chat_send', ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId) {
      return;
    }

    const room = rooms.get(roomId);
    const player = room?.players.get(socket.id);
    const safeText = String(text || '').trim();
    if (!player || !safeText) {
      return;
    }

    const message = makeMessage({
      playerId: player.id,
      name: player.name,
      text: safeText,
    });

    room.messages.push(message);
    room.messages = room.messages.slice(-MAX_MESSAGE_HISTORY);
    io.to(roomId).emit('chat_message', message);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) {
      return;
    }

    const room = rooms.get(roomId);
    const player = room.players.get(socket.id);
    room.players.delete(socket.id);

    if (player) {
      const leaveMessage = makeMessage({
        playerId: socket.id,
        name: 'system',
        text: `${player.name} left ${roomId}`,
      });

      room.messages.push(leaveMessage);
      room.messages = room.messages.slice(-MAX_MESSAGE_HISTORY);
      io.to(roomId).emit('chat_message', leaveMessage);
      io.to(roomId).emit('player_snapshot', serializePlayers(room.players));
    }

    if (room.players.size === 0) {
      rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`pixel-room-chat server listening on http://localhost:${PORT}`);
});
