"use strict";

const UI = {
    render(game) {
        this.renderSeat(game, "east");
        this.renderSeat(game, "south");
        this.renderSeat(game, "west");
        this.renderSeat(game, "north");
        this.renderInfo(game);
    },

    renderSeat(game, seat) {
        const player = game.seats[seat];

        if (!player) {
            this.renderEmptySeat(seat);
            return;
        }

        this.renderSeatName(seat, player);
        this.renderHandCount(seat, player);
        this.renderDiscards(player, `${seat}-discard`);

        if (seat === "east") {
            this.renderSelfHand(game, player);
        }
    },

    renderEmptySeat(seat) {
        document.getElementById(`${seat}-name`).textContent = "空席";
        document.getElementById(`${seat}-hand-count`).textContent = "-";

        const discardArea = document.getElementById(`${seat}-discard`);
        discardArea.innerHTML = "";
    },

    renderSeatName(seat, player) {
        const label = seat === "east"
            ? `${player.seatWind}家（自分）`
            : `${player.seatWind}家`;

        document.getElementById(`${seat}-name`).textContent = label;
    },

    renderHandCount(seat, player) {
        const element = document.getElementById(`${seat}-hand-count`);

        if (element) {
            element.textContent = player.hand.length;
        }
    },

    renderSelfHand(game, player) {
        const hand = document.getElementById("hand");
        hand.innerHTML = "";

        const canDiscard = game.isSelfTurn();

        player.hand.forEach((tile, index) => {
            const div = document.createElement("div");
            div.className = canDiscard ? "tile" : "tile disabled";
            div.textContent = tile.label;

            if (canDiscard) {
                div.addEventListener("click", () => {
                    Game.discard(index);
                });
            }

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
        document.getElementById("empty-seat").textContent = game.emptySeatLabel();
        document.getElementById("turn-player").textContent = game.currentPlayer().seatWind + "家";
        document.getElementById("wall-count").textContent = Wall.count();
        document.getElementById("game-status").textContent = game.status;
    }
};