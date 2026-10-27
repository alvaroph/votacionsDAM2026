
import { WebSocketServer } from 'ws';
import fs from 'fs';

const PORT = process.env.PORT || 3000;
const VOTOS_FILE = process.env.VOTOS_FILE || 'votos.json';

// Initialize votes
let votos = [0, 0, 0, 0];
if (fs.existsSync(VOTOS_FILE)) {
  try {
    const data = fs.readFileSync(VOTOS_FILE, 'utf8');
    votos = JSON.parse(data);
  } catch (err) {
    console.error('Error reading votos.json:', err);
  }
} else {
  fs.writeFileSync(VOTOS_FILE, JSON.stringify(votos));
}

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server started on port ${PORT}`);

wss.on('connection', ws => {
  console.log('Client connected');

  // Send the initial voting data
  ws.send(JSON.stringify(votos));

  ws.on('message', message => {
    try {
      console.log("missatge rebut "+message)
      
      const parsedMessage = JSON.parse(message);
      if (parsedMessage.hasOwnProperty('vote')) {
        const voteIndex = parsedMessage.vote;
        if (voteIndex >= 0 && voteIndex < votos.length) {
          votos[voteIndex]++;
          console.log(`Vote received for option ${voteIndex + 1}. New votes: ${votos}`);

          // Save votes to file
          fs.writeFileSync(VOTOS_FILE, JSON.stringify(votos));

          // Broadcast the updated results to all connected clients
          const updateMessage = JSON.stringify(votos);
          wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
              client.send(updateMessage);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse message or process vote:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});

