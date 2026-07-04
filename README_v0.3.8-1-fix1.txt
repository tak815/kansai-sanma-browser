Project KSB v0.3.8-1 fix1

修正内容:
- newGame / startRound 時、dealAllPlayers() のあとに bindPlayerAliases() を呼ぶよう修正。
- 初期表示であなたの手牌が空になる問題を修正。

確認:
1. index.html を開く
2. あなたの手牌に13枚表示される
3. ツモ / 進行で14枚になる
4. 1枚捨てると南家→西家→自家へ戻る
