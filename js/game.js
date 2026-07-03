"use strict";

const Game = {
    version: "0.4",
    selfPlayer: null,
    status: "準備中",

    start() {
        Wall.create();

        this.selfPlayer = new Player("自家");
        this.status = "配牌中";

        for (let i = 0; i < 13; i++) {
            this.selfPlayer.draw(Wall.draw());
        }

        this.status = "ツモ待ち";
        UI.render(this);
    },

    drawTile() {
        if (this.selfPlayer.hand.length >= 14) {
            this.status = "先に1枚打牌してください";
            UI.render(this);
            return;
        }

        this.selfPlayer.draw(Wall.draw());
        this.status = "打牌してください";
        UI.render(this);
    },

    discard(index) {
        if (this.selfPlayer.hand.length <= 13) {
            this.status = "先にツモしてください";
            UI.render(this);
            return;
        }

        this.selfPlayer.discard(index);
        this.status = "ツモ待ち";
        UI.render(this);
    }
};