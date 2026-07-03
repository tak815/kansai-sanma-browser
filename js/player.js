"use strict";

class Player {
    constructor(name, type, seatWind) {
        this.name = name;
        this.type = type;
        this.seatWind = seatWind;
        this.hand = [];
        this.discards = [];
    }

    draw(tile) {
        if (tile) {
            this.hand.push(tile);
        }
    }

    discard(index) {
        const discarded = this.hand.splice(index, 1)[0];

        if (discarded) {
            this.discards.push(discarded);
        }

        return discarded;
    }

    randomDiscard() {
        const index = Math.floor(Math.random() * this.hand.length);
        return this.discard(index);
    }
}