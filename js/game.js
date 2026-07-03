"use strict";

/*
    game.js
    ゲーム進行管理
*/

const Game = {

    version: "0.3",

    playerHand: [],

    start() {
        Wall.create();

        this.playerHand = [];

        for (let i = 0; i < 13; i++) {
            this.playerHand.push(Wall.draw());
        }

        this.render();
    },

    render() {
        const hand = document.getElementById("hand");
        const wallCount = document.getElementById("wall-count");
        const gameStatus = document.getElementById("game-status");

        hand.innerHTML = "";

        this.playerHand.forEach(tile => {
            const div = document.createElement("div");
            div.className = "tile";
            div.textContent = tile.label;
            hand.appendChild(div);
        });

        wallCount.textContent = Wall.count();
        gameStatus.textContent = "配牌完了";
    }

};