const SEATS = ["east", "south", "west"];
const SEAT_LABELS = {
  east: "東家",
  south: "南家",
  west: "西家",
};

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
  dom.message.textContent = "東家から開始。手牌をクリックして打牌してください。";
  render();
}

function currentSeat() {
  return SEATS[state.turnIndex];
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

  drawTile(seat, true);
  dom.message.textContent = `${SEAT_LABELS[seat]}がツモりました。打牌してください。`;
  render();
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

function discardTile(seat, tileId) {
  if (!state.started || seat !== currentSeat()) return;

  const hand = state.hands[seat];
  const index = hand.findIndex((tile) => tile.id === tileId);
  if (index === -1) return;

  const [tile] = hand.splice(index, 1);
  state.rivers[seat].push({ ...tile, riichi: false });
  dom.message.textContent = `${SEAT_LABELS[seat]}が${tile.label}を打牌。`;
  render();

  window.setTimeout(() => {
    nextTurn();
  }, 380);
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

  return element;
}

function render() {
  dom.turnText.textContent = `${SEAT_LABELS[currentSeat()]}の手番`;
  dom.wallText.textContent = `山: ${state.wall.length}`;
  dom.doraIndicator.replaceWith(createTileElement(state.doraIndicator || { label: "?", suit: "back" }, { small: true }));
  dom.doraIndicator = document.querySelector(".dora-box .tile");

  for (const seat of SEATS) {
    renderSeat(seat);
    const area = document.querySelector(`[data-seat="${seat}"]`);
    area.classList.toggle("active", seat === currentSeat() && state.started);
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

  for (const tile of state.hands[seat]) {
    const element = createTileElement(tile, {
      clickable: seat === currentSeat() && state.started,
      back: seat !== "east",
    });

    if (seat === currentSeat() && state.started) {
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
