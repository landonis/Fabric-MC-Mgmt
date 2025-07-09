import React, { useEffect, useRef, useState } from 'react';
import { getBiome, getBiomeColor } from './terrain';
import { BiomeLegend } from './BiomeLegend';

type PlayerLocation = {
  uuid: string;
  username: string;
  x: number;
  y: number;
  z: number;
  inventory: any[];
};

const TILE_SIZE = 32;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;

export const LiveMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [players, setPlayers] = useState<PlayerLocation[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLocation | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<PlayerLocation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [seed, setSeed] = useState<string | null>(null);

  // Load world seed from server.properties
  useEffect(() => {
    const fetchSeed = async () => {
      try {
        const res = await fetch('/api/server/seed');
        if (!res.ok) throw new Error('Seed fetch failed');
        const data = await res.json();
        if (data?.seed) {
          setSeed(data.seed);
        }
      } catch (err) {
        console.warn('No seed available yet. Falling back to default grid.');
      }
    };
    fetchSeed();
    const retryInterval = setInterval(fetchSeed, 60000); // retry every minute if missing
    return () => clearInterval(retryInterval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!seed) {
      // Draw fallback terrain grid
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const isEven = (x + y) % 2 === 0;
          ctx.fillStyle = isEven ? '#dce' : '#cde';
          ctx.fillRect(x * TILE_SIZE * zoom, y * TILE_SIZE * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);

      // Chunk grid overlay
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const wx = Math.floor(x - MAP_WIDTH / 2) * 10;
          const wz = Math.floor(y - MAP_HEIGHT / 2) * 10;
          if ((wx % 16 === 0) && (wz % 16 === 0)) {
            ctx.strokeRect(x * TILE_SIZE * zoom, y * TILE_SIZE * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);
          }
        }
      }

        }
      }
    } else {
      // Seed-based biome generation + chunk grid overlay
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const wx = Math.floor(x - MAP_WIDTH / 2) * 10;
          const wz = Math.floor(y - MAP_HEIGHT / 2) * 10;
          const biome = getBiome(wx, wz, parseInt(seed));
          ctx.fillStyle = getBiomeColor(biome);
          ctx.fillRect(x * TILE_SIZE * zoom, y * TILE_SIZE * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);

      // Chunk grid overlay
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const wx = Math.floor(x - MAP_WIDTH / 2) * 10;
          const wz = Math.floor(y - MAP_HEIGHT / 2) * 10;
          if ((wx % 16 === 0) && (wz % 16 === 0)) {
            ctx.strokeRect(x * TILE_SIZE * zoom, y * TILE_SIZE * zoom, TILE_SIZE * zoom, TILE_SIZE * zoom);
          }
        }
      }

        }
      }
      ctx.fillStyle = '#e8f5e9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw player icons
    players.forEach((player) => {
      const px = Math.floor(MAP_WIDTH / 2 + player.x / 10);
      const py = Math.floor(MAP_HEIGHT / 2 + player.z / 10);
      const screenX = px * TILE_SIZE * zoom;
      const screenY = py * TILE_SIZE * zoom;

      const icon = new Image();
      icon.src = `/avatars/${player.username}.png`;
      icon.onload = () => {
        ctx.drawImage(icon, screenX + 4, screenY + 4, 24 * zoom, 24 * zoom);
        if (hoveredPlayer?.uuid === player.uuid) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(screenX, screenY - 14, 100, 14);
          ctx.fillStyle = 'white';
          ctx.font = `${10 * zoom}px sans-serif`;
          ctx.fillText(player.username, screenX + 4, screenY - 3);
        }
      };
    });
  }, [players, zoom, hoveredPlayer, seed]);

  useEffect(() => {
    const fetchPlayers = () => {
      fetch('/api/players')
        .then((res) => res.json())
        .then((data) => setPlayers(data.players || []));
    };
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    for (let player of players) {
      const px = Math.floor(MAP_WIDTH / 2 + player.x / 10);
      const py = Math.floor(MAP_HEIGHT / 2 + player.z / 10);
      const screenX = px * TILE_SIZE;
      const screenY = py * TILE_SIZE;
      const dx = clickX - (screenX + TILE_SIZE / 2);
      const dy = clickY - (screenY + TILE_SIZE / 2);
      if (dx * dx + dy * dy < 324) {
        setSelectedPlayer(player);
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;

    const found = players.find((player) => {
      const px = Math.floor(MAP_WIDTH / 2 + player.x / 10);
      const py = Math.floor(MAP_HEIGHT / 2 + player.z / 10);
      const screenX = px * TILE_SIZE;
      const screenY = py * TILE_SIZE;
      const dx = mx - (screenX + TILE_SIZE / 2);
      const dy = my - (screenY + TILE_SIZE / 2);
      return dx * dx + dy * dy < 324;
    });
    setHoveredPlayer(found || null);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-2">🗺️ Live Player Map</h2>
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">➖ Zoom Out</button>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">➕ Zoom In</button>
      </div>
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH * TILE_SIZE * zoom}
        height={MAP_HEIGHT * TILE_SIZE * zoom}
        className="border shadow rounded bg-white cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
      />
      {selectedPlayer && (
        <div className="mt-4 p-4 border rounded bg-gray-50 shadow w-fit">
          <h3 className="font-bold text-lg mb-2">🎯 {selectedPlayer.username}</h3>
          <div className="text-sm mb-2">Position: X: {selectedPlayer.x}, Z: {selectedPlayer.z}</div>
          <div className="text-sm font-semibold mb-1">Inventory:</div>
          <ul className="grid grid-cols-4 gap-2 text-xs">
            {selectedPlayer.inventory.slice(0, 12).map((item, i) => (
              <li key={i} className="border p-1 rounded bg-white shadow">
                {item.item.replace("minecraft:", "")} x{item.count}
              </li>
            ))}
          </ul>
          <div className="text-sm font-semibold mt-3 mb-1">Teleport player:</div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const x = parseFloat((form.elements.namedItem('x') as HTMLInputElement).value);
              const y = parseFloat((form.elements.namedItem('y') as HTMLInputElement).value);
              const z = parseFloat((form.elements.namedItem('z') as HTMLInputElement).value);
              fetch(`/api/players/${selectedPlayer?.uuid}/teleport`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y, z }),
              }).then(res => {
                if (res.ok) alert('Player teleported!');
                else alert('Teleport failed.');
              });
            }}
            className="flex flex-col gap-1 text-xs"
          >
            <input name="x" type="number" placeholder="X" required className="border px-1 py-0.5 rounded" />
            <input name="y" type="number" placeholder="Y" required className="border px-1 py-0.5 rounded" />
            <input name="z" type="number" placeholder="Z" required className="border px-1 py-0.5 rounded" />
            <button type="submit" className="mt-1 bg-blue-600 text-white px-2 py-0.5 rounded">Teleport</button>
          </form>

        </div>
      )}
          <BiomeLegend />
    </div>
  );
};
