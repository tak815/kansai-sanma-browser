"use strict";

/*
    tileImage.js
    牌画像管理
*/

const TileImage = {

    // false = 開発中（文字表示）
    // true = 画像表示
    useImages: false,

    // "dev" または "release"
    imageSet: "dev",

    getTileHtml(tile) {

        if (!tile) {
            return "";
        }

        if (!this.useImages) {
            return `<span class="tile-text">${tile.label}</span>`;
        }

        return `
            <img
                src="${this.getImagePath(tile)}"
                class="tile-image"
                alt="${tile.label}"
                draggable="false"
            >
        `;
    },

    getImageRoot() {

        if (this.imageSet === "dev") {
            return "images/tiles-dev";
        }

        return "images/tiles";
    },

    getImagePath(tile) {

        const root = this.getImageRoot();

        switch (tile.suit) {

            case "m":
                return `${root}/man/${tile.baseId}.png`;

            case "p":
                return `${root}/pin/${tile.baseId}.png`;

            case "s":
                return `${root}/sou/${tile.baseId}.png`;

            case "z":
                return `${root}/honor/${tile.baseId}.png`;

            case "f":
                return `${root}/flower/${tile.baseId}.png`;

            default:
                return `${root}/back/back.png`;
        }
    },

    getBackImage() {

        return `${this.getImageRoot()}/back/back.png`;

    }

};