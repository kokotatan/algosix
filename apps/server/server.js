const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4000;

// Room storage
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on("create_room", (data) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomId, {
      id: roomId,
      host: socket.id,
      players: [{ id: socket.id, name: data.name }],
      maxPlayers: data.maxPlayers || 4,
      state: null,
    });
    socket.join(roomId);
    socket.emit("room_created", { roomId });
    console.log(`Room ${roomId} created by ${data.name}`);
  });

  socket.on("join_room", (data) => {
    const room = rooms.get(data.roomId);
    if (!room) {
      socket.emit("error", { message: "ルームが見つかりません" });
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit("error", { message: "ルームが満員です" });
      return;
    }
    room.players.push({ id: socket.id, name: data.name });
    socket.join(data.roomId);
    io.to(data.roomId).emit("player_joined", {
      players: room.players.map((p) => ({ name: p.name })),
    });
    console.log(`${data.name} joined room ${data.roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    // TODO: Handle room cleanup
  });
});

server.listen(PORT, () => {
  console.log(`AlgosiX server running on port ${PORT}`);
});
