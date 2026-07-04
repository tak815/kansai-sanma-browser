"use strict";

/*
    player.js
    プレイヤー
*/

class Player {

    constructor(name, type, seatWind) {

        this.name = name;
        this.type = type;
        this.seatWind = seatWind;

        this.hand = [];
        this.discards = [];

    }

    draw(tile) {

        if (!tile) {
            return;
        }

        this.hand.push(tile);

        this.sortHand();

    }

    discard(index) {

        const tile = this.hand.splice(index, 1)[0];

        if (tile) {
            this.discards.push(tile);
        }

        return tile;

    }

    randomDiscard() {

        const index =
            Math.floor(Math.random() * this.hand.length);

        return this.discard(index);

    }

    sortHand() {

        if (!Rules.autoSortHand) {
            return;
        }

        const suitOrder = {
            m: 1,
            p: 2,
            s: 3,
            z: 4
        };

        const honorOrder = {
            "東": 1,
            "南": 2,
            "西": 3,
            "北": 4,
            "白": 5,
            "發": 6,
            "中": 7
        };

        this.hand.sort((a, b) => {

            if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                return suitOrder[a.suit] - suitOrder[b.suit];
            }

            if (a.suit === "z") {
                return honorOrder[a.label] - honorOrder[b.label];
            }

            return a.number - b.number;

        });

    }

}