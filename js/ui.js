"use strict";

const UI = {
    render(game) {
        this.renderHand(game.selfPlayer);
        this.renderDiscards(game.selfPlayer, "self-discard");
        this.renderInfo(game);
    },

    renderHand(player) {
        const hand = document.getElementById("hand");
        hand.innerHTML = "";

        player.hand.forEach((tile, index) => {
            const div = document.createElement("div");
            div.className = "tile";
            div.textContent = tile.label;

            div.addEventListener("click", () => {
                Game.discard(index);
            });

            hand.appendChild(div);
        });
    },

    renderDiscards(player, elementId) {
        const area = document.getElementById(elementId);
        area.innerHTML = "";

        player.discards.forEach(tile => {
            const div = document.createElement("div");
            div.className = "discard-tile";
            div.textContent = tile.label;
            area.appendChild(div);
        });
    },

    renderInfo(game) {
        document.getElementById("wall-count").textContent = Wall.count();
        document.getElementById("game-status").textContent = game.status;
    }
};