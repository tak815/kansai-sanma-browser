# Project KSB Architecture

## 1. この文書の目的

本ドキュメントは、Project KSB（関西三麻ブラウザ試作）の**現在の実行構成**と**将来の分離方針**を整理する。

ゲームルールの正式仕様は `docs/Rulebook.md` を正とする。本書は実装構造の説明であり、ルール定義そのものではない。

**現在動いている構成**、**将来目指す分離構成**、**削除済み旧MVC試作の履歴**を混同しないことが本書の目的である。

---

## 2. 現在の実行構成

### 現行ランタイム構成

現行ゲームは、次の組み合わせで動作している。

| 要素 | 内容 |
|------|------|
| エントリ | `index.html` |
| スタイル | `css/current-game.css` |
| ゲーム本体 | `index.html` 内のインライン `<script>`（約850行） |
| 外部 Manager 群 | `js/` 配下の 8 ファイル |
| 起動処理 | `js/core/appBootstrap.js`（最後に読み込み） |

ビルドツール（Vite / Webpack 等）は使用していない。`<script src="...">` によるグローバル関数・オブジェクトの連携で動作する。

### 現行ディレクトリ（実行に関与するファイル）

```
css/
  current-game.css

js/
  ai/aiManager.js
  audio/soundManager.js
  core/appBootstrap.js
  core/gameController.js
  core/matchManager.js
  replay/replayManager.js
  spectator/spectatorManager.js
  stats/statsManager.js

src/domain/          ← ブラウザ実行経路とは別系統（後述）
  dora.ts
  dora.test.ts

index.html
docs/
images/
```

---

## 3. スクリプト読み込み順

`index.html` 末尾付近の `<script>` 読み込み順は次のとおり（実ファイルに基づく）。

| 順 | ファイル / ブロック |
|----|---------------------|
| 1 | `js/audio/soundManager.js` |
| 2 | `js/stats/statsManager.js` |
| 3 | `js/replay/replayManager.js` |
| 4 | `js/spectator/spectatorManager.js` |
| 5 | `js/core/gameController.js` |
| 6 | `js/core/matchManager.js` |
| 7 | `js/ai/aiManager.js` |
| 8 | `index.html` 内のインラインゲーム本体 |
| 9 | `js/core/appBootstrap.js` |

`appBootstrap.js` はインライン本体および Manager 群が定義された**後**に実行され、UI 初期化と初回対局開始を行う。

---

## 4. 現行ファイルと責務

### index.html

- **DOM** — 対局 HUD、操作ボタン、牌卓、手牌・河、モーダル（統計・リプレイ・観戦）など
- **gameState との連携** — 全局変数 `gameState` および `wall` / `doraIndicators` 等を参照
- **牌山生成** — `createWall()` で牌集合・嶺上・初期ドラを構築
- **ツモ・打牌** — プレイヤー操作（`drawTile()` 等）および `GameController` への委譲
- **render** — 手牌・河・ドラ表示・向聴・役表示・デバッグパネル等の描画更新
- **操作ボタン** — 抜き花、リーチ、和了、カン、次局、上がりやめ等
- **デバッグ UI** — 確認用ボタン群、通常表示 / 開発表示の切替
- **主要ゲームロジック（現時点でここに残存）** — 和了判定、役評価、点数計算、鳴き・ロン処理、ドラ計算、向聴計算、デバッグ用局面操作 など

### js/core/appBootstrap.js

- ページ読み込み完了後の**起動処理**
- `initializeUiDisplay()` による UI モード初期化
- `createInitialGameState()` で `gameState` 生成
- `newGame()` による初回局開始

※ イベント接続の多くは `index.html` 内の `onclick` 属性および各 Manager からの呼び出しで行われている。

### js/core/gameController.js

- **ゲーム進行制御** — `GameController` オブジェクト
- **フェーズ管理** — `GamePhase` 定数と `setPhase()`
- **ターン管理** — `TurnManager`（現在席・手番進行）
- 局内のツモ（`drawForCurrentSeat`）、打牌（`discardFromSeat`）、次玩家へ（`gotoNextPlayer`）、流局（`endByRyukyoku`）
- 新局開始（`startRound`） — `matchManager.js` の carry 情報を受け取り配牌・リプレイ記録開始

### js/core/matchManager.js

- **対局・局単位の状態** — `createInitialGameState()` / `carryIntoNewGameState()`
- **局進行** — 東南の局数、本場、供託、親移動、返り東
- **終局条件** — 南3局終了、40000点超え、トビ（0点以下）、上がりやめ
- **点数・順位** — `finishMatch()` / `makeMatchResult()`、和了・流局後の `nextRound` carry 生成
- **対局操作** — `newGame()` / `startNextRound()` / `restartMatch()` / `dealAllPlayers()`

### js/ai/aiManager.js

- **CPU 操作** — ツモ後の自動打牌スケジュール（`scheduleAiDiscard` / `scheduleCurrentTurnDraw`）
- CPU 打牌選択（向聴・安全度・ドラ価値等）
- CPU リーチ、ポン、大明槓、暗槓・加槓の判断と実行
- 花牌の自動抜き（`autoNukiFlowersForSeat`）
- AI 停止デバッグ（`toggleDebugAiPause`）および CPU 確認用デバッグ関数

### js/replay/replayManager.js

- **牌譜記録** — イベント列と `replaySnapshot()` による状態スナップショット
- **localStorage 保存・読込** — `saveReplayHistory()` / `loadReplayHistory()`
- **リプレイ UI** — 再生・停止、イベントジャンプ、ブックマーク、公開範囲（full / self / hidden）、観戦ディレイ
- **JSON 入出力** — 牌譜のエクスポート・インポート

### js/stats/statsManager.js

- **対局内統計** — `createMatchStats()` / `recordWinStats()`（和了・放銃・役別等）
- **プロフィール統計** — localStorage への永続化（`persistCompletedMatch()` / `saveProfileStats()`）
- **統計 UI** — プロフィール表示、統計モーダル、JSON エクスポート、デバッグ用リセット

### js/audio/soundManager.js

- **効果音制御** — Web Audio API による合成音（ツモ、打牌、和了、カン等）
- ON/OFF 切替（`toggleSound()` / `playSound()`）

### js/spectator/spectatorManager.js

- **観戦ロビー UI** — 保存牌譜を元にした開発プレビュー一覧
- レートフィルタ、観戦ディレイ付きリプレイ viewer への遷移
- 外部フィード URL（`SPECTATOR_FEED_ENDPOINT`）は未設定（null）。現状はローカル牌譜ベース

### css/current-game.css

- 現行 UI のレイアウト・牌表示・モーダル・通常表示モード等のスタイル

---

## 5. 現在の状態管理と処理の流れ

### 状態の所在

| 状態 | 主な定義場所 |
|------|-------------|
| `gameState`（局・手番・手牌・河・副露・点数・フェーズ等） | `matchManager.js` で生成、`gameController.js` / 各所で更新 |
| `wall` / `rinshanPile` / `doraIndicators` / `uraIndicators` | `index.html` インライン（全局変数） |
| `profileStats` | `statsManager.js` |
| 牌譜 `currentReplay` / `activeReplay` | `replayManager.js` |

### 典型的な処理の流れ（1局）

1. `appBootstrap.js` → `newGame()` → `GameController.startRound()`
2. `createWall()`（インライン）で牌山生成 → `dealAllPlayers()` で配牌
3. `scheduleCurrentTurnDraw()`（AI Manager）が手番に応じてツモをスケジュール
4. `GameController.drawForCurrentSeat()` → プレイヤーは手牌クリックで打牌、CPU は `scheduleAiDiscard()`
5. 打牌後 `handleClaimsAfterDiscard()`（インライン）でロン・鳴き判定
6. 和了時はインライン側の点数・役処理 → `matchManager.js` で次局 carry または対局終了
7. `render()`（インライン）で DOM 更新、`recordReplayEvent()` / `playSound()` が随時呼ばれる

Manager への分離は進行中であり、**局内ルール・表示の多くは依然としてインライン script に集中**している。

---

## 6. TypeScriptドメイン試作の位置づけ

`src/domain/dora.ts` および `src/domain/dora.test.ts` について:

- **現行ブラウザ実行経路とは別系統** — `index.html` からは読み込まれていない
- **ドラロジックのドメイン分離・テスト用試作** — 表ドラ・裏ドラ・花牌ドラの判定を純粋関数として切り出し、Jest 等で検証可能な形にしている
- **ランタイム本体を置き換えていない** — ブラウザ上のドラ計算（`getDoraTargets()` 等）は `index.html` インライン内に別実装として残存
- **ES Modules（export）形式** — ビルド・バンドルなしではブラウザに直接載せていない

将来、インライン側のドラ処理と統合する候補であるが、**現時点では試作段階**である。

---

## 7. 削除済み旧MVC試作

初期 Sprint では、次のような MVC 試作コードが存在した。

- `js/core/game.js` — Game
- `js/core/player.js` — Player
- `js/core/tile.js` — Tile
- `js/core/wall.js` — Wall
- `js/logic/rules.js` — Rules
- `js/ui/ui.js` — UI
- `js/util/tileImage.js` — TileImage
- `js/main.js` — 旧エントリ
- `css/style.css` — 旧スタイル

これらは現行の `index.html` + インライン本体 + Manager 群の実行経路とは**分離され未使用**となっていた。

未使用コード整理として**削除済み**（Git 履歴から参照・復元可能）。

**注意:** 旧試作の削除は、現行実装が完成形であることを意味しない。現行は試作段階のモノリシック構成であり、本書 §9 の分離方針が今後の改善方向である。

---

## 8. 現在の技術的課題

実ファイル確認に基づく現状の課題:

- **`index.html` のインライン script が大きい** — ルール・UI・描画・デバッグが同一ブロックに共存
- **DOM、状態管理、ゲーム進行、描画の責務がまだ集中している** — Manager 分離は一部のみ
- **Manager への分離は進行中** — 進行制御・対局管理・AI・Replay 等は外出し済みだが、核となるルール処理はインラインに残存
- **現行ブラウザコードと TypeScript 試作（`dora.ts`）は未統合** — 二重実装の状態
- **一括リファクタリングは回帰リスクが高い** — 段階的な抽出とブラウザ確認が必要
- **グローバル変数・関数による結合** — モジュール境界が明確でない箇所がある

---

## 9. 将来の分離方針

以下は**将来目指す方向性**であり、未実装または部分実装のものを「現在実装済み」と記述してはならない。

### 段階的分離

- `index.html` 内の巨大インライン script を**段階的に**外部ファイルへ切り出す
- **一度に全面書き換えしない**
- **1 機能ずつ**安全に抽出し、ブラウザで挙動確認する

### 責務の分離

- **`docs/Rulebook.md` をルール仕様の正**とする
- **状態管理**と**表示処理（render / DOM）**を分離する
- **ゲーム進行**（ツモ・打牌・フェーズ）と**点数・役計算**を分離する
- CPU、Replay、Stats、Sound、Spectator は **Manager 単位を維持または改善**する

### オンライン・永続化を見据えた設計

- 対局状態を**シリアライズ可能**な形に整理する
- 切断時 CPU 代打・再接続復帰に対応**可能な**設計を目指す（現時点では未実装）
- 統計・牌譜の保存形式は**バージョン管理できる構造**を維持・拡張する（Stats / Replay では schemaVersion を使用中）

### テスト容易性

- **`src/domain/` のようなテスト可能な純粋関数**を増やす
- ルール変更時は Rulebook → 純粋関数テスト → ブラウザ確認の順を推奨

---

## 10. 開発時の原則

- **1 タスク 1 機能または 1 責務**
- **1 ファイルの小規模修正**は通常の Cursor チャット指示で行う
- **複数ファイルの連動変更**は Composer（Ctrl + I）を検討する
- **作業開始前に `git status` を確認**する（作業ツリーが clean であること）
- **ブラウザ確認後に commit**する
- **不要な全体リファクタリングを避ける**
- **`docs/Rulebook.md` を正式仕様**とする
- **現在動いている挙動を壊さない**
- **変更範囲外には触れない**

### 文書上の注意（Architecture 記述時）

- 現在と将来を混同しない
- 削除済みファイルを現存するように書かない
- React、Vite、Webpack 等のビルド構成を使用していると書かない
- `package.json` が存在すると書かない（本リポジトリに npm 構成はない）
- ES Modules 構成でブラウザが動いていると書かない
- 旧 MVC を現在の実装と書かない
- 現行コードが完成済みの理想構成だと書かない
- Rulebook にないルールを Architecture に追加しない
