"use strict";

class Player {
    constructor(name) {
        this.name = name;
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
}