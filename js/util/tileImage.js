"use strict";

/*
    TileImage.js
    開発用SVG牌画像 + 将来PNG対応
*/

const TileImage = {
    useImages: true,

    imageSet: "svg-dev", // svg-dev / dev / release

    getTileHtml(tile) {
        if (!tile) return "";

        return `
            <img
                src="${this.getImageSrc(tile)}"
                class="tile-image"
                alt="${tile.label}"
                draggable="false"
            >
        `;
    },

    getImageSrc(tile) {
        if (this.imageSet === "svg-dev") {
            return this.createSvgTile(tile);
        }

        return this.getPngPath(tile);
    },

    getPngRoot() {
        return this.imageSet === "dev"
            ? "images/tiles-dev"
            : "images/tiles";
    },

    getPngPath(tile) {
        const root = this.getPngRoot();

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

    createSvgTile(tile) {
        const textColor = this.getTextColor(tile);
        const subText = tile.red ? "赤" : tile.flower ? "花" : "";

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="108" height="156" viewBox="0 0 108 156">
                <rect x="4" y="4" width="100" height="148" rx="10" fill="#f8f3e8" stroke="#d8d0bf" stroke-width="4"/>
                <rect x="10" y="10" width="88" height="136" rx="7" fill="#fffdf6"/>
                <text x="54" y="82" text-anchor="middle" dominant-baseline="middle"
                      font-size="42" font-family="Arial, sans-serif" font-weight="bold"
                      fill="${textColor}">
                    ${tile.label}
                </text>
                <text x="54" y="122" text-anchor="middle"
                      font-size="18" font-family="Arial, sans-serif"
                      fill="${textColor}">
                    ${subText}
                </text>
            </svg>
        `;

        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    },

    getTextColor(tile) {
        if (tile.red) {
            return "#d40000";
        }

        if (tile.flower) {
            return "#d28b18";
        }

        if (tile.suit === "p") {
            return "#1b4f9c";
        }

        if (tile.suit === "s") {
            return "#188a42";
        }

        if (tile.suit === "z") {
            if (tile.label === "中") return "#d40000";
            if (tile.label === "發") return "#188a42";
            return "#111111";
        }

        return "#111111";
    }
};