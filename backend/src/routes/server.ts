import express from 'express';
import { getServerSeed } from '../utils/seed';
import express from 'express';
import { exec } from 'child_process';
import authenticateToken from '../middleware/auth';

const router = express.Router();

// Utility to run shell commands
function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// GET /api/server/status
router.get('/status', authenticateToken, async (_req, res) => {
  try {
    const result = await runCommand('systemctl is-active minecraft-server');
    res.json({ status: result === 'active' ? 'running' : 'stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get server status', details: (error as any).toString() });
  }
});

// POST /api/server/start
router.post('/start', authenticateToken, async (_req, res) => {
  try {
    await runCommand('systemctl start minecraft-server');
    res.json({ success: true, message: 'Minecraft server started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start server', details: (error as any).toString() });
  }
});

// POST /api/server/stop
router.post('/stop', authenticateToken, async (_req, res) => {
  try {
    await runCommand('systemctl stop minecraft-server');
    res.json({ success: true, message: 'Minecraft server stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop server', details: (error as any).toString() });
  }
});

// POST /api/server/restart
router.post('/restart', authenticateToken, async (_req, res) => {
  try {
    await runCommand('systemctl restart minecraft-server');
    res.json({ success: true, message: 'Minecraft server restarted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restart server', details: (error as any).toString() });
  }
});

export default router;

router.get('/seed', (_req, res) => {
  const seed = getServerSeed();
  if (seed) {
    res.json({ seed });
  } else {
    res.status(404).json({ error: 'Seed not available yet' });
  }
});

router.post('/players/:uuid/teleport', async (req, res) => {
  const { uuid } = req.params;
  const { x, y, z } = req.body;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    // Send command to the Minecraft server (via RCON, websocket, or your internal API)
    const command = `tp ${uuid} ${x} ${y} ${z}`;
    // TODO: Replace this with real implementation. Example: sendCommandToMinecraft(command);
    console.log('[Teleport]', command);

    res.json({ success: true, command });
  } catch (err) {
    console.error('Teleport failed:', err);
    res.status(500).json({ error: 'Teleport failed' });
  }
});
