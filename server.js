const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_, res) => res.json({ ok: true }));

// In-memory rooms: suitable for a single server instance/demo deployment.
// For multi-instance production, move room state to Redis or a database.
const rooms = new Map();
const roomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, {
    videoId: "", playing: false, currentTime: 0, updatedAt: Date.now(),
    users: new Map(), messages: []
  });
  return rooms.get(code);
}
function snapshot(room) {
  return {
    videoId: room.videoId, playing: room.playing,
    currentTime: room.playing ? room.currentTime + (Date.now()-room.updatedAt)/1000 : room.currentTime,
    users: [...room.users.values()], messages: room.messages.slice(-60)
  };
}
io.on("connection", socket => {
  socket.on("create-room", (profile, cb) => {
    let code = roomCode(); while (rooms.has(code)) code = roomCode();
    joinRoom(code, profile, cb);
  });
  socket.on("join-room", ({ code, profile }, cb) => joinRoom(String(code||"").toUpperCase(), profile, cb));
  function joinRoom(code, profile, cb) {
    if (!/^[A-Z0-9]{6}$/.test(code)) return cb?.({ ok:false, error:"Enter a valid 6-character room code." });
    const room = getRoom(code);
    const user = { id: socket.id, name: String(profile?.name || "Guest").trim().slice(0,24) || "Guest" };
    socket.join(code); socket.data.room = code; room.users.set(socket.id,user);
    cb?.({ ok:true, code, state:snapshot(room) });
    io.to(code).emit("room-update", { users:[...room.users.values()] });
  }
  socket.on("set-video", ({ videoId }) => {
    const room = rooms.get(socket.data.room); if (!room || !/^[\w-]{11}$/.test(videoId||"")) return;
    room.videoId=videoId; room.playing=false; room.currentTime=0; room.updatedAt=Date.now();
    io.to(socket.data.room).emit("video-changed", { videoId, currentTime:0, playing:false });
  });
  socket.on("playback", ({ action, currentTime }) => {
    const room = rooms.get(socket.data.room); if (!room) return;
    room.currentTime = Math.max(0, Number(currentTime)||0);
    room.playing = action === "play"; room.updatedAt = Date.now();
    socket.to(socket.data.room).emit("playback", { action, currentTime:room.currentTime, updatedAt:room.updatedAt });
  });
  socket.on("chat-message", ({ text }) => {
    const code=socket.data.room, room=rooms.get(code); if (!room) return;
    const clean=String(text||"").trim().slice(0,500); if (!clean) return;
    const user=room.users.get(socket.id);
    const message={ id:Date.now()+Math.random(), name:user?.name||"Guest", text:clean, time:new Date().toISOString() };
    room.messages.push(message); room.messages=room.messages.slice(-100);
    io.to(code).emit("chat-message", message);
  });
  socket.on("disconnect", () => {
    const code=socket.data.room, room=rooms.get(code); if (!room) return;
    room.users.delete(socket.id);
    io.to(code).emit("room-update", { users:[...room.users.values()] });
    if (!room.users.size) setTimeout(()=>{ if (rooms.get(code)?.users.size===0) rooms.delete(code); }, 60*60*1000);
  });
});
server.listen(PORT, () => console.log(`WatchTogether running at http://localhost:${PORT}`));