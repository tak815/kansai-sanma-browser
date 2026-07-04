/**
 * Project KSB - Sprint 3-7B-1
 * Dora / Ura-dora shared judgement utilities.
 *
 * 修正点:
 * - ドラ表示牌・裏ドラ表示牌が花牌の場合、次牌計算をしない。
 * - 春夏秋冬の種類に関係なく、すべての花牌をドラ対象にする。
 * - 表ドラ、カンドラ、裏ドラ、カン裏ドラは indicator 単位で重複加算する。
 */

export type TileCode = string;

export const FLOWER_TILES = ['春', '夏', '秋', '冬'] as const;
export type FlowerTile = (typeof FLOWER_TILES)[number];

const FLOWER_TILE_SET = new Set<string>(FLOWER_TILES);

export function isFlowerTile(tile: TileCode | null | undefined): tile is FlowerTile {
  return typeof tile === 'string' && FLOWER_TILE_SET.has(tile);
}

function nextNumberTile(tile: TileCode, suit: 'm' | 'p' | 's'): TileCode | null {
  const n = Number(tile.slice(0, -1));
  if (!Number.isInteger(n)) return null;

  // Project KSB: 萬子は 1m / 9m のみ使用。
  if (suit === 'm') {
    if (n === 1) return '9m';
    if (n === 9) return '1m';
    return null;
  }

  if (n < 1 || n > 9) return null;
  return `${n === 9 ? 1 : n + 1}${suit}`;
}

function nextHonorTile(tile: TileCode): TileCode | null {
  const winds = ['東', '南', '西', '北'];
  const dragons = ['白', '發', '中'];

  const windIndex = winds.indexOf(tile);
  if (windIndex >= 0) return winds[(windIndex + 1) % winds.length];

  const dragonIndex = dragons.indexOf(tile);
  if (dragonIndex >= 0) return dragons[(dragonIndex + 1) % dragons.length];

  return null;
}

/**
 * 1枚の表示牌から、ドラ対象牌を返す。
 * 花牌表示牌の場合は春夏秋冬すべてを返す。
 */
export function getDoraTargetTiles(indicator: TileCode): TileCode[] {
  if (isFlowerTile(indicator)) {
    return [...FLOWER_TILES];
  }

  if (indicator.endsWith('m')) {
    const next = nextNumberTile(indicator, 'm');
    return next ? [next] : [];
  }

  if (indicator.endsWith('p')) {
    const next = nextNumberTile(indicator, 'p');
    return next ? [next] : [];
  }

  if (indicator.endsWith('s')) {
    const next = nextNumberTile(indicator, 's');
    return next ? [next] : [];
  }

  const honor = nextHonorTile(indicator);
  return honor ? [honor] : [];
}

/**
 * 牌1枚に対して、表示牌リストから何ドラ乗るかを数える。
 * 同じ対象牌に複数 indicator が当たれば重複加算する。
 */
export function countDoraForTile(tile: TileCode, indicators: TileCode[]): number {
  return indicators.reduce((count, indicator) => {
    return count + (getDoraTargetTiles(indicator).includes(tile) ? 1 : 0);
  }, 0);
}

/**
 * 手牌・副露・抜き花など、複数牌の合計ドラ数を数える。
 */
export function countDoraInTiles(tiles: TileCode[], indicators: TileCode[]): number {
  return tiles.reduce((total, tile) => total + countDoraForTile(tile, indicators), 0);
}
