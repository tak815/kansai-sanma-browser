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

        const count = document.getElementById(`${seat}-hand-count`);
        if (count) count.textContent = "手牌：-枚";

        const discard = document.getElementById(`${seat}-discard`);
        if (discard) discard.innerHTML = "";
    },

    renderSeatName(seat, player) {
        const label = seat === "east"
            ? `${player.seatWind}家（自分）`
            : `${player.seatWind}家`;

        document.getElementById(`${seat}-name`).textContent = label;
    },

    renderHandCount(seat, player) {
        const element = document.getElementById(`${seat}-hand-count`);
        if (!element) return;

        element.textContent = `手牌：${player.hand.length}枚`;
    },

    renderSelfHand(game, player) {
        const hand = document.getElementById("hand");
        hand.innerHTML = "";

        const canDiscard = game.isSelfTurn();

        player.hand.forEach((tile, index) => {
            const div = document.createElement("div");
            div.className = canDiscard ? "tile" : "tile disabled";
            div.innerHTML = TileImage.getTileHtml(tile);

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
        if (!area) return;

        area.innerHTML = "";

        player.discards.forEach(tile => {
            const div = document.createElement("div");
            div.className = "discard-tile";
            div.innerHTML = TileImage.getTileHtml(tile);
            area.appendChild(div);
        });
    },

    renderInfo(game) {
        document.getElementById("round-name").textContent = game.roundName;
        document.getElementById("center-round").textContent = game.roundName;

        document.getElementById("dealer-display").textContent =
            `親：${game.seatLabel(game.dealerSeat)}`;

        document.getElementById("turn-display").textContent =
            `手番：${game.currentPlayer().seatWind}家`;

        document.getElementById("wall-count").textContent = Wall.count();
        document.getElementById("game-status").textContent = game.status;
    }
};