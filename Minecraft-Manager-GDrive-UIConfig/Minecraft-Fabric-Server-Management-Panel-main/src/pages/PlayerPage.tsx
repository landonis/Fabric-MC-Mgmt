import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InventoryItem } from '../components/InventoryItem';
import { PlayerHUD } from '../components/PlayerHUD';
import { LiveMap } from '../components/LiveMap';

type InventoryItem = {
  slot: number;
  item: string;
  count: number;
};

type Player = {
  uuid: string;
  username: string;
  inventory: InventoryItem[];
};

import { Layout } from '../components/Layout';

export default function PlayerPage() {

  const { uuid } = useParams(</Layout>);
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    fetch(`/api/players/${uuid}`)
      .then((res) => res.json())
      .then((data) => setPlayer(data))
      .catch((err) => console.error('Failed to load player:', err));
  }, [uuid]);

  if (!player) return <div className="p-4">Loading player...</div>;

  const hotbar = player.inventory.filter(i => i.slot >= 0 && i.slot <= 8);
const armor = player.inventory.filter(i => i.slot >= 100 && i.slot <= 103);

return (<Layout>
    <div>
      <LiveMap />

    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Player: {player.username}</h2>
      <PlayerHUD hotbar={hotbar} armor={armor} />

<div className="grid grid-cols-6 gap-4">
        {player.inventory.map((item) => (
          <InventoryItem key={item.slot} {...item} />
        ))}
      </div>
    </div>
  );
}
