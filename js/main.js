"use strict";

/*
    関西三麻ブラウザゲーム
    Version 0.2
*/

const game = {

    version: "0.2",

    hand: []

};

function createSampleHand(){

    const tiles = [

        "1m",
        "2m",
        "3m",

        "5p",
        "5p",

        "7p",

        "2s",
        "3s",
        "4s",

        "東",
        "白",
        "發",
        "中"

    ];

    game.hand = tiles;

}

function drawHand(){

    const hand = document.getElementById("hand");

    hand.innerHTML="";

    game.hand.forEach(tile=>{

        const div=document.createElement("div");

        div.className="tile";

        div.textContent=tile;

        hand.appendChild(div);

    });

}

function startGame(){

    createSampleHand();

    drawHand();

    console.log("関西三麻ブラウザゲーム v0.2");

}

window.onload=startGame;