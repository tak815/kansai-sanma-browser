"use strict";

/*
    wall.js
    関西三麻牌山
*/

const Wall = {
    tiles: [],

    create() {
        this.tiles = [];

        this.createManzu();
        this.createPinzu();
        this.createSouzu();
        this.createHonor();
        this.createFlower();

        this.shuffle();
    },

    createTile(baseId, suit, number, label, index, options = {}) {
        const uniqueId = `${baseId}_${String(index).padStart(2, "0")}`;

        return new Tile(
            uniqueId,
            baseId,
            suit,
            number,
            label,
            options
        );
    },

    createManzu() {
        [1, 9].forEach(number => {
            const baseId = `${number}m`;

            for (let i = 1; i <= 4; i++) {
                this.tiles.push(
                    this.createTile(
                        baseId,
                        "m",
                        number,
                        `${number}m`,
                        i
                    )
                );
            }
        });
    },

    createPinzu() {
        for (let number = 1; number <= 9; number++) {
            const isRedFive = number === 5;
            const baseId = isRedFive ? "5pr" : `${number}p`;

            for (let i = 1; i <= 4; i++) {
                this.tiles.push(
                    this.createTile(
                        baseId,
                        "p",
                        number,
                        `${number}p`,
                        i,
                        {
                            red: isRedFive
                        }
                    )
                );
            }
        }
    },

    createSouzu() {
        for (let number = 1; number <= 9; number++) {
            const isRedFive = number === 5;
            const baseId = isRedFive ? "5sr" : `${number}s`;

            for (let i = 1; i <= 4; i++) {
                this.tiles.push(
                    this.createTile(
                        baseId,
                        "s",
                        number,
                        `${number}s`,
                        i,
                        {
                            red: isRedFive
                        }
                    )
                );
            }
        }
    },

    createHonor() {
        const honors = [
            { baseId: "east", label: "東" },
            { baseId: "south", label: "南" },
            { baseId: "west", label: "西" },
            { baseId: "north", label: "北" },
            { baseId: "haku", label: "白" },
            { baseId: "hatsu", label: "發" },
            { baseId: "chun", label: "中" }
        ];

        honors.forEach(honor => {
            for (let i = 1; i <= 4; i++) {
                this.tiles.push(
                    this.createTile(
                        honor.baseId,
                        "z",
                        0,
                        honor.label,
                        i
                    )
                );
            }
        });
    },

    createFlower() {
        const flowers = [
            { baseId: "spring", label: "春" },
            { baseId: "summer", label: "夏" },
            { baseId: "autumn", label: "秋" },
            { baseId: "winter", label: "冬" }
        ];

        flowers.forEach(flower => {
            this.tiles.push(
                this.createTile(
                    flower.baseId,
                    "f",
                    0,
                    flower.label,
                    1,
                    {
                        flower: true
                    }
                )
            );
        });
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