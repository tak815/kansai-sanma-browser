"use strict";

/*
    tile.js
    牌クラス
*/

class Tile {
    constructor(uniqueId, baseId, suit, number, label, options = {}) {
        this.uniqueId = uniqueId;   // 例: 5pr_01
        this.baseId = baseId;       // 例: 5pr
        this.suit = suit;           // m / p / s / z / f
        this.number = number;       // 数牌は1〜9、字牌・花牌は0
        this.label = label;         // 表示名
        this.red = options.red || false;
        this.flower = options.flower || false;
        this.dora = false;
        this.back = false;
    }

    clone() {
        return new Tile(
            this.uniqueId,
            this.baseId,
            this.suit,
            this.number,
            this.label,
            {
                red: this.red,
                flower: this.flower
            }
        );
    }
}