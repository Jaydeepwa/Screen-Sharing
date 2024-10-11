// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { v4: uuidV4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 8002;

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Route to serve the homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Route to create a new room and redirect to admin page
app.get("/admin", (req, res) => {
  const roomId = generateRoomId(6);
  console.log(`New room created: ${roomId}`);
  res.redirect(`/admin.html?room=${roomId}`);
});

// Route to join a viewer page with a specific room ID
app.get("/viewer", (req, res) => {
  const roomId = req.query.room;
  if (!roomId) {
    console.error("Viewer tried to join without a room ID");
    return res.status(400).send("Room ID is required");
  }
  console.log(`Viewer trying to join room: ${roomId}`);
  res.redirect(`/viewer.html?room=${roomId}`);
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Join a room
  socket.on("join-room", (roomId, isAdmin) => {
    if (!roomId) {
      console.error("join-room event received without roomId");
      return;
    }

    const room = io.sockets.adapter.rooms.get(roomId);
    const numClients = room ? room.size : 0;

    if (!isAdmin && numClients === 0) {
      console.error(`Viewer attempted to join non-existent room: ${roomId}`);
      socket.emit("error-message", "Room does not exist.");
      return;
    }

    socket.join(roomId);
    console.log(`${isAdmin ? "Admin" : "Viewer"} joined room: ${roomId}`);

    // Notify other clients in the room
    if (isAdmin) {
      socket.to(roomId).emit("admin-joined");
    } else {
      socket.to(roomId).emit("viewer-joined", socket.id);
    }
  });

  // Relay signaling messages between admin and viewers
  socket.on("signal", (data) => {
    if (!data.to || !data.signal) {
      console.error('Signal event missing "to" or "signal" fields');
      return;
    }
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal,
    });
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    // Optionally, notify others in the room about the disconnection
  });
});

function generateRoomId(length) {
  const characters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
