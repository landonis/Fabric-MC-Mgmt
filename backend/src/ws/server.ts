import { WebSocketServer } from 'ws';
import { registerLivePlayer } from '../routes/players';

export const wss = new WebSocketServer({ port: 3020 });
const clients: Record<string, WebSocket> = {};

wss.on('connection', (socket, req) => {
  console.log('[WS] New connection from mod');

  socket.on('message', (msg: string) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.uuid && parsed.name) {
        registerLivePlayer(parsed.uuid, parsed);
        clients[parsed.uuid] = socket;
        console.log(`[WS] Update from ${parsed.uuid}:`, parsed);
      }
    } catch (e) {
      console.warn('[WS] Invalid message', msg.toString());
    }
  });

  socket.on('close', () => {
    for (const uuid in clients) {
      if (clients[uuid] === socket) delete clients[uuid];
    }
  });
});
