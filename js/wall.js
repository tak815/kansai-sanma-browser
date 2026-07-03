"use strict";

/*
    wall.js
    牌山
*/

const Wall = {

    tiles: [],

    create() {

        this.tiles = [];

        this.createSuit("m");
        this.createSuit("p");
        this.createSuit("s");

        this.createHonor("東");
        this.createHonor("南");
        this.createHonor("西");
        this.createHonor("北");
        this.createHonor("白");
        this.createHonor("發");
        this.createHonor("中");

        this.shuffle();

    },

    createSuit(suit) {

        for (let number = 1; number <= 9; number++) {

            for (let i = 0; i < 4; i++) {

                this.tiles.push(

                    new Tile(
                        suit,
                        number,
                        `${number}${suit}`
                    )

                );

            }

        }

    },

    createHonor(name) {

        for (let i = 0; i < 4; i++) {

            this.tiles.push(

                new Tile(
                    "z",
                    0,
                    name
                )

            );

        }

    },

    shuffle() {

        for (let i = this.tiles.length - 1; i > 0; i--) {

            const j = Math.floor(
                Math.random() * (i + 1)
            );

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