import React from 'react';
import { getBiomeColor, BiomeType } from './terrain';

const BIOMES: BiomeType[] = ['plains', 'forest', 'desert', 'mountain', 'water'];

export const BiomeLegend: React.FC = () => {
  return (
    <div className="p-2 bg-white border rounded shadow mt-4 w-fit">
      <h4 className="text-sm font-semibold mb-2">Biome Legend</h4>
      <ul className="grid grid-cols-2 gap-1 text-xs">
        {BIOMES.map((biome) => (
          <li key={biome} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: getBiomeColor(biome) }} />
            <span>{biome.charAt(0).toUpperCase() + biome.slice(1)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
