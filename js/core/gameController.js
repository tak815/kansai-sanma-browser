const GamePhase=Object.freeze({INIT:"INIT",DEAL:"DEAL",DRAW:"DRAW",ACTION:"ACTION",DISCARD:"DISCARD",NEXT_PLAYER:"NEXT_PLAYER",AGARI:"AGARI",RYUKYOKU:"RYUKYOKU"});

const TurnManager={
  current(){return gameState.currentSeat;},
  isPlayer(){return gameState.currentSeat===PLAYER_SEAT;},
  advance(){gameState.turnIndex=(gameState.turnIndex+1)%SEATS.length;gameState.currentSeat=SEATS[gameState.turnIndex];gameState.turnCount+=1;return gameState.currentSeat;}
};

const GameController={
  setPhase(phase){gameState.phase=phase;},
  startRound(carry=null){
    clearAiTimer();
    createWall();
    gameState=carryIntoNewGameState(carry);
    ensureStats().handsPlayed+=1;
    this.setPhase(GamePhase.DEAL);
    dealAllPlayers();
    bindPlayerAliases();
    gameState.started=true;
    gameState.currentSeat=gameState.dealer;
    gameState.turnIndex=SEATS.indexOf(gameState.currentSeat);
    this.setPhase(GamePhase.DRAW);
    debugAiPaused=false;
    pendingWin=null;
    canDiscard=false;
    lastDraw=null;
    beginReplayRecording();
    log(`v0.3.15-5：${roundLabelText()} ${gameState.honba}本場 / 親${SEAT_LABELS[gameState.dealer]}で開始しました`);
    render();
    scheduleCurrentTurnDraw();
  },
  drawForCurrentSeat(){
    clearAiTimer();
    if(!gameState.started||pendingWin||canDiscard||gameState.phase!==GamePhase.DRAW)return;
    if(wall.length===0){this.endByRyukyoku();return;}
    const seat=TurnManager.current();
    const t=wall.pop();
    gameState.hands[seat].push(t);
    lastDraw=t;
    sortSeatHand(seat);
    canDiscard=true;
    this.setPhase(GamePhase.ACTION);
    log(`${SEAT_LABELS[seat]} ツモ：${TurnManager.isPlayer()?t:"牌"}`);
    recordReplayEvent("draw",`${SEAT_LABELS[seat]} ツモ`,{seat,tile:t});
    playSound("draw");
    if(!TurnManager.isPlayer()){
      autoNukiFlowersForSeat(seat);
      sortSeatHand(seat);
    }
    if(checkTsumoWinAfterDraw(seat)){render();return;}
    render();
    if(!TurnManager.isPlayer())scheduleAiDiscard();
  },
  discardFromSeat(seat,index){
    if(!gameState.started||seat!==TurnManager.current()||!canDiscard)return false;
    const tiles=gameState.hands[seat];
    if(index<0||index>=tiles.length)return false;
    if(FLOWERS.has(tiles[index])){
      if(TurnManager.isPlayer())alert("花牌は空気牌のため捨てられません。抜き花してください。");
      return false;
    }
    if(gameState.riichi[seat] && gameState.pendingRiichiDiscard!==seat && lastDraw && tiles[index]!==lastDraw){
      if(TurnManager.isPlayer())alert("リーチ後はツモ切りのみです。");
      return false;
    }
    const t=tiles.splice(index,1)[0];
    const riverTile={tile:t,riichi:false};
    const commitsRiichi=gameState.pendingRiichiDiscard===seat;
    if(commitsRiichi){
      riverTile.riichi=true;
      gameState.pendingRiichiDiscard=null;
      gameState.riichi[seat]=true;
      gameState.deposit+=1;
      gameState.points[seat]-=1000;
      if(seat===PLAYER_SEAT)riichiDeclared=true;
    }
    gameState.rivers[seat].push(riverTile);
    const isTsumogiri=lastDraw===t;
    playSound(isTsumogiri?"discard_drawn":"discard");
    if(commitsRiichi){
      showCall("リーチ","riichi");
      log(`${SEAT_LABELS[seat]} リーチ成立：1000点を供託へ`);
    }
    lastDraw=null;
    canDiscard=false;
    this.setPhase(GamePhase.DISCARD);
    log(`${SEAT_LABELS[seat]} 打牌：${TurnManager.isPlayer()?t:"牌"}`);
    recordReplayEvent(commitsRiichi?"riichi_discard":"discard",`${SEAT_LABELS[seat]} ${commitsRiichi?"リーチ打牌":"打牌"} ${t}`,{seat,tile:t,riichi:commitsRiichi});
    if(handleClaimsAfterDiscard(seat,t)){render();return true;}
    if(gameState.pendingSuukan){
      gameState.pendingSuukan=false;
      log("四槓流れ：4つ目のカン後の打牌にロンがなかったため流局");
      this.endByRyukyoku();
      return true;
    }
    this.gotoNextPlayer();
    return true;
  },
  gotoNextPlayer(){
    this.setPhase(GamePhase.NEXT_PLAYER);
    TurnManager.advance();
    if(wall.length===0){this.endByRyukyoku();return;}
    this.setPhase(GamePhase.DRAW);
    render();
    scheduleCurrentTurnDraw();
  },
  endByRyukyoku(tenpaiMap=null){
    const map=tenpaiMap || currentTenpaiMap();
    const deltas=applyRyukyokuNotenPayment(map);
    gameState.started=false;
    canDiscard=false;
    pendingWin=null;
    this.setPhase(GamePhase.RYUKYOKU);
    gameState.nextRound=makeNextRoundCarryAfterRyukyoku(map);
    gameState.gameEnded=true;
    const dealerText=map[gameState.dealer]?"親テンパイ連荘":"親ノーテン親流れ";
    recordReplayEvent("ryukyoku","流局",{tenpaiMap:map,deltas});
    saveReplayHistory();
    log(`流局：${ryukyokuTenpaiText(map)} / ${dealerText} / ノーテン罰符 ${deltaSummary(deltas)}`);
    if(finishForBustIfNeeded("ノーテン罰符")){render();return;}
    if(gameState.nextRound){
      log(`次局準備：${roundLabelText(gameState.nextRound)} ${gameState.nextRound.honba}本場 / 親${SEAT_LABELS[gameState.nextRound.dealer]} / 供託${gameState.nextRound.deposit} / 現在点 ${pointText()}`);
    }else{finishMatch(gameState.returnEast?"返り東で40000点超え":"南3局終了時に40000点超え");}
    render();
  }
};
