"use strict";

const Game = {
    version: "0.7",

    seatOrder: ["east", "south", "west", "north"],
    seats: {
        east: null,
        south: null,
        west: null,
        north: null
    },

    dealerSeat: "east",
    emptySeat: "south",
    turnSeat: "east",
    roundName: "東1局",
    status: "準備中",

    start() {
        Wall.create();

        this.dealerSeat = "east";
        this.emptySeat = this.decideEmptySeat();
        this.turnSeat = this.dealerSeat;
        this.roundName = "東1局";

        this.createPlayers();
        this.dealInitialHands();

        this.currentPlayer().draw(Wall.draw());

        this.status = `${this.seatLabel(this.turnSeat)}の手番です。牌をクリックして打牌してください。`;
        UI.render(this);
    },

    createPlayers() {
        this.seats = {
            east: new Player("自分", "human", "東"),
            south: null,
            west: null,
            north: null
        };

        if (this.emptySeat !== "south") {
            this.seats.south = new Player("CPU南", "cpu", "南");
        }

        if (this.emptySeat !== "west") {
            this.seats.west = new Player("CPU西", "cpu", "西");
        }

        if (this.emptySeat !== "north") {
            this.seats.north = new Player("CPU北", "cpu", "北");
        }
    },

    dealInitialHands() {
        this.status = "配牌中";

        for (let i = 0; i < 13; i++) {
            this.activePlayers().forEach(player => {
                player.draw(Wall.draw());
            });
        }
    },

    decideEmptySeat() {
        if (Rules.emptySeat !== "random") {
            return Rules.emptySeat;
        }

        const candidates = Rules.getEmptySeatCandidates();
        const index = Math.floor(Math.random() * candidates.length);
        return candidates[index];
    },

    activePlayers() {
        return this.seatOrder
            .map(seat => this.seats[seat])
            .filter(player => player !== null);
    },

    currentPlayer() {
        return this.seats[this.turnSeat];
    },

    isSelfTurn() {
        return this.turnSeat === "east";
    },

    discard(index) {
        if (!this.isSelfTurn()) {
            return;
        }

        this.currentPlayer().discard(index);
        this.moveToNextTurn();
    },

    moveToNextTurn() {
        this.turnSeat = this.nextActiveSeat(this.turnSeat);

        if (this.isSelfTurn()) {
            this.selfTurn();
            return;
        }

        this.cpuTurn();
    },

    nextActiveSeat(currentSeat) {
        let currentIndex = this.seatOrder.indexOf(currentSeat);

        while (true) {
            currentIndex = (currentIndex + 1) % this.seatOrder.length;
            const nextSeat = this.seatOrder[currentIndex];

            if (this.seats[nextSeat]) {
                return nextSeat;
            }
        }
    },

    selfTurn() {
        const tile = Wall.draw();

        if (!tile) {
            this.endDraw();
            return;
        }

        this.currentPlayer().draw(tile);
        this.status = `${this.seatLabel(this.turnSeat)}の手番です。牌をクリックして打牌してください。`;
        UI.render(this);
    },

    cpuTurn() {
        const player = this.currentPlayer();

        this.status = `${player.seatWind}家がツモしています...`;
        UI.render(this);

        setTimeout(() => {
            const tile = Wall.draw();

            if (!tile) {
                this.endDraw();
                return;
            }

            player.draw(tile);
            player.randomDiscard();

            this.status = `${player.seatWind}家が打牌しました`;
            UI.render(this);

            setTimeout(() => {
                this.moveToNextTurn();
            }, 600);

        }, 600);
    },

    endDraw() {
        this.status = "流局：山がありません";
        UI.render(this);
    },

    emptySeatLabel() {
        return this.seatLabel(this.emptySeat);
    },

    seatLabel(seat) {
        const labels = {
            east: "東家",
            south: "南家",
            west: "西家",
            north: "北家"
        };

        return labels[seat];
    }
};