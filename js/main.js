const SEATS = ["east", "south", "west"];
const PLAYER_SEAT = "east";

const SEAT_LABELS = {
  east: "東家",
  south: "南家",
  west: "西家",
};

const AI_THINK_MIN_MS = 450;
const AI_THINK_MAX_MS = 900;
// Sprint 3 Block 3-5 hotfix2: リーチ表示・宣言牌回転の確認用。
// 正式テンパイ判定が安定するまで、14枚ある自分の手番ではリーチ操作を確認できるようにする。
const DEBUG_RIICHI_TEST_MODE = true;

const state = {
  wall: [],
  doraIndicator: null,
  turnIndex: 0,
  hands: {
    east: [],
    south: [],
    west: [],
  },
  rivers: {
    east: [],
    south: [],
    west: [],
  },
  flowers: {
    east: [],
    south: [],
    west: [],
  },
  melds: {
    east: [],
    south: [],
    west: [],
  },
  started: false,
  aiTimerId: null,
  actionLocked: false,
  selectedTileId: null,
  riichiPending: false,
  riichiSticks: 0,
  points: {
    east: 35000,
    south: 35000,
    west: 35000,
  },
  riichi: {
    east: false,
    south: false,
    west: false,
  },
};

const tileDefinitions = [
  // Sprint 3 Block 3-3: 関西三麻仕様。萬子は1萬・9萬のみ。2萬〜8萬は使用しない。
  ...[1, 9].map((n) => ({ suit: "man", label: `${n}萬`, order: n })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ suit: "pin", label: `${n}筒`, order: 20 + n })),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ suit: "sou", label: `${n}索`, order: 40 + n })),
  { suit: "honor", label: "東", order: 61 },
  { suit: "honor", label: "南", order: 62 },
  { suit: "honor", label: "西", order: 63 },
  { suit: "honor", label: "北", order: 64 },
  { suit: "honor", label: "白", order: 65 },
  { suit: "honor", label: "發", order: 66 },
  { suit: "honor", label: "中", order: 67 },
];

const flowerDefinitions = [
  { suit: "flower", label: "春", order: 81 },
  { suit: "flower", label: "夏", order: 82 },
  { suit: "flower", label: "秋", order: 83 },
  { suit: "flower", label: "冬", order: 84 },
];

const dom = {
  newGameButton: document.getElementById("newGameButton"),
  roundText: document.getElementById("roundText"),
  turnText: document.getElementById("turnText"),
  wallText: document.getElementById("wallText"),
  message: document.getElementById("message"),
  doraIndicator: document.getElementById("doraIndicator"),
  riichiButton: document.getElementById("riichiButton"),
};

function makeWall() {
  const wall = [];
  let id = 1;

  for (const def of tileDefinitions) {
    for (let i = 0; i < 4; i += 1) {
      wall.push({ ...def, id: `t${id}` });
      id += 1;
    }
  }

  for (const def of flowerDefinitions) {
    wall.push({ ...def, id: `t${id}` });
    id += 1;
  }

  return shuffle(wall);
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sortHand(hand) {
  return hand.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function startGame() {
  clearAiTimer();
  state.selectedTileId = null;
  state.wall = makeWall();
  state.doraIndicator = state.wall.pop();
  state.turnIndex = 0;
  state.started = true;
  state.actionLocked = false;
  state.riichiPending = false;
  state.riichiSticks = 0;

  for (const seat of SEATS) {
    state.hands[seat] = [];
    state.rivers[seat] = [];
    state.flowers[seat] = [];
    state.melds[seat] = [];
    state.points[seat] = 35000;
    state.riichi[seat] = false;
  }

  for (let i = 0; i < 13; i += 1) {
    for (const seat of SEATS) {
      drawTile(seat, false);
    }
  }

  drawTile(currentSeat(), false);
  dom.message.textContent = "関西三麻牌構成で開始。2萬〜8萬は山に入りません。";
  render();
  maybeRunAiTurn();
}

function currentSeat() {
  return SEATS[state.turnIndex];
}

function isPlayerSeat(seat) {
  return seat === PLAYER_SEAT;
}

function clearAiTimer() {
  if (state.aiTimerId !== null) {
    window.clearTimeout(state.aiTimerId);
    state.aiTimerId = null;
  }
}

function nextTurn() {
  state.actionLocked = false;
  state.selectedTileId = null;
  state.riichiPending = false;
  state.turnIndex = (state.turnIndex + 1) % SEATS.length;
  const seat = currentSeat();

  if (state.wall.length <= 0) {
    dom.message.textContent = "流局：山がなくなりました。";
    state.started = false;
    render();
    return;
  }

  drawTile(seat, false);

  if (isPlayerSeat(seat)) {
    dom.message.textContent = "あなたのツモ。手牌をクリックして打牌してください。";
  } else {
    dom.message.textContent = `${SEAT_LABELS[seat]}が考えています…`;
  }

  render();
  maybeRunAiTurn();
}

function drawTile(seat, shouldRender) {
  const tile = state.wall.pop();
  if (!tile) return null;

  // Block 3-3: 花牌は自動で抜かない。
  // 手牌に入れて、プレイヤーまたはAIが任意タイミングで抜く。
  state.hands[seat].push(tile);
  sortHand(state.hands[seat]);

  if (shouldRender) render();
  return tile;
}

function extractFlower(seat, tileId, options = {}) {
  if (!state.started || seat !== currentSeat() || state.actionLocked) return false;

  const hand = state.hands[seat];
  const index = hand.findIndex((tile) => tile.id === tileId && tile.suit === "flower");
  if (index === -1) return false;

  state.actionLocked = true;
  state.selectedTileId = null;

  const [tile] = hand.splice(index, 1);
  state.flowers[seat].push(tile);

  const drawn = drawTile(seat, false);
  const prefix = isPlayerSeat(seat) ? "あなた" : SEAT_LABELS[seat];
  dom.message.textContent = drawn
    ? `${prefix}が花牌 ${tile.label} を抜き、補充牌を引きました。`
    : `${prefix}が花牌 ${tile.label} を抜きました。`;

  render();

  window.setTimeout(() => {
    state.actionLocked = false;
    render();
  }, options.lockMs ?? 220);

  return true;
}

function extractAiFlowers(seat) {
  // CPUは現時点では花牌を見つけたら思考中にまとめて抜く。
  // ユーザー操作用の入力ロックとは分離して、AI打牌が止まらないようにする。
  let extracted = false;
  let guard = 0;

  while (guard < 8) {
    const index = state.hands[seat].findIndex((tile) => tile.suit === "flower");
    if (index === -1) break;

    const [flower] = state.hands[seat].splice(index, 1);
    state.flowers[seat].push(flower);
    drawTile(seat, false);
    sortHand(state.hands[seat]);
    extracted = true;
    guard += 1;
  }

  if (extracted) {
    dom.message.textContent = `${SEAT_LABELS[seat]}が花牌を抜きました。`;
    render();
  }

  return extracted;
}

function handlePlayerTileClick(seat, tile) {
  if (!state.started || seat !== currentSeat() || !isPlayerSeat(seat) || state.actionLocked) return;

  if (state.riichi[seat] && tile.suit === "flower") {
    dom.message.textContent = "リーチ後の花牌処理は後続Blockで正式対応します。";
    return;
  }

  if (tile.suit === "flower") {
    extractFlower(seat, tile.id);
    return;
  }

  // Sprint 3 Block 3-4: スマホ横持ちを想定し、
  // 1タップ目で選択、同じ牌をもう一度タップで打牌する。
  // 連打やAIターン中の誤入力は actionLocked で止める。
  if (state.selectedTileId !== tile.id) {
    state.selectedTileId = tile.id;
    dom.message.textContent = `${tile.label}を選択中。もう一度タップで打牌します。`;
    render();
    return;
  }

  discardTile(seat, tile.id);
}

function discardTile(seat, tileId, options = {}) {
  if (!state.started || seat !== currentSeat() || state.actionLocked) return;

  const hand = state.hands[seat];
  const index = hand.findIndex((tile) => tile.id === tileId);
  if (index === -1) return;

  const tile = hand[index];
  if (tile.suit === "flower") {
    extractFlower(seat, tile.id, options);
    return;
  }

  const riichiDiscardIds = getRiichiDiscardIds(seat);
  const willRiichi = isPlayerSeat(seat) && state.riichiPending && !state.riichi[seat] && riichiDiscardIds.has(tile.id);

  if (isPlayerSeat(seat) && state.riichiPending && !willRiichi) {
    dom.message.textContent = "その牌ではリーチできません。テンパイになる打牌を選んでください。";
    state.selectedTileId = null;
    render();
    return;
  }

  state.actionLocked = true;
  state.selectedTileId = null;
  hand.splice(index, 1);

  if (willRiichi) {
    state.riichi[seat] = true;
    state.riichiPending = false;
    state.points[seat] -= 1000;
    state.riichiSticks += 1;
  }

  state.rivers[seat].push({ ...tile, riichi: willRiichi });

  const prefix = isPlayerSeat(seat) ? "あなた" : SEAT_LABELS[seat];
  dom.message.textContent = willRiichi
    ? `${prefix}がリーチ宣言。${tile.label}が宣言牌です。`
    : `${prefix}が${tile.label}を打牌。`;
  render();

  const delay = options.nextDelayMs ?? 380;
  window.setTimeout(() => {
    nextTurn();
  }, delay);
}

function maybeRunAiTurn() {
  clearAiTimer();
  state.selectedTileId = null;
  if (!state.started) return;

  const seat = currentSeat();
  if (isPlayerSeat(seat)) return;

  const thinkMs = randomInt(AI_THINK_MIN_MS, AI_THINK_MAX_MS);
  state.aiTimerId = window.setTimeout(() => {
    state.aiTimerId = null;
    extractAiFlowers(seat);
    const tile = chooseAiDiscard(seat);
    if (!tile) return;
    discardTile(seat, tile.id, { nextDelayMs: 420 });
  }, thinkMs);
}

function chooseAiDiscard(seat) {
  const hand = state.hands[seat].filter((tile) => tile.suit !== "flower");
  if (hand.length === 0) return null;

  // Block 3-3時点の最小AI。孤立牌っぽい端・字牌を少し捨てやすくする。
  const scored = hand.map((tile) => ({ tile, score: aiDiscardScore(tile, hand) }));
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return scored[0].tile;
}

function aiDiscardScore(tile, hand) {
  let score = Math.random() * 2;

  if (tile.suit === "honor") score += 3;
  if (["man", "pin", "sou"].includes(tile.suit)) {
    const number = Number(tile.label[0]);
    if (number === 1 || number === 9) score += 2;
    if (number === 2 || number === 8) score += 1;

    const hasNear = hand.some((other) => (
      other.id !== tile.id
      && other.suit === tile.suit
      && Math.abs(Number(other.label[0]) - number) <= 2
    ));
    if (hasNear) score -= 2;
  }

  const sameCount = hand.filter((other) => other.label === tile.label).length;
  if (sameCount >= 2) score -= 3;

  return score;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTileElement(tile, options = {}) {
  const element = document.createElement("div");
  element.className = `tile ${tile.suit || ""}`;
  element.textContent = tile.label;

  if (options.small) element.classList.add("small");
  if (options.back) {
    element.classList.add("back");
    element.textContent = "?";
  }
  if (options.discarded) element.classList.add("discarded", "small");
  if (tile.riichi) element.classList.add("riichi");
  if (options.clickable) element.classList.add("clickable");
  if (options.justDrawn) element.classList.add("just-drawn");

  return element;
}

function render() {
  const seat = currentSeat();
  const turnPrefix = isPlayerSeat(seat) ? "あなた" : SEAT_LABELS[seat];
  dom.turnText.textContent = `${turnPrefix}の手番`;
  dom.wallText.textContent = `山: ${state.wall.length} / 供託: ${state.riichiSticks} / 点: ${state.points[PLAYER_SEAT]}`;
  dom.doraIndicator.replaceWith(createTileElement(state.doraIndicator || { label: "?", suit: "back" }, { small: true }));
  dom.doraIndicator = document.querySelector(".dora-box .tile");
  renderRiichiButton();

  for (const s of SEATS) {
    renderSeat(s);
    const area = document.querySelector(`[data-seat="${s}"]`);
    area.classList.toggle("active", s === currentSeat() && state.started);
    area.classList.toggle("player-controlled", s === PLAYER_SEAT);
  }
}

function getRiverGridPosition(index) {
  // 以前確定した仕様：7枚×3列。22枚目以降は3列目の後ろへ伸ばす。
  if (index < 21) {
    return {
      column: (index % 7) + 1,
      row: Math.floor(index / 7) + 1,
    };
  }

  return {
    column: index - 21 + 8,
    row: 3,
  };
}

function renderSeat(seat) {
  const handElement = document.getElementById(`hand-${seat}`);
  const riverElement = document.getElementById(`river-${seat}`);
  const flowerElement = document.getElementById(`flowers-${seat}`);
  const meldElement = document.getElementById(`melds-${seat}`);

  handElement.innerHTML = "";
  riverElement.innerHTML = "";
  flowerElement.innerHTML = "";
  meldElement.innerHTML = "";

  const canClick = seat === currentSeat() && state.started && isPlayerSeat(seat) && !state.actionLocked;
  const isInputLocked = state.started && (state.actionLocked || !isPlayerSeat(currentSeat()));

  for (const tile of state.hands[seat]) {
    const element = createTileElement(tile, {
      clickable: canClick,
      back: !isPlayerSeat(seat),
    });

    if (canClick) {
      element.title = tile.suit === "flower" ? "花牌を抜く" : "選択 / もう一度タップで打牌";
      if (tile.id === state.selectedTileId) element.classList.add("selected");
      if (tile.suit !== "flower") element.classList.add("playable");
      if (state.riichiPending && getRiichiDiscardIds(seat).has(tile.id)) element.classList.add("riichi-candidate");
      element.addEventListener("click", () => handlePlayerTileClick(seat, tile));
    }

    if (isInputLocked && isPlayerSeat(seat)) {
      element.classList.add("input-locked");
    }

    handElement.appendChild(element);
  }

  state.rivers[seat].forEach((tile, index) => {
    const element = createTileElement(tile, { discarded: true });
    const position = getRiverGridPosition(index);
    element.style.gridColumn = String(position.column);
    element.style.gridRow = String(position.row);
    riverElement.appendChild(element);
  });

  for (const tile of state.flowers[seat]) {
    flowerElement.appendChild(createTileElement(tile, { small: true }));
  }

  for (const meld of state.melds[seat]) {
    for (const tile of meld) {
      meldElement.appendChild(createTileElement(tile, { small: true }));
    }
  }
}


function tileKey(tile) {
  return `${tile.suit}:${tile.label}`;
}

function getPlayableHand(seat) {
  return state.hands[seat].filter((tile) => tile.suit !== "flower");
}

function getCandidateDrawTiles() {
  return tileDefinitions.map((def, index) => ({ ...def, id: `candidate${index}` }));
}

function getRiichiDiscardIds(seat) {
  if (!state.started || seat !== currentSeat() || !isPlayerSeat(seat)) return new Set();
  if (state.actionLocked || state.riichi[seat] || state.points[seat] < 1000 || state.melds[seat].length > 0) return new Set();

  const playable = getPlayableHand(seat);
  if (playable.length !== 14) return new Set();

  const result = new Set();
  const candidates = getCandidateDrawTiles();

  for (const discard of playable) {
    const afterDiscard = playable.filter((tile) => tile.id !== discard.id);
    const isTenpai = candidates.some((draw) => isWinningHand([...afterDiscard, draw]));
    if (isTenpai) result.add(discard.id);
  }

  // 現段階はリーチUI確認を優先。正式な待ち判定は次Blockで精度を上げる。
  if (result.size === 0 && DEBUG_RIICHI_TEST_MODE) {
    playable.forEach((tile) => result.add(tile.id));
  }

  return result;
}

function isWinningHand(tiles) {
  const normalTiles = tiles.filter((tile) => tile.suit !== "flower");
  if (normalTiles.length !== 14) return false;
  return isSevenPairs(normalTiles) || isStandardHand(normalTiles);
}

function isSevenPairs(tiles) {
  const counts = makeCounts(tiles);
  const values = Array.from(counts.values());
  return values.length === 7 && values.every((count) => count === 2);
}

function isStandardHand(tiles) {
  const counts = makeCounts(tiles);
  for (const [key, count] of counts.entries()) {
    if (count < 2) continue;
    counts.set(key, count - 2);
    if (canMakeMelds(counts)) {
      counts.set(key, count);
      return true;
    }
    counts.set(key, count);
  }
  return false;
}

function makeCounts(tiles) {
  const counts = new Map();
  for (const tile of tiles) {
    const key = tileKey(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function canMakeMelds(counts) {
  const entry = Array.from(counts.entries()).find(([, count]) => count > 0);
  if (!entry) return true;

  const [key, count] = entry;
  const tile = parseTileKey(key);

  if (count >= 3) {
    counts.set(key, count - 3);
    if (canMakeMelds(counts)) {
      counts.set(key, count);
      return true;
    }
    counts.set(key, count);
  }

  if (["pin", "sou"].includes(tile.suit) && tile.number <= 7) {
    const key2 = `${tile.suit}:${tile.number + 1}${tile.suffix}`;
    const key3 = `${tile.suit}:${tile.number + 2}${tile.suffix}`;
    if ((counts.get(key2) || 0) > 0 && (counts.get(key3) || 0) > 0) {
      counts.set(key, count - 1);
      counts.set(key2, counts.get(key2) - 1);
      counts.set(key3, counts.get(key3) - 1);
      if (canMakeMelds(counts)) {
        counts.set(key, count);
        counts.set(key2, counts.get(key2) + 1);
        counts.set(key3, counts.get(key3) + 1);
        return true;
      }
      counts.set(key, count);
      counts.set(key2, counts.get(key2) + 1);
      counts.set(key3, counts.get(key3) + 1);
    }
  }

  return false;
}

function parseTileKey(key) {
  const [suit, label] = key.split(":");
  const number = Number(label[0]);
  const suffix = label.slice(1);
  return { suit, label, number, suffix };
}

function countPlayableTiles(seat) {
  return state.hands[seat].filter((tile) => tile.suit !== "flower").length;
}

function canDeclareRiichi(seat) {
  return getRiichiDiscardIds(seat).size > 0;
}

function renderRiichiButton() {
  if (!dom.riichiButton) return;

  const canRiichi = canDeclareRiichi(PLAYER_SEAT);
  const shouldShow = state.started && isPlayerSeat(currentSeat()) && (canRiichi || state.riichiPending || state.riichi[PLAYER_SEAT]);
  dom.riichiButton.hidden = !shouldShow;

  if (!shouldShow) {
    dom.riichiButton.disabled = true;
    dom.riichiButton.textContent = DEBUG_RIICHI_TEST_MODE ? "リーチ確認" : "リーチ";
    dom.riichiButton.classList.remove("armed");
    return;
  }

  dom.riichiButton.disabled = state.riichi[PLAYER_SEAT] || (!canRiichi && !state.riichiPending);
  dom.riichiButton.classList.toggle("armed", state.riichiPending);

  if (state.riichi[PLAYER_SEAT]) {
    dom.riichiButton.textContent = "リーチ中";
  } else if (state.riichiPending) {
    dom.riichiButton.textContent = "リーチ選択中";
  } else {
    dom.riichiButton.textContent = DEBUG_RIICHI_TEST_MODE ? "リーチ確認" : "リーチ";
  }
}

function toggleRiichiPending() {
  if (!canDeclareRiichi(PLAYER_SEAT)) return;
  state.riichiPending = !state.riichiPending;
  state.selectedTileId = null;
  dom.message.textContent = state.riichiPending
    ? DEBUG_RIICHI_TEST_MODE ? "リーチ確認中。牌を選んで、もう一度タップで宣言牌回転を確認できます。" : "リーチする牌を選んで、もう一度タップで宣言打牌します。"
    : "リーチ選択を解除しました。";
  render();
}

dom.newGameButton.addEventListener("click", startGame);
dom.riichiButton.addEventListener("click", toggleRiichiPending);
render();
