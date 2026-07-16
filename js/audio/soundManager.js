let soundEnabled=true;
let audioContext=null;
function ensureAudioContext(){
  if(!soundEnabled)return null;
  if(!audioContext){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return null;
    audioContext=new Ctx();
  }
  if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
  return audioContext;
}
function tone(freq,duration=0.07,type="sine",gain=0.035,delay=0,frequencyEnd=null){
  const ctx=ensureAudioContext();if(!ctx)return;
  const start=ctx.currentTime+delay;
  const osc=ctx.createOscillator(),amp=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,start);
  if(frequencyEnd)osc.frequency.exponentialRampToValueAtTime(Math.max(20,frequencyEnd),start+duration);
  amp.gain.setValueAtTime(0.0001,start);
  amp.gain.exponentialRampToValueAtTime(Math.max(gain,0.0002),start+0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001,start+duration);
  osc.connect(amp);amp.connect(ctx.destination);osc.start(start);osc.stop(start+duration+0.02);
}
function noise(duration=0.055,gain=0.045,delay=0,filterType="bandpass",frequency=950,q=0.8){
  const ctx=ensureAudioContext();if(!ctx)return;
  const len=Math.max(1,Math.floor(ctx.sampleRate*duration));
  const buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<len;i++){
    const envelope=Math.pow(1-i/len,2.2);
    data[i]=(Math.random()*2-1)*envelope;
  }
  const src=ctx.createBufferSource(),amp=ctx.createGain(),filter=ctx.createBiquadFilter();
  src.buffer=buf;filter.type=filterType;filter.frequency.value=frequency;filter.Q.value=q; amp.gain.value=gain;
  src.connect(filter);filter.connect(amp);amp.connect(ctx.destination);src.start(ctx.currentTime+delay);
}
function tileContact(delay=0,weight=1){
  // 樹脂牌が卓面に当たる「コッ」。低い衝撃と硬い表面音を短く重ねる。
  noise(0.028,0.032*weight,delay,"bandpass",1250,1.2);
  tone(215,0.052,"triangle",0.026*weight,delay,145);
  tone(1180,0.018,"sine",0.012*weight,delay+0.002,720);
}
function tileSlide(delay=0,weight=1){
  // 牌を指先で引き寄せ、隣の牌へ軽く触れる「チャッ」。
  noise(0.060,0.025*weight,delay,"highpass",1450,0.7);
  noise(0.024,0.020*weight,delay+0.030,"bandpass",1900,1.1);
  tone(980,0.025,"triangle",0.010*weight,delay+0.032,620);
}
function stickContact(delay=0){
  // 点棒を卓へ置く乾いた短音。鐘のような音にはしない。
  noise(0.026,0.024,delay,"highpass",1800,0.9);
  tone(1450,0.032,"triangle",0.018,delay,920);
  tone(760,0.040,"triangle",0.014,delay+0.035,520);
}
function playSound(kind){
  if(!soundEnabled)return;
  switch(kind){
    case "draw":
      tileSlide(0,1.0);
      break;
    case "discard":
      tileContact(0,1.0);
      break;
    case "discard_drawn":
      tileContact(0,0.82);
      break;
    case "riichi":
      tileContact(0,0.92);
      stickContact(0.075);
      break;
    case "pon":
      tileSlide(0,0.72);tileContact(0.045,0.74);tileContact(0.092,0.70);
      break;
    case "kan":
      tileContact(0,0.84);tileContact(0.050,0.82);tileContact(0.100,0.80);tileContact(0.150,0.90);
      break;
    case "ron":
      tileContact(0,1.12);tone(185,0.16,"triangle",0.030,0.055,105);tone(370,0.10,"triangle",0.018,0.090,235);
      break;
    case "tsumo":
      tileSlide(0,0.95);tileContact(0.060,0.88);tone(310,0.13,"triangle",0.022,0.095,205);
      break;
    case "flower":
      tileSlide(0,0.75);tileContact(0.052,0.52);
      break;
    case "dora":
      tileSlide(0,0.62);tileContact(0.050,0.62);tone(620,0.055,"triangle",0.012,0.080,430);
      break;
    case "ryukyoku":
      tone(260,0.16,"triangle",0.018,0,155);tone(205,0.18,"triangle",0.016,0.10,125);
      break;
    case "match_end":
      tone(330,0.10,"triangle",0.018);tone(440,0.12,"triangle",0.018,0.09);tone(550,0.16,"triangle",0.018,0.18);
      break;
  }
}
function toggleSound(){soundEnabled=!soundEnabled;const b=document.getElementById("soundButton");if(b)b.textContent=soundEnabled?"効果音 ON":"効果音 OFF";if(soundEnabled){ensureAudioContext();playSound("draw");}log(soundEnabled?"効果音を有効にしました":"効果音を無効にしました");}
