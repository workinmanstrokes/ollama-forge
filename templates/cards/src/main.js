import { shuffled } from "./deck.js";
import { createSfx } from "forge-kit";

const TITLE = "Pair Lanterns";
const sfx = createSfx();
let cards = shuffled();
let pick = [];
const root = document.getElementById("app");
root.innerHTML = `<div class="shell"><p class="eyebrow">Cards</p><h1 id="title"></h1><div id="board" class="board"></div><p id="note">Find the pairs.</p><button id="again" type="button">Shuffle</button></div>`;
document.getElementById("title").textContent = TITLE;

function render() {
  const board = document.getElementById("board");
  board.replaceChildren();
  cards.forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card" + (card.open || card.done ? " open" : "");
    button.textContent = card.open || card.done ? card.face : "•";
    button.addEventListener("click", () => flip(index));
    board.append(button);
  });
}
function flip(index) {
  const card = cards[index];
  if (card.done || card.open || pick.length === 2) return;
  card.open = true;
  pick.push(card);
  sfx.jump();
  if (pick.length === 2) {
    if (pick[0].face === pick[1].face) {
      pick.forEach((item) => { item.done = true; });
      sfx.coin();
      pick = [];
      if (cards.every((item) => item.done)) document.getElementById("note").textContent = "All pairs found.";
    } else {
      setTimeout(() => {
        pick.forEach((item) => { item.open = false; });
        pick = [];
        render();
      }, 500);
    }
  }
  render();
}
document.getElementById("again").onclick = () => {
  cards = shuffled();
  pick = [];
  document.getElementById("note").textContent = "Find the pairs.";
  render();
};
render();
