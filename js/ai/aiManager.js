const AI_THINK_MS=420;
const PLAYER_AUTO_DRAW_MS=220;

let aiTimerId=null,debugAiPaused=false,cpuDecisionText="待機中",autoTurnProgress=true;

function clearAiTimer(){if(aiTimerId!==null){window.clearTimeout(aiTimerId);aiTimerId=null;}}
function scheduleCurrentTurnDraw(){
  clearAiTimer();
  if(!autoTurnProgress||!gameState.started||pendingWin||canDiscard||gameState.phase!==GamePhase.DRAW)return;
  if(debugAiPaused&&!TurnManager.isPlayer()){log("AI停止中：CPUツモを保留しています");render();return;}
  const wait=TurnManager.isPlayer()?PLAYER_AUTO_DRAW_MS:AI_THINK_MS;
  aiTimerId=window.setTimeout(()=>GameController.drawForCurrentSeat(),wait);
}
function scheduleAiDraw(){scheduleCurrentTurnDraw();}

function aiTileDoraValue(tile){
  let value=0;
  doraIndicators.forEach(ind=>{
    if(FLOWERS.has(ind)){if(FLOWERS.has(tile))value+=1;}
    else if(DORA_NEXT[ind]===tile)value+=1;
  });
  return value;
}
function aiTileShapeValue(hand,tile){
  if(FLOWERS.has(tile))return -100;
  let value=0;
  const same=hand.filter(t=>t===tile).length;
  if(same>=2)value+=2.2;
  if(same>=3)value+=1.2;
  const m=tile.match(/^([1-9])([ps])$/);
  if(m){
    const n=Number(m[1]), suit=m[2];
    const has=x=>hand.includes(`${x}${suit}`);
    if(has(n-1))value+=1.1;if(has(n+1))value+=1.1;
    if(has(n-2))value+=0.55;if(has(n+2))value+=0.55;
    if(n>=3&&n<=7)value+=0.25;
    if(n===1||n===9)value-=0.2;
  }else{
    // 字牌は対子・刻子でなければ比較的切りやすい。
    if(same===1)value-=0.7;
  }
  return value;
}
function aiImprovementCount(seat,baseShanten){
  const handRef=gameState.hands[seat];
  let count=0;
  SHANTEN_TILES.forEach(tile=>{
    const owned=handRef.filter(t=>t===tile).length;
    if(owned>=4)return;
    handRef.push(tile);
    const next=calcShantenInfo(seat).shanten;
    handRef.pop();
    if(next<baseShanten)count+=(4-owned);
  });
  return count;
}
function riichiOpponents(seat){return SEATS.filter(s=>s!==seat&&gameState.riichi[s]);}
function riverValues(seat){return (gameState.rivers[seat]||[]).map(tileValue);}
function isSuited(tile){return /^[1-9][ps]$/.test(tile);}
function tileNumber(tile){return isSuited(tile)?Number(tile[0]):null;}
function tileSuit(tile){return isSuited(tile)?tile[1]:null;}
function isGenbutsu(tile,opponent){return riverValues(opponent).includes(tile);}
function isSujiSafe(tile,opponent){
  if(!isSuited(tile))return false;
  const n=tileNumber(tile),suit=tileSuit(tile),r=new Set(riverValues(opponent));
  const pairs=[];
  if(n<=3)pairs.push(n+3);
  if(n>=7)pairs.push(n-3);
  if(n>=4&&n<=6){pairs.push(n-3,n+3);}
  return pairs.some(x=>r.has(String(x)+suit));
}
function visibleTileCount(tile){
  let n=0;
  SEATS.forEach(s=>{n+=riverValues(s).filter(t=>t===tile).length;n+=(gameState.melds[s]||[]).flatMap(m=>m.tiles||[]).filter(t=>t===tile).length;n+=(gameState.flowers[s]||[]).filter(t=>t===tile).length;});
  n+=doraIndicators.filter(t=>t===tile).length;
  return n;
}
function aiSafetyScore(tile,seat){
  const opponents=riichiOpponents(seat);
  if(!opponents.length)return {score:0,label:""};
  let total=0;let labels=[];
  opponents.forEach(op=>{
    if(isGenbutsu(tile,op)){total+=1000;labels.push(`${SEAT_LABELS[op]}現物`);return;}
    if(isHonor(tile)){
      const seen=visibleTileCount(tile);
      total+=seen>=3?650:seen===2?380:seen===1?170:40;
      labels.push(seen>=2?`字牌${seen}枚見え`:"字牌");
      return;
    }
    if(isSujiSafe(tile,op)){total+=230;labels.push(`${SEAT_LABELS[op]}筋`);}
    const seen=visibleTileCount(tile);
    if(seen>=3){total+=180;labels.push("ワンチャンス相当");}
  });
  return {score:total,label:[...new Set(labels)].join("・")};
}
function aiAttackValue(seat){
  const info=calcShantenInfo(seat);
  const dora=summarizeDoraTiles(doraTilesForSeat(seat),!!gameState.riichi[seat]).summary.total;
  const isDealer=seat===gameState.dealer;
  let value=(info.shanten===0?850:info.shanten===1?340:0)+(dora*150)+(isDealer?120:0);
  return {value,shanten:info.shanten,dora,isDealer};
}
function aiChooseDiscardIndex(seat){
  const tiles=gameState.hands[seat];
  if(gameState.riichi[seat]&&lastDraw){
    const drawnIndex=tiles.lastIndexOf(lastDraw);
    if(drawnIndex>=0&&!FLOWERS.has(tiles[drawnIndex]))return {index:drawnIndex,reason:"リーチ後ツモ切り"};
  }
  const opponents=riichiOpponents(seat);
  const attack=aiAttackValue(seat);
  const shouldFold=opponents.length>0 && attack.shanten>=2 && attack.dora<=1 && !attack.isDealer;
  const results=[];
  tiles.forEach((tile,index)=>{
    if(FLOWERS.has(tile))return;
    const removed=tiles.splice(index,1)[0];
    const info=calcShantenInfo(seat);
    const improvement=aiImprovementCount(seat,info.shanten);
    tiles.splice(index,0,removed);
    const dora=aiTileDoraValue(tile);
    const shape=aiTileShapeValue(tiles,tile);
    const safety=aiSafetyScore(tile,seat);
    const attackScore=(-info.shanten*1000)+(improvement*8)-(dora*110)-shape;
    const score=shouldFold?(safety.score*10)+(attackScore*0.15):attackScore+(safety.score*(opponents.length?0.5:0));
    results.push({index,tile,shanten:info.shanten,improvement,dora,shape,safety,score});
  });
  results.sort((a,b)=>b.score-a.score||a.index-b.index);
  const best=results[0];
  if(!best)return null;
  const mode=shouldFold?"ベタオリ":opponents.length?"押し":"通常";
  const safeText=best.safety.label?`・${best.safety.label}`:"";
  return {index:best.index,reason:`${mode} / ${shantenText(best.shanten)}・受入${best.improvement}${safeText}${best.dora?`・ドラ${best.dora}保持比較`:""}`,detail:best};
}
function canCpuDeclareRiichi(seat,picked){
  return !!picked && picked.detail && picked.detail.shanten===0
    && !gameState.riichi[seat]
    && (gameState.melds[seat]||[]).length===0
    && !hasFlowerInSeat(seat)
    && gameState.points[seat]>=1000;
}
function declareCpuRiichi(seat){
  gameState.pendingRiichiDiscard=seat;
  cpuDecisionText=`${SEAT_LABELS[seat]}：聴牌 → リーチ予定`;
  log(`${SEAT_LABELS[seat]} リーチ選択：宣言牌の打牌で成立します`);
}
function scheduleAiDiscard(){clearAiTimer();if(pendingWin)return;if(debugAiPaused){log("AI停止中：CPU打牌を保留しています");render();return;}aiTimerId=window.setTimeout(()=>{const seat=TurnManager.current();autoNukiFlowersForSeat(seat);if(tryCpuKanAfterDraw(seat)){render();return;}const candidates=gameState.hands[seat].filter(t=>!FLOWERS.has(t));if(!candidates.length){log(`${SEAT_LABELS[seat]}：打牌可能牌がないため流局扱い`);GameController.endByRyukyoku();return;}const picked=aiChooseDiscardIndex(seat);if(!picked){GameController.endByRyukyoku();return;}cpuDecisionText=`${SEAT_LABELS[seat]}：${picked.tile}切り / ${picked.reason}`;if(canCpuDeclareRiichi(seat,picked))declareCpuRiichi(seat);log(`${SEAT_LABELS[seat]} CPU判断：${picked.tile}切り / ${picked.reason}`);render();GameController.discardFromSeat(seat,picked.index);},AI_THINK_MS);}


function cpuKanCandidates(seat){
  if(seat===PLAYER_SEAT||!canRevealKanDora())return [];
  const tiles=gameState.hands[seat]||[];
  const counts={};tiles.forEach(t=>{if(!FLOWERS.has(t))counts[t]=(counts[t]||0)+1;});
  const out=[];
  Object.keys(counts).forEach(tile=>{if(counts[tile]>=4)out.push({kind:"暗槓",tile});});
  (gameState.melds[seat]||[]).forEach((m,meldIndex)=>{if(m.type==="ポン"&&counts[m.tile]>=1)out.push({kind:"加槓",tile:m.tile,meldIndex});});
  return out;
}
function cpuKanShantenAfter(seat,choice){
  const handTiles=gameState.hands[seat];
  const meldList=gameState.melds[seat];
  const removed=[];
  const need=choice.kind==="暗槓"?4:1;
  for(let i=handTiles.length-1;i>=0&&removed.length<need;i--){if(handTiles[i]===choice.tile)removed.push(handTiles.splice(i,1)[0]);}
  let oldMeld=null;
  if(choice.kind==="暗槓")meldList.push({type:"暗槓",tile:choice.tile,tiles:[choice.tile,choice.tile,choice.tile,choice.tile]});
  else {oldMeld={...meldList[choice.meldIndex],tiles:[...(meldList[choice.meldIndex].tiles||[])]};meldList[choice.meldIndex]={type:"加槓",tile:choice.tile,tiles:[choice.tile,choice.tile,choice.tile,choice.tile]};}
  let after=99;try{after=calcShantenInfo(seat).shanten;}catch(e){}
  if(choice.kind==="暗槓")meldList.pop();else meldList[choice.meldIndex]=oldMeld;
  handTiles.push(...removed);sortSeatHand(seat);
  return after;
}
function cpuKanDecision(seat,choice){
  if(!choice||!canRevealKanDora())return {ok:false,reason:"カンドラ確保不可"};
  let before=99;try{before=calcShantenInfo(seat).shanten;}catch(e){}
  const after=cpuKanShantenAfter(seat,choice);
  const tileDora=aiTileDoraValue(choice.tile);
  const valueHonor=isValueHonorForSeat(seat,choice.tile);
  if(gameState.riichi[seat]){
    const ok=choice.kind==="暗槓"&&before===0&&after===0;
    return {ok,reason:ok?"リーチ後・聴牌形維持":"リーチ後の待ち変化を避ける",before,after};
  }
  const improves=after<before;
  const keeps=after===before;
  const attack=before<=1||tileDora>0||valueHonor;
  const ok=improves||(keeps&&attack);
  return {ok,reason:improves?`${before}向聴→${after}向聴`:valueHonor?"役牌槓":tileDora?`ドラ${tileDora}枚を槓`:keeps&&attack?"好形・打点維持":"見送り",before,after};
}
function executeCpuKan(seat,choice,reason){
  if(!canRevealKanDora())return false;
  revealKanDora();
  const handTiles=gameState.hands[seat];
  if(choice.kind==="暗槓"){
    for(let n=0;n<4;n++){const idx=handTiles.indexOf(choice.tile);if(idx>=0)handTiles.splice(idx,1);}
    gameState.melds[seat].push({type:"暗槓",tile:choice.tile,tiles:[choice.tile,choice.tile,choice.tile,choice.tile]});
  }else{
    const idx=handTiles.indexOf(choice.tile);if(idx>=0)handTiles.splice(idx,1);
    const meld=gameState.melds[seat][choice.meldIndex];meld.type="加槓";meld.tiles=[choice.tile,choice.tile,choice.tile,choice.tile];
  }
  showCall("カン","kan");
  const drawn=takeRinshanForSeat(seat);
  autoNukiFlowersForSeat(seat);sortSeatHand(seat);
  canDiscard=true;lastDraw=drawn;gameState.phase=GamePhase.ACTION;
  cpuDecisionText=`${SEAT_LABELS[seat]}：${choice.tile}${choice.kind} / ${reason}`;
  log(`${SEAT_LABELS[seat]} CPU判断：${choice.tile}${choice.kind}（${reason}）→ 嶺上ツモ`);
  if(checkTsumoWinAfterDraw(seat))return true;
  scheduleAiDiscard();
  return true;
}
function tryCpuKanAfterDraw(seat){
  const choices=cpuKanCandidates(seat);
  for(const choice of choices){const d=cpuKanDecision(seat,choice);if(d.ok)return executeCpuKan(seat,choice,d.reason);}
  return false;
}
function cpuDaiminkanDecision(seat,tile){
  if(seat===PLAYER_SEAT||gameState.riichi[seat]||FLOWERS.has(tile)||!canRevealKanDora())return {ok:false,reason:"対象外"};
  const handTiles=gameState.hands[seat]||[];
  if(handTiles.filter(t=>t===tile).length<3)return {ok:false,reason:"同牌不足"};
  let before=99;try{before=calcShantenInfo(seat).shanten;}catch(e){}
  const removed=[];for(let i=handTiles.length-1;i>=0&&removed.length<3;i--){if(handTiles[i]===tile)removed.push(handTiles.splice(i,1)[0]);}
  gameState.melds[seat].push({type:"大明槓",tile,tiles:[tile,tile,tile,tile]});
  let after=99;try{after=calcShantenInfo(seat).shanten;}catch(e){}
  gameState.melds[seat].pop();handTiles.push(...removed);sortSeatHand(seat);
  const valueHonor=isValueHonorForSeat(seat,tile),dora=aiTileDoraValue(tile);
  const ok=after<before||(after===before&&(before<=1||valueHonor||dora>0));
  return {ok,reason:after<before?`${before}向聴→${after}向聴`:valueHonor?"役牌大明槓":dora?`ドラ${dora}枚の大明槓`:"向聴維持",before,after};
}
function tryCpuDaiminkanAfterDiscard(discardSeat,tile){
  for(const seat of cpuPonPriority(discardSeat)){
    const d=cpuDaiminkanDecision(seat,tile);if(!d.ok)continue;
    const handTiles=gameState.hands[seat];for(let n=0;n<3;n++){const idx=handTiles.indexOf(tile);if(idx>=0)handTiles.splice(idx,1);}
    gameState.melds[seat].push({type:"大明槓",tile,tiles:[tile,tile,tile,tile],from:discardSeat});
    gameState.rivers[discardSeat].pop();gameState.currentSeat=seat;gameState.turnIndex=SEATS.indexOf(seat);gameState.phase=GamePhase.ACTION;
    revealKanDora();showCall("カン","kan");const drawn=takeRinshanForSeat(seat);autoNukiFlowersForSeat(seat);sortSeatHand(seat);lastDraw=drawn;canDiscard=true;
    cpuDecisionText=`${SEAT_LABELS[seat]}：${tile}を大明槓 / ${d.reason}`;
    log(`${SEAT_LABELS[seat]} CPU判断：${SEAT_LABELS[discardSeat]}の${tile}を大明槓（${d.reason}）`);
    if(checkTsumoWinAfterDraw(seat)){render();return true;}scheduleAiDiscard();return true;
  }
  return false;
}


function isHonor(tile){return ["東","南","西","北","白","發","中"].includes(tile);}
function isValueHonorForSeat(seat,tile){
  if(["白","發","中"].includes(tile))return true;
  const seatWind={east:"東",south:"南",west:"西"}[seat];
  return tile===seatWind || tile===gameState.roundWind;
}
function cpuPonDecision(seat,tile){
  if(seat===PLAYER_SEAT||gameState.riichi[seat]||FLOWERS.has(tile))return {ok:false,reason:"対象外"};
  const handTiles=gameState.hands[seat];
  const matching=handTiles.reduce((n,t)=>n+(t===tile?1:0),0);
  if(matching<2)return {ok:false,reason:"同牌不足"};
  let before=99,after=99;
  try{before=calcShantenInfo(seat).shanten;}catch(e){}
  const removed=[];
  for(let i=handTiles.length-1;i>=0&&removed.length<2;i--){if(handTiles[i]===tile)removed.push(handTiles.splice(i,1)[0]);}
  gameState.melds[seat].push({type:"ポン",tile,tiles:[tile,tile,tile],from:"debug-check"});
  try{after=calcShantenInfo(seat).shanten;}catch(e){}
  gameState.melds[seat].pop();
  handTiles.push(...removed);sortSeatHand(seat);
  const counts={};handTiles.forEach(t=>counts[t]=(counts[t]||0)+1);
  const pairOrTripletCount=Object.values(counts).filter(v=>v>=2).length+(gameState.melds[seat]||[]).length;
  const suits=new Set(handTiles.map(suitOf).filter(Boolean));
  const honitsuDirection=suits.size<=1 && handTiles.some(isHonor);
  const valueHonor=isValueHonorForSeat(seat,tile);
  const improves=after<before;
  const toitoiDirection=pairOrTripletCount>=4;
  const ok=valueHonor||improves||toitoiDirection||honitsuDirection;
  let reason=valueHonor?"役牌":improves?`${before}向聴→${after}向聴`:toitoiDirection?"トイトイ方向":honitsuDirection?"ホンイツ方向":"見送り";
  return {ok,reason,before,after};
}
function cpuPonPriority(discardSeat){
  const start=SEATS.indexOf(discardSeat);
  return [1,2].map(n=>SEATS[(start+n)%SEATS.length]).filter(seat=>seat!==PLAYER_SEAT);
}
function tryCpuPonAfterDiscard(discardSeat,tile){
  for(const seat of cpuPonPriority(discardSeat)){
    const decision=cpuPonDecision(seat,tile);
    if(!decision.ok)continue;
    const handTiles=gameState.hands[seat];
    for(let n=0;n<2;n++){const idx=handTiles.indexOf(tile);if(idx>=0)handTiles.splice(idx,1);}
    gameState.melds[seat].push({type:"ポン",tile,tiles:[tile,tile,tile],from:discardSeat});
    gameState.rivers[discardSeat].pop();
    gameState.currentSeat=seat;
    gameState.turnIndex=SEATS.indexOf(seat);
    gameState.phase=GamePhase.ACTION;
    canDiscard=true;lastDraw=null;
    cpuDecisionText=`${SEAT_LABELS[seat]}：${tile}をポン / ${decision.reason}`;
    log(`${SEAT_LABELS[seat]} CPU判断：${SEAT_LABELS[discardSeat]}の${tile}をポン（${decision.reason}）`);
    showCall("ポン","pon");
    sortSeatHand(seat);
    scheduleAiDiscard();
    return true;
  }
  return false;
}

function autoNukiFlowersForSeat(seat){
  if(seat===PLAYER_SEAT)return;
  let safety=0;
  while(hasFlowerInSeat(seat)&&rinshanPile.length>0&&safety<16){
    nukiOneFlowerForSeat(seat);
    safety++;
  }
}

function toggleDebugAiPause(){debugAiPaused=!debugAiPaused;clearAiTimer();log(debugAiPaused?"AI停止：CPU手番で自動進行しません":"AI再開：CPU手番なら自動進行します");render();if(!debugAiPaused&&!TurnManager.isPlayer()){if(canDiscard)scheduleAiDiscard();else scheduleAiDraw();}}

function setDebugCpuRiichiTenpai(){
  // 空のデバッグ局ではなく、通常局を作って全員へ13枚ずつ配牌する。
  GameController.startRound();
  clearAiTimer();

  // 南家だけを「9p切りで東単騎聴牌」になる14枚形へ差し替える。
  gameState.hands.south=["2p","3p","4p","3p","4p","5p","6p","7p","8p","2s","3s","4s","東","9p"];
  gameState.rivers.south=[];
  gameState.melds.south=[];
  gameState.flowers.south=[];
  gameState.riichi.south=false;

  // TurnManager が参照する正式な手番を南家へ変更する。
  gameState.currentSeat="south";
  gameState.turnIndex=SEATS.indexOf("south");
  gameState.phase=GamePhase.ACTION;
  gameState.nextRound=false;
  gameState.matchResult=null;
  pendingWin=null;
  lastDraw="9p";
  canDiscard=true;
  debugAiPaused=false;
  sortSeatHand("south");

  cpuDecisionText="南家：即リーチ確認を開始";
  log("CPU即リーチ確認：通常配牌を維持し、南家のみリーチ確認手牌へ変更しました");
  render();
  scheduleAiDiscard();
}
function setDebugCpuFoldChance(){
  newGame();clearAiTimer();pendingWin=null;debugAiPaused=true;
  gameState.riichi.south=true;gameState.points.south-=1000;gameState.deposit+=1;
  gameState.rivers.south=[{tile:"3p",riichi:true},{tile:"6s",riichi:false}];
  gameState.hands.west=["3p","1p","4p","7p","2s","5s","8s","東","白","中","9m","1m","北","9s"];
  sortSeatHand("west");gameState.currentSeat="west";gameState.turnIndex=2;gameState.phase=GamePhase.ACTION;lastDraw="9s";canDiscard=true;
  debugAiPaused=false;cpuDecisionText="CPUベタオリ確認：西家が南家リーチへ現物3pを優先";
  log("CPUベタオリ確認：南家リーチ中。西家は2向聴以上・低打点のため現物3pを優先します");render();scheduleAiDiscard();
}
function setDebugCpuPushChance(){
  newGame();clearAiTimer();pendingWin=null;debugAiPaused=true;
  gameState.riichi.south=true;gameState.points.south-=1000;gameState.deposit+=1;
  gameState.rivers.south=[{tile:"1p",riichi:true},{tile:"9s",riichi:false}];
  doraIndicators=["4p"];
  gameState.hands.west=["2p","3p","4p","3p","4p","5p","6p","7p","8p","2s","3s","4s","東","9p"];
  sortSeatHand("west");gameState.currentSeat="west";gameState.turnIndex=2;gameState.phase=GamePhase.ACTION;lastDraw="9p";canDiscard=true;
  debugAiPaused=false;cpuDecisionText="CPU押し確認：西家が聴牌・ドラありで押す";
  log("CPU押し確認：南家リーチ中でも、西家は聴牌・ドラありのため向聴維持を優先します");render();scheduleAiDiscard();
}

function setDebugCpuAnkanChance(){
  newGame();clearAiTimer();pendingWin=null;debugAiPaused=true;
  gameState.hands.south=["5p","5p","5p","5p","2p","3p","4p","6p","7p","8p","東","東","白","9s"];
  gameState.melds.south=[];gameState.flowers.south=[];gameState.riichi.south=false;
  gameState.currentSeat="south";gameState.turnIndex=1;gameState.phase=GamePhase.ACTION;lastDraw="9s";canDiscard=true;
  sortSeatHand("south");debugAiPaused=false;cpuDecisionText="CPU暗槓確認：南家が5pを暗槓";
  log("CPU暗槓確認：南家は5p×4を暗槓し、カンドラ追加後に嶺上ツモします");render();scheduleAiDiscard();
}
function setDebugCpuDaiminkanChance(){
  clearAiTimer();pendingWin=null;debugAiPaused=false;createWall();gameState=createInitialGameState();gameState.started=true;gameState.phase=GamePhase.ACTION;
  gameState.currentSeat=PLAYER_SEAT;gameState.turnIndex=0;
  gameState.hands.east=["1p","2p","3p","4p","5p","6p","7p","8p","9p","1s","2s","3s","發","東"];
  gameState.hands.south=["發","發","發","2p","3p","4p","5p","6p","7p","2s","3s","4s","南"];
  gameState.hands.west=["1p","1p","2p","3p","4p","5p","6p","7p","8p","2s","3s","4s","西"];
  SEATS.forEach(sortSeatHand);bindPlayerAliases();lastDraw="東";canDiscard=true;cpuDecisionText="CPU大明槓確認：自家の發を捨ててください";
  log("CPU大明槓確認：自家手牌の發を捨てると、南家が發を大明槓して嶺上ツモします");render();
}

function setDebugCpuPonChance(){
  clearAiTimer();pendingWin=null;debugAiPaused=false;
  createWall();gameState=createInitialGameState();gameState.started=true;gameState.phase=GamePhase.ACTION;
  gameState.currentSeat=PLAYER_SEAT;gameState.turnIndex=SEATS.indexOf(PLAYER_SEAT);
  gameState.hands.east=["1p","2p","4p","5p","6p","7p","8p","9p","1s","2s","3s","東","東","發"];
  gameState.hands.south=["發","發","2p","3p","4p","5p","6p","7p","2s","3s","4s","南","南"];
  gameState.hands.west=["1p","1p","2p","3p","4p","5p","6p","7p","8p","2s","3s","4s","西"];
  SEATS.forEach(sortSeatHand);bindPlayerAliases();
  lastDraw="發";canDiscard=true;cpuDecisionText="CPUポン確認：自家の發を捨ててください";
  log("CPUポン確認：自家手牌右端の發を捨てると、南家が役牌ポンします");render();
}
