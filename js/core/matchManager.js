const FINAL_ROUND_WIND="南";
const FINAL_HAND_NUMBER=3;

function createInitialGameState(){
  return {
    version:"v0.3.13-6",
    roundWind:"東",
    handNumber:1,
    returnEast:false,
    honba:0,
    deposit:0,
    dealer:"east",
    currentSeat:"east",
    turnIndex:0,
    phase:GamePhase.INIT,
    turnCount:0,
    started:false,
    hands:{east:[],south:[],west:[]},
    rivers:{east:[],south:[],west:[]},
    melds:{east:[],south:[],west:[]},
    flowers:{east:[],south:[],west:[]},
    riichi:{east:false,south:false,west:false},
    pendingRiichiDiscard:null,
    furiten:{east:false,south:false,west:false},
    points:{east:35000,south:35000,west:35000},
    lastSettlement:null,
    nextRound:null,
    gameEnded:false,
    matchResult:null,
    kanCount:0,
    pendingSuukan:false,
    agariYameAvailable:false,
    agariYameWinner:null,
    stats:createMatchStats()
  };
}

function carryIntoNewGameState(carry){
  const next=createInitialGameState();
  if(!carry)return next;
  next.roundWind=carry.roundWind || next.roundWind;
  next.handNumber=carry.handNumber || next.handNumber;
  next.returnEast=!!carry.returnEast;
  next.honba=carry.honba || 0;
  next.deposit=carry.deposit || 0;
  next.dealer=carry.dealer || next.dealer;
  next.currentSeat=next.dealer;
  next.turnIndex=SEATS.indexOf(next.currentSeat);
  next.points=Object.assign({}, carry.points || next.points);
  if(carry.stats)next.stats=normalizeMatchStats(carry.stats);
  return next;
}

function nextSeatOf(seat){return SEATS[(SEATS.indexOf(seat)+1)%SEATS.length] || "east";}
function advanceRoundPosition(roundWind, handNumber, returnEast=false){
  let h=handNumber+1;
  let w=roundWind;
  let returning=!!returnEast;
  if(h>3){
    h=1;
    if(returning){
      w="東"; // 返り東は誰かが40000点を超えるまで東1〜3局を循環
    }else if(roundWind==="東"){
      w="南"; // 東3局終了後は南1局
    }else{
      w="東";
      returning=true; // 南3局終了時に40000点超えがいなければ返り東
    }
  }
  return {roundWind:w,handNumber:h,returnEast:returning};
}

function isSouthAllLast(){return !gameState.returnEast&&gameState.roundWind===FINAL_ROUND_WIND&&gameState.handNumber===FINAL_HAND_NUMBER;}
function topPlayerPoints(){return Math.max(...SEATS.map(seat=>gameState.points[seat]));}
function hasPlayerOverReturnPoint(){return topPlayerPoints()>=40000;}
function shouldEndMatchAfterHand(dealerContinues){
  // 返り東は、局終了時点で1位が40000点以上なら終了。未満なら返り東継続。
  if(gameState.returnEast&&hasPlayerOverReturnPoint())return true;
  // 南3局で親が継続しない場合、1位が40000点以上なら終了。未満なら返り東へ。
  if(isSouthAllLast()&&!dealerContinues&&hasPlayerOverReturnPoint())return true;
  return false;
}
function getBustedSeat(){return SEATS.find(seat=>gameState.points[seat]<=0)||null;}
function isTopSeat(seat){const max=Math.max(...SEATS.map(s=>gameState.points[s]));return gameState.points[seat]===max;}
function canOfferAgariYame(winner){return isSouthAllLast()&&winner===gameState.dealer&&isTopSeat(winner);}
function clearAgariYameChoice(){gameState.agariYameAvailable=false;gameState.agariYameWinner=null;}
function finishForBustIfNeeded(extraReason=""){
  const busted=getBustedSeat();
  if(!busted)return false;
  clearAgariYameChoice();
  finishMatch(`${SEAT_LABELS[busted]}が0点以下${extraReason?`（${extraReason}）`:""}のためトビ終了`);
  return true;
}
function handlePostAgariMatchDecision(winner,normalEndReason){
  if(finishForBustIfNeeded("箱下計算を反映"))return;
  if(canOfferAgariYame(winner)){
    if(winner===PLAYER_SEAT){
      gameState.agariYameAvailable=true;
      gameState.agariYameWinner=winner;
      log("オーラス親トップ和了：上がりやめ、または連荘続行を選択してください");
      return;
    }
    finishMatch("南3局 CPU親トップの上がりやめ");
    return;
  }
  clearAgariYameChoice();
  if(!gameState.nextRound)finishMatch(normalEndReason);
}

function makeMatchResult(reason){
  const ranked=SEATS.slice().sort((a,b)=>{
    const diff=gameState.points[b]-gameState.points[a];
    return diff!==0?diff:SEATS.indexOf(a)-SEATS.indexOf(b);
  });
  return {reason,ranking:ranked.map((seat,index)=>({rank:index+1,seat,points:gameState.points[seat]}))};
}

function finishMatch(reason){
  clearAgariYameChoice();
  gameState.nextRound=null;
  gameState.gameEnded=true;
  gameState.started=false;
  canDiscard=false;
  const busted=getBustedSeat();
  if(busted){const stats=ensureStats();stats.busted[busted]=(stats.busted[busted]||0)+1;}
  gameState.matchResult=makeMatchResult(reason);
  persistCompletedMatch();
  recordReplayEvent("match_end",`対局終了：${reason}`);
  saveReplayHistory();
  log(`対局終了：${reason} / ${matchResultText()}`);
}

function makeNextRoundCarryAfterAgari(win){
  const dealerWon=win.winner===gameState.dealer;
  if(shouldEndMatchAfterHand(dealerWon))return null;
  const pos=dealerWon
    ? {roundWind:gameState.roundWind,handNumber:gameState.handNumber,returnEast:gameState.returnEast}
    : advanceRoundPosition(gameState.roundWind,gameState.handNumber,gameState.returnEast);
  return {
    roundWind:pos.roundWind, handNumber:pos.handNumber, returnEast:!!pos.returnEast,
    honba:dealerWon?(gameState.honba+1):0, deposit:0,
    dealer:dealerWon?gameState.dealer:nextSeatOf(gameState.dealer),
    points:Object.assign({},gameState.points), stats:JSON.parse(JSON.stringify(ensureStats()))
  };
}
function makeNextRoundCarryAfterRyukyoku(tenpaiMap=null){
  const dealerTenpai=tenpaiMap ? !!tenpaiMap[gameState.dealer] : true;
  if(shouldEndMatchAfterHand(dealerTenpai))return null;
  const pos=dealerTenpai
    ? {roundWind:gameState.roundWind,handNumber:gameState.handNumber,returnEast:gameState.returnEast}
    : advanceRoundPosition(gameState.roundWind,gameState.handNumber,gameState.returnEast);
  return {
    roundWind:pos.roundWind, handNumber:pos.handNumber, returnEast:!!pos.returnEast,
    honba:(gameState.honba||0)+1, deposit:gameState.deposit||0,
    dealer:dealerTenpai?gameState.dealer:nextSeatOf(gameState.dealer),
    points:Object.assign({},gameState.points), stats:JSON.parse(JSON.stringify(ensureStats())), ryukyokuDealerTenpai:dealerTenpai
  };
}

function dealAllPlayers(){SEATS.forEach(seat=>{gameState.hands[seat]=[];gameState.rivers[seat]=[];gameState.melds[seat]=[];gameState.flowers[seat]=[];});for(let i=0;i<13;i++){SEATS.forEach(seat=>gameState.hands[seat].push(wall.pop()));}SEATS.forEach(sortSeatHand);canDiscard=false;lastDraw=null;}
function newGame(){GameController.startRound();}
function startNextRound(){
  if(!gameState.nextRound){alert("次局へ進める状態ではありません");return;}
  const carry=gameState.nextRound;
  GameController.startRound(carry);
}
function restartMatch(){
  if(currentReplay&&currentReplay.events.length){recordReplayEvent("restart","対局を最初から");saveReplayHistory();}
  clearAiTimer();
  pendingWin=null;
  riichiDeclared=false;
  debugAiPaused=false;
  gameState=createInitialGameState();
  bindPlayerAliases();
  newGame();
  log("新しい対局を開始しました：東1局・全員35000点");
  render();
}
