const TITLE = "Ember Tiles";

const root = document.getElementById("app");
root.innerHTML = `
  <div class="shell">
    <div>
      <p class="eyebrow">Puzzle</p>
      <h1 id="title"></h1>
    </div>
    <div class="meta">
      <span id="moves">0 moves</span>
      <button id="shuffle" class="secondary" type="button">Shuffle</button>
    </div>
    <div class="board" id="board"></div>
    <p class="win" id="win"></p>
  </div>
`;
document.getElementById("title").textContent = TITLE;

let tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
let moves = 0;
const board = document.getElementById("board");
const movesEl = document.getElementById("moves");
const winEl = document.getElementById("win");

function neighbors(index) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const list = [];
  if (row > 0) list.push(index - 3);
  if (row < 2) list.push(index + 3);
  if (col > 0) list.push(index - 1);
  if (col < 2) list.push(index + 1);
  return list;
}

function render() {
  board.replaceChildren();
  tiles.forEach((value, index) => {
    if (value === 0) {
      const hole = document.createElement("div");
      hole.className = "hole";
      board.appendChild(hole);
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    button.textContent = String(value);
    button.addEventListener("click", () => slide(index));
    board.appendChild(button);
  });
  movesEl.textContent = moves + (moves === 1 ? " move" : " moves");
  winEl.textContent = tiles.join("") === "123456780" ? "The embers are in order." : "";
}

function slide(index) {
  const empty = tiles.indexOf(0);
  if (!neighbors(empty).includes(index)) return;
  tiles[empty] = tiles[index];
  tiles[index] = 0;
  moves += 1;
  render();
}

function shuffle() {
  tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  for (let step = 0; step < 40; step++) {
    const empty = tiles.indexOf(0);
    const options = neighbors(empty);
    const pick = options[Math.floor(Math.random() * options.length)];
    tiles[empty] = tiles[pick];
    tiles[pick] = 0;
  }
  moves = 0;
  render();
}

document.getElementById("shuffle").addEventListener("click", shuffle);
shuffle();
