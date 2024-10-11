// public/viewer.js

const socket = io();

// Extract the room ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room");

console.log("Viewer Room ID:", roomId);

if (!roomId) {
  alert(
    "Room ID is missing from the URL. Please ensure you have the correct viewer link."
  );
  throw new Error("Room ID is missing from the URL.");
}

const video = document.getElementById("sharedScreen");

// Join the room as viewer
socket.emit("join-room", roomId, false);

// Store the peer connection
let peer = null;

// Handle signaling messages from admin
socket.on("signal", async (data) => {
  const { from, signal } = data;
  if (!peer) {
    initiateConnection(from);
  }
  peer.signal(signal);
});

// Handle error messages from the server
socket.on("error-message", (msg) => {
  alert(msg);
  console.error(msg);
});

// Function to initiate WebRTC connection with admin
function initiateConnection(adminId) {
  peer = new SimplePeer({
    initiator: false,
    trickle: false,
  });

  peer.on("signal", (signal) => {
    socket.emit("signal", {
      to: adminId,
      signal: signal,
    });
  });

  peer.on("stream", (stream) => {
    video.srcObject = stream;
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
  });

  peer.on("close", () => {
    console.log("Connection to admin closed.");
    peer = null;
  });
}
