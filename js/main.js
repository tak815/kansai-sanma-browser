"use strict";

window.onload = () => {
    console.log("関西三麻ブラウザゲーム v0.4");

    Game.start();

    document.getElementById("draw-button").addEventListener("click", () => {
        Game.drawTile();
    });
};