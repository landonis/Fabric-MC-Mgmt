export type BiomeType = 'plains' | 'forest' | 'desert' | 'mountain' | 'water';

export function getBiome(x: number, z: number, seed: number): BiomeType {
  const hash = Math.abs(Math.sin((x * 374761393 + z * 668265263 + seed * 982451653)) % 1);
  if (hash < 0.2) return 'water';
  if (hash < 0.4) return 'desert';
  if (hash < 0.6) return 'plains';
  if (hash < 0.8) return 'forest';
  return 'mountain';
}

export function getBiomeColor(biome: BiomeType): string {
  switch (biome) {
    case 'plains': return '#88c070';
    case 'forest': return '#558844';
    case 'desert': return '#daca87';
    case 'mountain': return '#b3b3b3';
    case 'water': return '#6cb2e4';
    default: return '#888';
  }
}
