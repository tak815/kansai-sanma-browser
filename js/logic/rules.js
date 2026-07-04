"use strict";

/*
    rules.js
    関西三麻ルール設定
*/

const Rules = {
    name: "関西三麻 基本ルール",

    // 空席設定
    // "random" = 南・西・北のどこかをランダム空席
    // "south" / "west" / "north" = 固定空席
    emptySeat: "random",

    // 赤牌
    useRedTiles: false,

    // 花牌
    useFlowerTiles: false,

    // 北抜き
    useNorthNuki: false,

    // 手牌自動ソート
    autoSortHand: true,

    // 途中流局などは今後追加
    useAbortiveDraw: false,

    // 表示用
    getEmptySeatCandidates() {
        return ["south", "west", "north"];
    }
};