"use strict";

/*
    tileImage.js
    牌画像管理
*/

const TileImage = {

    // 開発中は false（文字表示）
    // 画像を入れたら true に変更
    useImages: false,

    getTileHtml(tile) {

        if (!this.useImages) {
            return tile.label;
        }

        const img = this.getImagePath(tile);

        return `<img src="${img}" class="tile-image">`;

    },

    getImagePath(tile) {

        switch (tile.suit) {

            case "m":
                return `images/tiles/man/${tile.number}m.png`;

            case "p":
                return `images/tiles/pin/${tile.number}p.png`;

            case "s":
                return `images/tiles/sou/${tile.number}s.png`;

            case "z":

                switch (tile.label) {

                    case "東":
                        return "images/tiles/honor/east.png";

                    case "南":
                        return "images/tiles/honor/south.png";

                    case "西":
                        return "images/tiles/honor/west.png";

                    case "北":
                        return "images/tiles/honor/north.png";

                    case "白":
                        return "images/tiles/honor/haku.png";

                    case "發":
                        return "images/tiles/honor/hatsu.png";

                    case "中":
                        return "images/tiles/honor/chun.png";
                }

                break;

            case "f":

                switch (tile.label) {

                    case "春":
                        return "images/tiles/flower/spring.png";

                    case "夏":
                        return "images/tiles/flower/summer.png";

                    case "秋":
                        return "images/tiles/flower/autumn.png";

                    case "冬":
                        return "images/tiles/flower/winter.png";
                }

                break;
        }

        return "";

    }

};