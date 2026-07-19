export interface WeightedTrait {
  id: string;
  label: string;
  weight: number;
  colors: readonly string[];
  rarityBoost?: number;
}

export const materials = [
  { id: 'royal-gold', label: 'Royal Gold', weight: 28, colors: ['#fff2a8', '#d69a28', '#6d3c05'] },
  { id: 'white-gold', label: 'White Gold', weight: 18, colors: ['#ffffff', '#cfd5df', '#626c7c'] },
  { id: 'rose-gold', label: 'Rose Gold', weight: 14, colors: ['#ffd2c7', '#d98472', '#71372f'] },
  { id: 'platinum', label: 'Platinum', weight: 12, colors: ['#ffffff', '#aeb8c8', '#454d5d'], rarityBoost: 40 },
  { id: 'black-titanium', label: 'Black Titanium', weight: 10, colors: ['#8b91a0', '#252936', '#050608'], rarityBoost: 60 },
  { id: 'ancient-bronze', label: 'Ancient Bronze', weight: 8, colors: ['#e7b56e', '#8b5428', '#39200f'], rarityBoost: 70 },
  { id: 'obsidian', label: 'Obsidian', weight: 7, colors: ['#838899', '#171922', '#020203'], rarityBoost: 110 },
  { id: 'ton-crystal', label: 'TON Crystal', weight: 3, colors: ['#e9fdff', '#37b9ff', '#0753a6'], rarityBoost: 260 },
] as const satisfies readonly WeightedTrait[];

export const gems = [
  { id: 'none', label: 'Open Socket', weight: 24, colors: ['#283244', '#111722', '#080b11'] },
  { id: 'sapphire', label: 'Sapphire', weight: 24, colors: ['#e9fbff', '#3979ff', '#111d7c'] },
  { id: 'ruby', label: 'Ruby', weight: 18, colors: ['#ffe5e6', '#ef4454', '#7e0717'] },
  { id: 'emerald', label: 'Emerald', weight: 16, colors: ['#e1ffed', '#2ed17c', '#075b30'] },
  { id: 'amethyst', label: 'Amethyst', weight: 10, colors: ['#f7e8ff', '#a94ef5', '#4d117a'], rarityBoost: 45 },
  { id: 'diamond', label: 'Diamond Signal', weight: 6, colors: ['#ffffff', '#9de9ff', '#2f8dca'], rarityBoost: 180 },
  { id: 'black-diamond', label: 'Black Diamond', weight: 2, colors: ['#c8d0db', '#303644', '#050608'], rarityBoost: 320 },
] as const satisfies readonly WeightedTrait[];

export const backgrounds = [
  { id: 'midnight-vault', label: 'Midnight Vault', weight: 24, colors: ['#11172a', '#080b14', '#020308'] },
  { id: 'victory-arena', label: 'Victory Arena', weight: 20, colors: ['#35200e', '#130d08', '#050403'] },
  { id: 'ton-aurora', label: 'TON Aurora', weight: 18, colors: ['#0a2942', '#0b1020', '#04060d'] },
  { id: 'royal-chamber', label: 'Royal Chamber', weight: 16, colors: ['#321e3e', '#160d20', '#060309'] },
  { id: 'legacy-smoke', label: 'Legacy Smoke', weight: 12, colors: ['#293039', '#101419', '#030405'] },
  { id: 'eternal-ice', label: 'Eternal Ice', weight: 7, colors: ['#d8fbff', '#225c78', '#07131d'], rarityBoost: 80 },
  { id: 'genesis-void', label: 'Genesis Void', weight: 3, colors: ['#28143e', '#07050c', '#000000'], rarityBoost: 220 },
] as const satisfies readonly WeightedTrait[];

export const crowns = [
  { id: 'classic', label: 'Classic Crown', weight: 30, colors: ['#ffffff', '#ffffff', '#ffffff'] },
  { id: 'fortress', label: 'Fortress Crown', weight: 22, colors: ['#ffffff', '#ffffff', '#ffffff'] },
  { id: 'winged', label: 'Winged Crown', weight: 18, colors: ['#ffffff', '#ffffff', '#ffffff'], rarityBoost: 35 },
  { id: 'dynasty', label: 'Dynasty Crown', weight: 14, colors: ['#ffffff', '#ffffff', '#ffffff'], rarityBoost: 60 },
  { id: 'halo', label: 'Halo Crown', weight: 10, colors: ['#ffffff', '#ffffff', '#ffffff'], rarityBoost: 100 },
  { id: 'genesis', label: 'Genesis Crown', weight: 6, colors: ['#ffffff', '#ffffff', '#ffffff'], rarityBoost: 190 },
] as const satisfies readonly WeightedTrait[];

export const engravings = [
  { id: 'legacy', label: 'LEGACY', weight: 20, colors: ['#ffffff', '#ffffff', '#ffffff'] },
  { id: 'champion', label: 'CHAMPION', weight: 18, colors: ['#ffffff', '#ffffff', '#ffffff'] },
  { id: 'eternal', label: 'ETERNAL', weight: 16, colors: ['#ffffff', '#ffffff', '#ffffff'] },
  { id: 'genesis', label: 'GENESIS', weight: 12, colors: ['#ffffff', '#ffffff', '#ffffff'], rarityBoost: 70 },
  { id: 'victory', label: 'VICTORY', weight: 18, colors: ['#ffffff', '#ffffff', '#ffffff'] },
  { id: 'crown', label: 'CROWN', weight: 12, colors: ['#ffffff', '#ffffff', '#ffffff'] },
  { id: 'one-of-one', label: 'ONE OF ONE', weight: 4, colors: ['#ffffff', '#ffffff', '#ffffff'], rarityBoost: 220 },
] as const satisfies readonly WeightedTrait[];

export const auras = [
  { id: 'none', label: 'Dormant', weight: 30, colors: ['#000000', '#000000', '#000000'] },
  { id: 'royal', label: 'Royal Aura', weight: 24, colors: ['#fff2a8', '#e0a533', '#8f560e'] },
  { id: 'victory', label: 'Victory Flame', weight: 18, colors: ['#ffe4b0', '#ff8c38', '#9b240d'] },
  { id: 'ton', label: 'TON Pulse', weight: 16, colors: ['#dff9ff', '#2bb7ff', '#0755a8'] },
  { id: 'eternal', label: 'Eternal Violet', weight: 9, colors: ['#f3ddff', '#a84eff', '#481177'], rarityBoost: 100 },
  { id: 'founder', label: 'Founder Radiance', weight: 3, colors: ['#ffffff', '#ffd86d', '#2bb7ff'], rarityBoost: 280 },
] as const satisfies readonly WeightedTrait[];

export const ringSizes = ['Signet', 'Monument', 'Imperial'] as const;

export function totalWeight(traits: readonly WeightedTrait[]): number {
  return traits.reduce((sum, trait) => sum + trait.weight, 0);
}

export function pickWeighted(
  traits: readonly WeightedTrait[],
  value: number,
): WeightedTrait {
  const total = totalWeight(traits);
  let cursor = value % total;
  for (const trait of traits) {
    cursor -= trait.weight;
    if (cursor < 0) return trait;
  }
  const fallback = traits.at(-1);
  if (!fallback) throw new Error('empty weighted trait catalog');
  return fallback;
}
