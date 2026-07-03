"use strict";

/*
    wall.js
    牌山管理
*/

const Wall = {

    tiles: [],

    create() {

        this.tiles = [];

        // 萬子 1～9（各4枚）
        for (let n = 1; n <= 9; n++) {
            for (let i = 0; i < 4; i++) {
                this.tiles.push(Tile.create("m", n, `${n}m`));
            }
        }

        // 筒子 1～9
        for (let n = 1; n <= 9; n++) {
            for (let i = 0; i < 4; i++) {
                this.tiles.push(Tile.create("p", n, `${n}p`));
            }
        }

        // 索子 1～9
        for (let n = 1; n <= 9; n++) {
            for (let i = 0; i < 4; i++) {
                this.tiles.push(Tile.create("s", n, `${n}s`));
            }
        }

        // 字牌
        const honors = ["東", "南", "西", "北", "白", "發", "中"];

        for (const h of honors) {
            for (let i = 0; i < 4; i++) {
                this.tiles.push(Tile.create("z", 0, h));
            }
        }

        this.shuffle();
    },

    shuffle() {

        for (let i = this.tiles.length - 1; i > 0; i--) {

            const j = Math.floor(Math.random() * (i + 1));

            [this.tiles[i], this.tiles[j]] =
                [this.tiles[j], this.tiles[i]];
        }

    },

    draw() {

        return this.tiles.shift();

    },

    count() {

        return this.tiles.length;

    }

};