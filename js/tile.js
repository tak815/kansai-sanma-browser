"use strict";

/*
    tile.js
    牌データ
*/

class Tile {

    constructor(suit, number, label) {

        this.suit = suit;

        this.number = number;

        this.label = label;

        this.id = `${suit}${number}${label}`;

    }

}