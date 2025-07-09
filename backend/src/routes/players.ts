import { Router } from 'express';
import WebSocket from 'ws';

const router = Router();

// Type definition for player data
type PlayerData = {
  uuid: string;
  name: string;
  x: number;
  y: number;
  z: number;
  inventory: { slot: number; id: string; count: number }[];
};

const livePlayers = new Map<string, PlayerData>();

// WebSocket support - link mod-pushed updates
export function registerLivePlayer(uuid: string, data: PlayerData) {
  livePlayers.set(uuid, data);
}

// API endpoint to get live player data
router.get('/', (req, res) => {
  try {
    const players = Array.from(livePlayers.values());
    res.json({ players });
  } catch (err) {
    console.error('[Players] Failed to fetch player list:', err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Mock fallback if needed
router.get('/mock', (_req, res) => {
  console.warn('[Players] Mock data returned – Fabric mod likely not connected');
  res.json({
    players: [
      {
        uuid: 'mock-uuid',
        name: 'Steve',
        x: 0,
        y: 64,
        z: 0,
        inventory: [{ slot: 0, id: 'minecraft:cobblestone', count: 64 }]
      }
    ]
  });
});

export default router;
