Project KSB v0.3.8-1 / Sprint 3-8-1

内容:
- 局進行ステートマシンを index.html の実ゲーム処理へ組み込み
- GamePhase / gameState / TurnManager / GameController を追加
- 東家→南家→西家のターン遷移を追加
- CPU手番は暫定的に自動ツモ・ランダム打牌で進行
- docs/CHANGELOG.md と docs/SYSTEM_SPEC.md を更新

確認手順:
1. index.html をブラウザで開く
2. 「ツモ / 進行」を押す
3. 自家が打牌できることを確認
4. 打牌後、南家→西家が自動でツモ・打牌し、自家に戻ることを確認
5. 状態表示が DRAW / ACTION / NEXT_PLAYER 相当で変化することを確認
6. 花ドラ確認・裏ドラ確認・暗槓/加槓デバッグが起動することを確認

Git保存コマンド:
git add .
git commit -m "Sprint 3-8-1: Add game state machine"
git push origin main
