import fs from 'fs';
import path from 'path';

const SERVER_PROPERTIES_PATH = path.resolve('/home/minecraft/Minecraft/server.properties');

export function getServerSeed(): string | null {
  try {
    if (!fs.existsSync(SERVER_PROPERTIES_PATH)) return null;
    const data = fs.readFileSync(SERVER_PROPERTIES_PATH, 'utf-8');
    const line = data.split('\n').find(l => l.startsWith('level-seed='));
    if (!line) return null;
    return line.split('=')[1].trim();
  } catch (e) {
    console.error('[Seed Parser] Failed to read seed:', e);
    return null;
  }
}
