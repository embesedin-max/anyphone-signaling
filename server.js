const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Простий room-based сигналінг
const rooms = new Map(); // roomId -> Set of clients

wss.on('connection', (ws) => {
  console.log('Client connected');
  let currentRoom = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);

      switch (data.type) {
        case 'join':
          currentRoom = data.roomId || 'default';
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set());
          }
          rooms.get(currentRoom).add(ws);
          ws.send(JSON.stringify({ type: 'joined', roomId: currentRoom }));
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Пересилаємо всім іншим у кімнаті
          if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
          }
          break;
      }
    } catch (e) {
      console.error('Error parsing message', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

app.get('/', (req, res) => {
  res.send('AnyPhone Signaling Server is running');
});

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});