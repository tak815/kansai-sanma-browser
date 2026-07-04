# Project KSB Sprint 3-7B-1 修正版

目的: 花牌がドラ表示牌・裏ドラ表示牌になったときの判定バグ修正。

## 入っているもの

- `src/domain/dora.ts`
  - 共通ドラ判定モジュール
- `src/domain/dora.test.ts`
  - 確認用テスト
- `docs/SYSTEM_SPEC_addendum.md`
  - SYSTEM_SPEC.md へ追記する内容
- `docs/CHANGELOG_addendum.md`
  - CHANGELOG.md へ追記する内容

## 反映方法

1. ZIPを解凍する
2. `src/domain/dora.ts` をプロジェクトの同じ場所へコピー
   - `src/domain` がなければ作成
3. 既存の点数計算・ドラ計算箇所で、次牌計算の代わりに以下を使う

```ts
import { countDoraInTiles } from './domain/dora';

const visibleDoraCount = countDoraInTiles(scoringTiles, doraIndicators);
const uraDoraCount = countDoraInTiles(scoringTiles, uraDoraIndicators);
const totalDora = visibleDoraCount + uraDoraCount + akaDoraCount + flowerBonusCount;
```

パスは既存ファイル位置に合わせて調整してください。

## 確認ケース

- ドラ表示牌が `春` のとき、春・夏・秋・冬すべてがドラになる
- 裏ドラ表示牌が `夏` のとき、春・夏・秋・冬すべてが裏ドラになる
- ドラ表示牌 `春`、裏ドラ表示牌 `夏` のとき、花牌1枚が2ドラになる
- 通常表示牌 `2p` のとき、`3p` がドラになる
- 裏ドラ表示牌 `2p` のとき、`3p` が裏ドラになる

## Git保存

```bash
git status
git add .
git commit -m "fix: handle flower dora indicators"
git push
```
