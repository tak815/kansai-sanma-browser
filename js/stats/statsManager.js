const PROFILE_STORAGE_KEY="ksb.profileStats";
const PROFILE_SCHEMA_VERSION=2;
function emptySeatCounter(){return {east:0,south:0,west:0};}
function emptySeatMap(factory){return {east:factory(),south:factory(),west:factory()};}
function createMatchStats(){
  return {
    schemaVersion:1,
    handsPlayed:0,
    wins:emptySeatCounter(),
    dealIns:emptySeatCounter(),
    bustAwards:emptySeatCounter(),
    busted:emptySeatCounter(),
    yakuWins:emptySeatMap(()=>({})),
    winEvents:[]
  };
}
function mergeObjectCounter(target,source){
  Object.entries(source||{}).forEach(([key,value])=>target[key]=(target[key]||0)+(Number(value)||0));
  return target;
}
function normalizeMatchStats(raw){
  const stats=createMatchStats();
  if(!raw||typeof raw!=="object")return stats;
  stats.handsPlayed=Number(raw.handsPlayed)||0;
  SEATS.forEach(seat=>{
    stats.wins[seat]=Number(raw.wins?.[seat])||0;
    stats.dealIns[seat]=Number(raw.dealIns?.[seat])||0;
    stats.bustAwards[seat]=Number(raw.bustAwards?.[seat])||0;
    stats.busted[seat]=Number(raw.busted?.[seat])||0;
    mergeObjectCounter(stats.yakuWins[seat],raw.yakuWins?.[seat]);
  });
  stats.winEvents=Array.isArray(raw.winEvents)?raw.winEvents.slice(-200):[];
  return stats;
}
function ensureStats(){
  gameState.stats=normalizeMatchStats(gameState.stats);
  return gameState.stats;
}
function recordWinStats(winners,from=null,bustWinner=null,winDetails=[]){
  const stats=ensureStats();
  [...new Set(winners)].forEach(seat=>stats.wins[seat]=(stats.wins[seat]||0)+1);
  if(from&&from!==winners[0])stats.dealIns[from]=(stats.dealIns[from]||0)+1;
  if(bustWinner)stats.bustAwards[bustWinner]=(stats.bustAwards[bustWinner]||0)+1;
  winDetails.forEach(detail=>{
    const seat=detail.seat;
    if(!SEATS.includes(seat))return;
    (detail.info?.yaku||[]).forEach(y=>{
      const name=String(y.name||"不明");
      stats.yakuWins[seat][name]=(stats.yakuWins[seat][name]||0)+1;
    });
    stats.winEvents.push({
      seat,
      type:detail.win?.type||"unknown",
      from:detail.win?.from||seat,
      tile:detail.win?.tile||null,
      yaku:(detail.info?.yaku||[]).map(y=>({name:y.name,han:y.han})),
      totalHan:Number(detail.info?.totalHan)||0,
      limit:detail.info?.limit||"",
      score:Number(detail.info?.score?.ron||detail.info?.score?.total||0),
      round:roundLabelText(),
      recordedAt:new Date().toISOString(),
      extensionData:{}
    });
  });
  stats.winEvents=stats.winEvents.slice(-200);
}
function createProfileStats(){
  return {
    schemaVersion:PROFILE_SCHEMA_VERSION,
    profile:{name:"プレイヤー",rank:"未設定",rating:1500},
    totals:{matches:0,hands:0,wins:0,dealIns:0,bustAwards:0,busted:0},
    placements:{1:0,2:0,3:0},
    yaku:{winsByName:{},hanByName:{},scoreByName:{},ronByName:{},tsumoByName:{}},
    aggregates:{finalPointsTotal:0,rankTotal:0,winScoreTotal:0},
    matchHistory:[],
    winHistory:[],
    extensionData:{}
  };
}
function migrateProfileStats(raw){
  const base=createProfileStats();
  if(!raw||typeof raw!=="object")return base;
  base.profile=Object.assign(base.profile,raw.profile||{});
  base.totals=Object.assign(base.totals,raw.totals||{});
  base.placements=Object.assign(base.placements,raw.placements||{});
  base.yaku.winsByName=Object.assign({},raw.yaku?.winsByName||{});
  base.yaku.hanByName=Object.assign({},raw.yaku?.hanByName||{});
  base.yaku.scoreByName=Object.assign({},raw.yaku?.scoreByName||{});
  base.yaku.ronByName=Object.assign({},raw.yaku?.ronByName||{});
  base.yaku.tsumoByName=Object.assign({},raw.yaku?.tsumoByName||{});
  base.aggregates=Object.assign(base.aggregates,raw.aggregates||{});
  base.matchHistory=Array.isArray(raw.matchHistory)?raw.matchHistory.slice(-100):[];
  base.winHistory=Array.isArray(raw.winHistory)?raw.winHistory.slice(-500):[];
  base.extensionData=Object.assign({},raw.extensionData||{});
  base.schemaVersion=PROFILE_SCHEMA_VERSION;
  return base;
}
function loadProfileStats(){
  try{return migrateProfileStats(JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY)||"null"));}
  catch(e){return createProfileStats();}
}
let profileStats=loadProfileStats();
function saveProfileStats(){
  try{localStorage.setItem(PROFILE_STORAGE_KEY,JSON.stringify(profileStats));}
  catch(e){console.warn("統計データを保存できませんでした",e);}
}
function renderProfile(){
  const fields={profileNameLabel:profileStats.profile.name,profileRankLabel:profileStats.profile.rank,profileRatingLabel:profileStats.profile.rating,profileMatchesLabel:profileStats.totals.matches};
  Object.entries(fields).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value;});
}
function persistCompletedMatch(){
  if(!gameState.matchResult||gameState.matchResult.persisted)return;
  const playerRow=gameState.matchResult.ranking.find(row=>row.seat===PLAYER_SEAT);
  if(!playerRow)return;
  const stats=ensureStats();
  profileStats.totals.matches+=1;
  profileStats.totals.hands+=stats.handsPlayed||0;
  profileStats.totals.wins+=stats.wins[PLAYER_SEAT]||0;
  profileStats.totals.dealIns+=stats.dealIns[PLAYER_SEAT]||0;
  profileStats.totals.bustAwards+=stats.bustAwards[PLAYER_SEAT]||0;
  profileStats.totals.busted+=stats.busted[PLAYER_SEAT]||0;
  profileStats.placements[playerRow.rank]=(profileStats.placements[playerRow.rank]||0)+1;
  profileStats.aggregates.finalPointsTotal+=playerRow.points||0;
  profileStats.aggregates.rankTotal+=playerRow.rank||0;
  mergeObjectCounter(profileStats.yaku.winsByName,stats.yakuWins[PLAYER_SEAT]);
  (stats.winEvents||[]).filter(e=>e.seat===PLAYER_SEAT).forEach(event=>{
    const eventScore=Number(event.score)||0;
    const eventType=event.type==="tsumo"?"tsumo":"ron";
    (event.yaku||[]).forEach(y=>{
      const name=String(y.name||"不明");
      profileStats.yaku.hanByName[name]=(profileStats.yaku.hanByName[name]||0)+(Number(y.han)||0);
      profileStats.yaku.scoreByName[name]=(profileStats.yaku.scoreByName[name]||0)+eventScore;
      const typeMap=eventType==="tsumo"?profileStats.yaku.tsumoByName:profileStats.yaku.ronByName;
      typeMap[name]=(typeMap[name]||0)+1;
    });
    profileStats.aggregates.winScoreTotal+=eventScore;
    profileStats.winHistory.push({
      id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      recordedAt:event.recordedAt||new Date().toISOString(),
      type:eventType,
      from:event.from||PLAYER_SEAT,
      tile:event.tile||null,
      round:event.round||"",
      yaku:(event.yaku||[]).map(y=>({name:String(y.name||"不明"),han:Number(y.han)||0})),
      totalHan:Number(event.totalHan)||0,
      limit:event.limit||"",
      score:eventScore,
      extensionData:Object.assign({},event.extensionData||{})
    });
  });
  profileStats.winHistory=profileStats.winHistory.slice(-500);
  profileStats.matchHistory.push({
    id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    playedAt:new Date().toISOString(),
    rank:playerRow.rank,
    finalPoints:playerRow.points,
    reason:gameState.matchResult.reason,
    hands:stats.handsPlayed||0,
    wins:stats.wins[PLAYER_SEAT]||0,
    dealIns:stats.dealIns[PLAYER_SEAT]||0,
    yakuWins:Object.assign({},stats.yakuWins[PLAYER_SEAT]),
    extensionData:{}
  });
  profileStats.matchHistory=profileStats.matchHistory.slice(-100);
  gameState.matchResult.persisted=true;
  saveProfileStats();
  renderProfile();
}


function formatPercent(n,d){return d>0?`${(n/d*100).toFixed(1)}%`:'0.0%';}
function openStatsModal(){renderDetailedStats();document.getElementById('statsModal').hidden=false;}
function closeStatsModal(){document.getElementById('statsModal').hidden=true;}
function renderDetailedStats(){
  const t=profileStats.totals||{},a=profileStats.aggregates||{};
  const avgRank=t.matches?((a.rankTotal||0)/t.matches).toFixed(2):'-';
  const avgPoints=t.matches?Math.round((a.finalPointsTotal||0)/t.matches).toLocaleString():'-';
  const boxes=[['総対局数',t.matches||0],['平均順位',avgRank],['上がり率',formatPercent(t.wins||0,t.hands||0)],['放銃率',formatPercent(t.dealIns||0,t.hands||0)],['平均最終点',avgPoints],['飛ばし賞',t.bustAwards||0],['飛ばされた回数',t.busted||0],['保存形式',`v${profileStats.schemaVersion||1}`]];
  document.getElementById('statsSummary').innerHTML=boxes.map(([k,v])=>`<div class="stats-box"><span>${k}</span><b>${v}</b></div>`).join('');
  const y=profileStats.yaku?.winsByName||{},h=profileStats.yaku?.hanByName||{},sc=profileStats.yaku?.scoreByName||{},rn=profileStats.yaku?.ronByName||{},ts=profileStats.yaku?.tsumoByName||{};
  const rows=Object.keys(y).sort((x,z)=>(y[z]||0)-(y[x]||0)||x.localeCompare(z,'ja')).map(name=>{
    const count=y[name]||0,avgHan=count?((h[name]||0)/count).toFixed(2):'-',avgScore=count?Math.round((sc[name]||0)/count).toLocaleString():'-';
    return `<tr><td>${escapeHtml(name)}</td><td>${count}</td><td>${rn[name]||0}</td><td>${ts[name]||0}</td><td>${avgHan}</td><td>${avgScore}</td></tr>`;
  }).join('');
  document.getElementById('yakuStatsBody').innerHTML=rows?`<table class="stats-table"><thead><tr><th>役</th><th>和了回数</th><th>ロン</th><th>ツモ</th><th>平均翻</th><th>平均打点</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="stats-empty">まだ役別和了データはありません。</div>';
  const mh=(profileStats.matchHistory||[]).slice(-10).reverse();
  const mr=mh.map(m=>`<tr><td>${new Date(m.playedAt).toLocaleString('ja-JP')}</td><td>${m.rank}位</td><td>${Number(m.finalPoints||0).toLocaleString()}</td><td>${m.wins||0}</td><td>${m.dealIns||0}</td></tr>`).join('');
  document.getElementById('recentMatchStatsBody').innerHTML=mr?`<table class="stats-table"><thead><tr><th>日時</th><th>順位</th><th>最終点</th><th>和了</th><th>放銃</th></tr></thead><tbody>${mr}</tbody></table>`:'<div class="stats-empty">まだ対局履歴はありません。</div>';
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function exportStatsJson(){
  const blob=new Blob([JSON.stringify(profileStats,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ksb-stats-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resetStatsForDebug(){if(!confirm('保存済みの統計を初期化しますか？'))return;profileStats=createProfileStats();saveProfileStats();renderProfile();renderDetailedStats();log('統計情報を初期化しました');}
