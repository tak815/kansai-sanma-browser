const SEATS = ["east", "south", "west"];
const PLAYER_SEAT = "east";

const SEAT_LABELS = {
  east: "東家",
  south: "南家",
  west: "西家",
};

const AI_THINK_MIN_MS = 450;
const AI_THINK_MAX_MS = 900;

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
};

const tileDefinitions = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ suit: "man", label: `${n}萬`, order: n })),
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
  state.wall = makeWall();
  state.doraIndicator = state.wall.pop();
  state.turnIndex = 0;
  state.started = true;

  for (const seat of SEATS) {
    state.hands[seat] = [];
    state.rivers[seat] = [];
    state.flowers[seat] = [];
    state.melds[seat] = [];
  }

  for (let i = 0; i < 13; i += 1) {
    for (const seat of SEATS) {
      drawTile(seat, false);
    }
  }

  drawTile(currentSeat(), false);
  dom.message.textContent = "東家から開始。あなたの手牌をクリックして打牌してください。";
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
  if (!tile) return;

  if (tile.suit === "flower") {
    state.flowers[seat].push(tile);
    drawTile(seat, shouldRender);
    return;
  }

  state.hands[seat].push(tile);
  sortHand(state.hands[seat]);

  if (shouldRender) render();
}

function discardTile(seat, tileId, options = {}) {
  if (!state.started || seat !== currentSeat()) return;

  const hand = state.hands[seat];
  const index = hand.findIndex((tile) => tile.id === tileId);
  if (index === -1) return;

  const [tile] = hand.splice(index, 1);
  state.rivers[seat].push({ ...tile, riichi: false });

  const prefix = isPlayerSeat(seat) ? "あなた" : SEAT_LABELS[seat];
  dom.message.textContent = `${prefix}が${tile.label}を打牌。`;
  render();

  const delay = options.nextDelayMs ?? 380;
  window.setTimeout(() => {
    nextTurn();
  }, delay);
}

function maybeRunAiTurn() {
  clearAiTimer();
  if (!state.started) return;

  const seat = currentSeat();
  if (isPlayerSeat(seat)) return;

  const thinkMs = randomInt(AI_THINK_MIN_MS, AI_THINK_MAX_MS);
  state.aiTimerId = window.setTimeout(() => {
    state.aiTimerId = null;
    const tile = chooseAiDiscard(seat);
    if (!tile) return;
    discardTile(seat, tile.id, { nextDelayMs: 420 });
  }, thinkMs);
}

function chooseAiDiscard(seat) {
  const hand = state.hands[seat];
  if (hand.length === 0) return null;

  // Block 2では最小AI。孤立牌っぽい端・字牌を少し捨てやすくする。
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
  dom.wallText.textContent = `山: ${state.wall.length}`;
  dom.doraIndicator.replaceWith(createTileElement(state.doraIndicator || { label: "?", suit: "back" }, { small: true }));
  dom.doraIndicator = document.querySelector(".dora-box .tile");

  for (const s of SEATS) {
    renderSeat(s);
    const area = document.querySelector(`[data-seat="${s}"]`);
    area.classList.toggle("active", s === currentSeat() && state.started);
    area.classList.toggle("player-controlled", s === PLAYER_SEAT);
  }
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

  const canClick = seat === currentSeat() && state.started && isPlayerSeat(seat);

  for (const tile of state.hands[seat]) {
    const element = createTileElement(tile, {
      clickable: canClick,
      back: !isPlayerSeat(seat),
    });

    if (canClick) {
      element.addEventListener("click", () => discardTile(seat, tile.id));
    }

    handElement.appendChild(element);
  }

  for (const tile of state.rivers[seat]) {
    riverElement.appendChild(createTileElement(tile, { discarded: true }));
  }

  for (const tile of state.flowers[seat]) {
    flowerElement.appendChild(createTileElement(tile, { small: true }));
  }

  for (const meld of state.melds[seat]) {
    for (const tile of meld) {
      meldElement.appendChild(createTileElement(tile, { small: true }));
    }
  }
}

dom.newGameButton.addEventListener("click", startGame);
render();
