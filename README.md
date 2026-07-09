# v0.3.9-5 Fix2: Flower indicator physical-tile fix

## 修正内容

- ドラ表示牌に使われた花牌を、抜き花側に重複表示しないように修正。
- 13/14翻確認で、ドラ表示牌が春の場合の抜き花を夏・秋・冬のみに修正。
- 花ドラ確認でも、春をドラ表示牌にした場合は手牌側を夏・秋・冬のみに修正。
- 裏ドラ確認でも、表ドラ春・裏ドラ夏を使った場合、手牌側は秋・冬のみに修正。

## 確認ポイント

- 13/14翻確認でドラ表示牌に春が出る。
- 自家の抜き花に春が出ない。
- 抜き花は夏・秋・冬のみになる。
- 花ドラ計算は、表示牌が花なら公開済み花牌それぞれに加算される。

## Git

git add .
git commit -m "Sprint 3-9-5 fix: Prevent duplicated flower indicator tiles"
git push origin main
