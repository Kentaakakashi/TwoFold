const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── Game constants ──────────────────────────────────────────────
const MAP_COLS = 24;
const MAP_ROWS = 18;
const TILE_SIZE = 32;
const PROXIMITY_RADIUS = 4;

// Tile types:
//  0 = carpet floor (walkable)
//  1 = wall (solid)
//  2 = desk (solid)
//  3 = chair (walkable)
//  4 = meeting table (solid)
//  5 = plant pot (solid)
//  6 = kitchen counter (solid)
//  7 = couch (solid)
//  8 = whiteboard (solid)
//  9 = door / entrance (walkable)
// 10 = wood floor (walkable)
// 11 = tile floor - kitchen (walkable)
// 12 = bookshelf (solid)
// 13 = coffee table (solid)
// 14 = printer (solid)
// 15 = water cooler (solid)
// 16 = rug (walkable)
// 17 = window wall (solid)
// 18 = glass wall (solid)

const MAP = generateOfficeMap();

function generateOfficeMap() {
  const m = [];
  for (let y = 0; y < MAP_ROWS; y++) m.push(new Array(MAP_COLS).fill(0));

  // ── Outer walls ──
  for (let x = 0; x < MAP_COLS; x++) { m[0][x] = 1; m[MAP_ROWS - 1][x] = 1; }
  for (let y = 0; y < MAP_ROWS; y++) { m[y][0] = 1; m[y][MAP_COLS - 1] = 1; }

  // Windows on outer walls
  for (let x = 3; x < MAP_COLS - 3; x += 4) { m[0][x] = 17; m[MAP_ROWS - 1][x] = 17; }
  for (let y = 3; y < MAP_ROWS - 3; y += 4) { m[y][0] = 17; m[y][MAP_COLS - 1] = 17; }

  // ══════════════════════════════════════════════════════════════
  // LOBBY (top-left, y:1-4, x:1-7)
  // ══════════════════════════════════════════════════════════════
  for (let y = 1; y <= 4; y++)
    for (let x = 1; x <= 7; x++) m[y][x] = 10;

  // Reception desk
  m[2][2] = 2; m[2][3] = 2; m[2][4] = 2;
  m[1][3] = 3; // chair behind

  // Waiting area
  m[1][6] = 7; m[1][7] = 7; // couch
  m[3][6] = 13; // coffee table

  m[1][1] = 5; // plant
  m[4][7] = 5; // plant

  // Lobby wall
  for (let x = 1; x <= 7; x++) m[5][x] = 1;
  m[5][4] = 9; // door to main area

  // ══════════════════════════════════════════════════════════════
  // OPEN OFFICE (y:6-12, x:1-14)
  // ══════════════════════════════════════════════════════════════

  // Rug walkway
  for (let y = 6; y <= 12; y++) m[y][8] = 16;

  // Desk cluster 1 (y:7, x:2-4)
  m[7][2] = 2; m[7][3] = 2; m[7][4] = 2;
  m[6][2] = 3; m[6][3] = 3; m[6][4] = 3;
  m[8][2] = 3; m[8][3] = 3; m[8][4] = 3;

  // Desk cluster 2 (y:7, x:10-12)
  m[7][10] = 2; m[7][11] = 2; m[7][12] = 2;
  m[6][10] = 3; m[6][11] = 3; m[6][12] = 3;
  m[8][10] = 3; m[8][11] = 3; m[8][12] = 3;

  // Desk cluster 3 (y:11, x:2-4)
  m[11][2] = 2; m[11][3] = 2; m[11][4] = 2;
  m[10][2] = 3; m[10][3] = 3; m[10][4] = 3;
  m[12][2] = 3; m[12][3] = 3; m[12][4] = 3;

  // Desk cluster 4 (y:11, x:10-12)
  m[11][10] = 2; m[11][11] = 2; m[11][12] = 2;
  m[10][10] = 3; m[10][11] = 3; m[10][12] = 3;
  m[12][10] = 3; m[12][11] = 3; m[12][12] = 3;

  // Printer & water cooler
  m[9][6] = 14;
  m[9][1] = 15;

  // Plants
  m[6][1] = 5; m[6][14] = 5;
  m[9][14] = 5;

  // ══════════════════════════════════════════════════════════════
  // DIVIDER WALL (x:15)
  // ══════════════════════════════════════════════════════════════
  for (let y = 1; y <= MAP_ROWS - 2; y++) m[y][15] = 1;
  m[3][15] = 9;  // door top
  m[8][15] = 9;  // door mid
  m[13][15] = 9; // door bottom

  // ══════════════════════════════════════════════════════════════
  // MEETING ROOM A (top-right, y:1-6, x:16-22)
  // ══════════════════════════════════════════════════════════════
  for (let x = 16; x <= 22; x++) m[7][x] = 1;
  m[7][19] = 9; // door

  // Table
  m[3][18] = 4; m[3][19] = 4; m[3][20] = 4;
  m[4][18] = 4; m[4][19] = 4; m[4][20] = 4;
  // Chairs
  m[2][18] = 3; m[2][19] = 3; m[2][20] = 3;
  m[5][18] = 3; m[5][19] = 3; m[5][20] = 3;

  // Whiteboard
  m[1][18] = 8; m[1][19] = 8;

  // Plants
  m[1][16] = 5; m[1][22] = 5;

  // ══════════════════════════════════════════════════════════════
  // MEETING ROOM B (mid-right, y:8-11, x:16-22)
  // ══════════════════════════════════════════════════════════════
  for (let x = 16; x <= 22; x++) m[12][x] = 1;
  m[12][19] = 9; // door

  // Glass divider
  for (let y = 8; y <= 11; y++) m[y][19] = 18;
  m[9][19] = 9; // door

  // Left: small meeting
  m[9][17] = 4; m[10][17] = 4;
  m[9][16] = 3; m[10][16] = 3;
  m[9][18] = 3; m[10][18] = 3;
  m[8][17] = 8; // whiteboard

  // Right: lounge
  m[9][21] = 7; m[9][22] = 7;
  m[10][21] = 13;
  m[8][22] = 5;
  m[11][20] = 12;

  // ══════════════════════════════════════════════════════════════
  // KITCHEN (bottom, y:14-16, x:1-14)
  // ══════════════════════════════════════════════════════════════
  for (let x = 1; x <= 14; x++) m[13][x] = 1;
  m[13][4] = 9; m[13][10] = 9; // doors

  for (let y = 14; y <= 16; y++)
    for (let x = 1; x <= 14; x++)
      if (m[y][x] === 0) m[y][x] = 11;

  m[14][1] = 6; m[14][2] = 6; m[14][3] = 6; m[14][4] = 6;
  m[14][6] = 15;

  // Break table
  m[15][8] = 4; m[15][9] = 4; m[16][8] = 4; m[16][9] = 4;
  m[15][7] = 3; m[16][7] = 3;
  m[15][10] = 3; m[16][10] = 3;
  m[14][8] = 3; m[14][9] = 3;

  m[15][12] = 4; m[15][13] = 4;
  m[14][12] = 3; m[14][13] = 3;
  m[16][12] = 3; m[16][13] = 3;

  m[16][1] = 5; m[16][14] = 5;

  // ══════════════════════════════════════════════════════════════
  // BOTTOM-RIGHT LOUNGE (y:13-16, x:16-22)
  // ══════════════════════════════════════════════════════════════
  m[14][16] = 7; m[14][17] = 7; m[14][18] = 7;
  m[15][17] = 13;
  m[16][16] = 7; m[16][17] = 7;

  m[14][21] = 12; m[14][22] = 12;
  m[16][22] = 5;

  return m;
}

function isWalkable(tile) {
  return tile === 0 || tile === 3 || tile === 9 || tile === 10 || tile === 11 || tile === 16;
}

// ── Player state ────────────────────────────────────────────────
const players = new Map();

// ── Furniture state ─────────────────────────────────────────────
// placedFurniture: Map<furnitureId, { id, type, x, y, placedBy }>
const placedFurniture = new Map();
let nextFurnitureId = 1;

// Solid furniture types that block movement
const SOLID_FURNITURE = new Set([2, 4, 5, 6, 7, 8, 12, 13, 14, 15]);

function isTileBlockedByFurniture(x, y) {
  for (const [, f] of placedFurniture) {
    if (f.x === x && f.y === y && SOLID_FURNITURE.has(f.type)) return true;
  }
  return false;
}

function getFurnitureState() {
  return Object.fromEntries(placedFurniture);
}

// ── Conversation state ──────────────────────────────────────────
// conversations: Map<convId, { id, members: Set<socketId> }>
const conversations = new Map();
// playerConv: Map<socketId, convId> — which conv a player is in
const playerConv = new Map();
let nextConvId = 1;

function createConversation(memberIds) {
  const id = `conv_${nextConvId++}`;
  const members = new Set(memberIds);
  conversations.set(id, { id, members });
  memberIds.forEach((mid) => playerConv.set(mid, id));
  broadcastConvUpdate(id);
  return id;
}

function addToConversation(convId, playerId) {
  const conv = conversations.get(convId);
  if (!conv) return;
  conv.members.add(playerId);
  playerConv.set(playerId, convId);
  broadcastConvUpdate(convId);
}

function removeFromConversation(playerId) {
  const convId = playerConv.get(playerId);
  if (!convId) return;
  const conv = conversations.get(convId);
  playerConv.delete(playerId);
  if (!conv) return;
  conv.members.delete(playerId);
  if (conv.members.size <= 1) {
    // If only 1 person left, dissolve the conversation
    conv.members.forEach((mid) => {
      playerConv.delete(mid);
      io.to(mid).emit("conv:ended", { convId });
    });
    conversations.delete(convId);
    // Broadcast to all so nearby players update their UI
    io.emit("conv:dissolved", { convId });
  } else {
    broadcastConvUpdate(convId);
  }
}

function broadcastConvUpdate(convId) {
  const conv = conversations.get(convId);
  if (!conv) return;
  const memberNames = {};
  conv.members.forEach((mid) => {
    const p = players.get(mid);
    if (p) memberNames[mid] = p.name;
  });
  // Send to all connected clients so nearby players can see the conversation
  io.emit("conv:update", {
    convId,
    members: Array.from(conv.members),
    memberNames,
  });
}

function getConversationsState() {
  const result = {};
  conversations.forEach((conv, id) => {
    const memberNames = {};
    conv.members.forEach((mid) => {
      const p = players.get(mid);
      if (p) memberNames[mid] = p.name;
    });
    result[id] = { convId: id, members: Array.from(conv.members), memberNames };
  });
  return result;
}

const AVATAR_STYLES = [
  { hair: "#2C1810", skin: "#FDBCB4", shirt: "#2B5EA7", pants: "#3A3A4A", shoes: "#1A1A1A" },
  { hair: "#FFD700", skin: "#FDBCB4", shirt: "#E85B5B", pants: "#2C3E50", shoes: "#654321" },
  { hair: "#8B4513", skin: "#D2B48C", shirt: "#27AE60", pants: "#34495E", shoes: "#2C1810" },
  { hair: "#1C1C1C", skin: "#FDBCB4", shirt: "#8E44AD", pants: "#2C3E50", shoes: "#1A1A1A" },
  { hair: "#DC143C", skin: "#FDBCB4", shirt: "#F39C12", pants: "#3A3A4A", shoes: "#654321" },
  { hair: "#F5F5DC", skin: "#D2B48C", shirt: "#1ABC9C", pants: "#2C3E50", shoes: "#1A1A1A" },
  { hair: "#8B008B", skin: "#FDBCB4", shirt: "#E74C3C", pants: "#34495E", shoes: "#2C1810" },
  { hair: "#2F4F4F", skin: "#FDBCB4", shirt: "#3498DB", pants: "#2C3E50", shoes: "#1A1A1A" },
];

function getRandomSpawn() {
  const valid = [];
  for (let y = 2; y < MAP_ROWS - 2; y++)
    for (let x = 2; x < MAP_COLS - 2; x++)
      if (isWalkable(MAP[y][x])) valid.push({ x, y });
  return valid[Math.floor(Math.random() * valid.length)];
}

// ── Socket.io ───────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("player:join", (data) => {
    const spawn = getRandomSpawn();
    const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
    const player = {
      id: socket.id,
      name: data.name || "Anonymous",
      x: spawn.x, y: spawn.y,
      style, direction: "down",
    };
    players.set(socket.id, player);

    socket.emit("game:init", {
      map: MAP, mapCols: MAP_COLS, mapRows: MAP_ROWS,
      tileSize: TILE_SIZE, proximityRadius: PROXIMITY_RADIUS,
      playerId: socket.id, players: Object.fromEntries(players),
      conversations: getConversationsState(),
      furniture: getFurnitureState(),
    });
    socket.broadcast.emit("player:joined", player);
    console.log(`${player.name} joined at (${spawn.x}, ${spawn.y})`);
  });

  socket.on("player:move", (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const newX = player.x + data.dx;
    const newY = player.y + data.dy;
    if (newX >= 0 && newX < MAP_COLS && newY >= 0 && newY < MAP_ROWS && isWalkable(MAP[newY][newX]) && !isTileBlockedByFurniture(newX, newY)) {
      player.x = newX; player.y = newY;
      player.direction = data.direction || player.direction;
      socket.broadcast.emit("player:moved", { id: socket.id, x: player.x, y: player.y, direction: player.direction });
    }
  });

  // ── Conversation events ─────────────────────────────────────
  // When proximity auto-connects two players, client tells server
  socket.on("conv:start", (data) => {
    const { withId } = data;
    // Check neither is already in a conversation
    if (playerConv.has(socket.id) || playerConv.has(withId)) return;
    const convId = createConversation([socket.id, withId]);
    console.log(`Conversation ${convId} started: ${socket.id} + ${withId}`);
  });

  // Player requests to join an existing conversation
  socket.on("conv:request", (data) => {
    const { convId } = data;
    const conv = conversations.get(convId);
    if (!conv) return;
    const requester = players.get(socket.id);
    if (!requester) return;
    // Send request to all members of the conversation
    conv.members.forEach((mid) => {
      io.to(mid).emit("conv:join-request", {
        convId,
        requesterId: socket.id,
        requesterName: requester.name,
      });
    });
    console.log(`${requester.name} requested to join ${convId}`);
  });

  // A member approves a join request
  socket.on("conv:approve", (data) => {
    const { convId, requesterId } = data;
    const conv = conversations.get(convId);
    if (!conv || !conv.members.has(socket.id)) return;
    // Remove requester from any existing conversation
    if (playerConv.has(requesterId)) removeFromConversation(requesterId);
    // Add to conversation
    addToConversation(convId, requesterId);
    // Notify the requester they've been approved
    io.to(requesterId).emit("conv:approved", {
      convId,
      members: Array.from(conv.members),
    });
    // Notify all members (including new one) to establish WebRTC connections
    conv.members.forEach((mid) => {
      if (mid !== requesterId) {
        io.to(mid).emit("conv:member-added", { convId, newMemberId: requesterId });
        io.to(requesterId).emit("conv:connect-to", { peerId: mid });
      }
    });
    const requester = players.get(requesterId);
    console.log(`${requester?.name} approved to join ${convId}`);
  });

  // A member denies a join request
  socket.on("conv:deny", (data) => {
    const { convId, requesterId } = data;
    io.to(requesterId).emit("conv:denied", { convId });
  });

  // Player explicitly leaves a conversation
  socket.on("conv:leave", () => {
    removeFromConversation(socket.id);
    console.log(`${socket.id} left conversation`);
  });

  // ── Furniture placement ──────────────────────────────────────
  socket.on("furniture:place", (data) => {
    const { type, x, y } = data;
    // Validate: must be walkable floor tile and no furniture already there
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return;
    if (!isWalkable(MAP[y][x])) return;
    if (isTileBlockedByFurniture(x, y)) return;
    // Check no player is standing there
    for (const [, p] of players) {
      if (p.x === x && p.y === y) return;
    }
    const id = `f_${nextFurnitureId++}`;
    const item = { id, type, x, y, placedBy: socket.id };
    placedFurniture.set(id, item);
    io.emit("furniture:placed", item);
    const player = players.get(socket.id);
    console.log(`${player?.name} placed furniture type ${type} at (${x},${y})`);
  });

  socket.on("furniture:remove", (data) => {
    const { furnitureId } = data;
    const item = placedFurniture.get(furnitureId);
    if (!item) return;
    placedFurniture.delete(furnitureId);
    io.emit("furniture:removed", { furnitureId, x: item.x, y: item.y });
    const player = players.get(socket.id);
    console.log(`${player?.name} removed furniture at (${item.x},${item.y})`);
  });

  // ── WebRTC signaling ────────────────────────────────────────
  socket.on("webrtc:signal", (data) => { io.to(data.to).emit("webrtc:signal", { from: socket.id, signal: data.signal }); });
  socket.on("webrtc:request", (data) => { io.to(data.to).emit("webrtc:request", { from: socket.id }); });
  socket.on("webrtc:end", (data) => { io.to(data.to).emit("webrtc:end", { from: socket.id }); });

  socket.on("disconnect", () => {
    const player = players.get(socket.id);
    if (player) console.log(`${player.name} disconnected`);
    // Remove from conversation
    removeFromConversation(socket.id);
    players.delete(socket.id);
    io.emit("player:left", { id: socket.id });
  });
});

app.get("/", (req, res) => { res.json({ name: "Gather Clone Server", status: "running", players: players.size, frontend: "http://localhost:5173" }); });
app.get("/health", (req, res) => { res.json({ status: "ok", players: players.size }); });
app.get("/favicon.ico", (req, res) => res.status(204).end());

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  Gather Clone Server running on http://localhost:${PORT}`);
  console.log(`  Map: ${MAP_COLS}x${MAP_ROWS} tiles | Proximity: ${PROXIMITY_RADIUS} tiles\n`);
});
