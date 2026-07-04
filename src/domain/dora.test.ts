import { countDoraForTile, countDoraInTiles, getDoraTargetTiles } from './dora';

describe('Project KSB flower dora rules', () => {
  test('ドラ表示牌が花牌なら春夏秋冬すべてが対象', () => {
    expect(getDoraTargetTiles('春')).toEqual(['春', '夏', '秋', '冬']);
    expect(countDoraForTile('春', ['春'])).toBe(1);
    expect(countDoraForTile('夏', ['春'])).toBe(1);
    expect(countDoraForTile('秋', ['春'])).toBe(1);
    expect(countDoraForTile('冬', ['春'])).toBe(1);
  });

  test('花牌表示牌は重複加算される', () => {
    expect(countDoraForTile('春', ['春', '夏'])).toBe(2);
    expect(countDoraInTiles(['春', '夏', '秋', '冬'], ['春'])).toBe(4);
  });

  test('通常牌は従来通り次牌がドラ', () => {
    expect(getDoraTargetTiles('2p')).toEqual(['3p']);
    expect(getDoraTargetTiles('9p')).toEqual(['1p']);
    expect(getDoraTargetTiles('東')).toEqual(['南']);
    expect(getDoraTargetTiles('中')).toEqual(['白']);
  });

  test('萬子は関西三麻仕様で 1m と 9m のみ循環', () => {
    expect(getDoraTargetTiles('1m')).toEqual(['9m']);
    expect(getDoraTargetTiles('9m')).toEqual(['1m']);
  });
});
