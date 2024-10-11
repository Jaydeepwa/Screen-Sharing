const socket = io();

// Extract the room ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room");

console.log("Admin Room ID:", roomId);

if (!roomId) {
  alert(
    "Room ID is missing from the URL. Please access the admin page via /admin route."
  );
  throw new Error("Room ID is missing from the URL.");
}

const startButton = document.getElementById("startSharing");
const stopButton = document.getElementById("stopSharing");
const shareLinkDiv = document.getElementById("shareLink");

// Store all connected viewers' socket IDs and their peer connections
let viewers = {};
let currentStream;

// Function to start sharing
startButton.addEventListener("click", async () => {
  try {
    // Use getDisplayMedia to capture the screen/tab/window
    currentStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "always",
      },
      audio: false,
    });

    // Display the share link
    const viewerUrl = `${window.location.origin}/viewer.html?room=${roomId}`;
    shareLinkDiv.innerHTML = `
            <p>Share this link with viewers:</p>
            <input type="text" value="${viewerUrl}" readonly>
            <button class="copy-button" onclick="copyLink()">Copy Link</button>
        `;

    // Join the room as admin
    socket.emit("join-room", roomId, true);

    // Listen for viewers joining
    socket.on("viewer-joined", (viewerId) => {
      console.log("Viewer joined:", viewerId);
      viewers[viewerId] = null; // Initialize with no peer connection
      initiateConnection(viewerId, currentStream);
    });

    // Handle signaling messages from viewers
    socket.on("signal", async (data) => {
      const { from, signal } = data;
      const peer = viewers[from];
      if (peer) {
        peer.signal(signal);
      }
    });

    // Handle stream end (e.g., admin stops sharing)
    currentStream.getVideoTracks()[0].addEventListener("ended", stopSharing);

    // Show stop button and hide start button
    startButton.style.display = "none";
    stopButton.style.display = "inline-block";
  } catch (err) {
    console.error("Error sharing the screen:", err);
    alert("Failed to share the screen. Check the console for more details.");
  }
});

// Function to stop sharing
stopButton.addEventListener("click", stopSharing);

function stopSharing() {
  console.log("Screen sharing stopped");
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop()); // Stop all tracks
  }

  // Clean up viewer connections
  for (let viewerId in viewers) {
    if (viewers[viewerId]) {
      viewers[viewerId].destroy();
      delete viewers[viewerId];
    }
  }

  shareLinkDiv.innerHTML = "<p>Screen sharing has been stopped.</p>";
  startButton.style.display = "inline-block";
  stopButton.style.display = "none"; // Hide stop button
}

// Function to copy the share link to the clipboard
function copyLink() {
  const linkInput = shareLinkDiv.querySelector('input[type="text"]');
  linkInput.select();
  document.execCommand("copy");
  alert("Link copied to clipboard!");
}

// Function to initiate WebRTC connection with a viewer
function initiateConnection(viewerId, stream) {
  const peer = new SimplePeer({
    initiator: true,
    trickle: false,
    stream: stream,
  });

  peer.on("signal", (signal) => {
    socket.emit("signal", {
      to: viewerId,
      signal: signal,
    });
  });

  peer.on("error", (err) => {
    console.error("Peer error:", err);
  });

  peer.on("close", () => {
    console.log(`Connection with viewer ${viewerId} closed.`);
    delete viewers[viewerId];
  });

  viewers[viewerId] = peer;
}
