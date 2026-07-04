# Architecture

Version 1.0

---

# 目的

本ドキュメントはゲーム全体の構造を定義する。

実装前に必ず本設計に従う。

後戻りする設計は採用しない。

---

# 設計思想

MVC + Service Architecture を採用する。

責務を分離し、

変更しやすく

保守しやすい

構造を目指す。

---

# ディレクトリ構成

```
css/
docs/
images/

js/

core/
logic/
ui/
service/
network/
ai/
util/

index.html
```

---

# core

ゲームの状態を管理する。

変更は最小限。

## Game

ゲーム全体

## Player

プレイヤー

## Tile

牌

## Wall

山

## Round

局情報

## Table

卓情報

---

# logic

ゲームルール

ゲーム進行

を管理する。

例

DrawService

DiscardService

FlowerService

DoraService

RiichiService

RonService

TsumoService

ScoreService

RoundService

---

# ui

表示のみ担当する。

ゲームロジックを書かない。

HandUI

DiscardUI

MeldUI

TableUI

AnimationUI

DialogUI

---

# service

ゲーム外機能。

ReplayService

SettingService

SaveService

SoundService

ProfileService

TutorialService

RankingService

---

# network

オンライン専用

Room

Match

Sync

Chat

ReplayUpload

---

# ai

CPU

AI解析

Review

DangerCalculator

ExpectedValue

Shanten

DiscardAI

CallAI

---

# util

共通処理

Random

Logger

Timer

Math

AssetLoader

---

# データの流れ

Player

↓

Game

↓

Logic

↓

UI

UIからGameを書き換えない。

---

# AI

ゲームロジックを使う。

UIを参照しない。

---

# Online

Gameを同期する。

UIは同期しない。

---

# Replay

牌譜だけ保存する。

画面情報は保存しない。

再生時にUIを生成する。

---

# Database

将来的に追加。

Account

↓

Player

↓

Replay

↓

Statistics

↓

Ranking

---

# Account

固定ID

表示名

称号

スキン

Premium

フレンド

ブロック

---

# Player

ゲーム内情報のみ。

持ち点

手牌

河

副露

リーチ

親

---

# 設計ルール

1.

UIからゲームロジックを書き換えない。

2.

LogicはUIを触らない。

3.

AIはUIを見ない。

4.

NetworkはGameだけ同期する。

5.

Replayは牌譜だけ保存する。

6.

Serviceはゲーム進行を書き換えない。

---

# 将来追加

観戦

大会

シーズン

ランキング

イベント

実績

ショップ

スキン

---

# チュートリアル

TutorialService

で管理する。

初回起動時のみ表示。

スキップ可能。

設定画面から再実行可能。

---

# Premium

ゲーム性は変えない。

便利機能のみ提供。

広告削除

AIレビュー

牌譜保存

戦績分析

限定称号

限定スキン

---

# 最終目標

コード量が

10万行を超えても

迷わない設計を維持する。