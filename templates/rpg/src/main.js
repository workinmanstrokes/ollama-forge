import { createStore } from "forge-kit";
import { createWorld } from "./world.js";
import { createBag } from "./inventory.js";

const TITLE = "Lantern Pack";
const world = createWorld();
const bag = createBag();
const store = createStore(TITLE);
const saved = store.load();
const hero = { x: saved && saved.x || 0, y: saved && saved.y || 0 };
if (saved && saved.items) saved.items.forEach((name) => bag.add({ name }));

const root = document.getElementById("app");
root.innerHTML = `<div class="shell"><p class="eyebrow">RPG</p><h1 id="title"></h1><div id="grid" class="grid"></div><div id="bag" class="bag"></div><div class="pad"><button type="button" id="up">Up</button><button type="button" id="down">Down</button><button type="button" id="left">Left</button><button type="button" id="right">Right</button></div><p id="note"></p></div>`;
document.getElementById("title").textContent = TITLE;

function draw() {
  const grid = document.getElementById("grid");
  grid.replaceChildren();
  for (let y = 0; y < world.rows; y++) {
    for (let x = 0; x < world.cols; x++) {
      const cell = document.createElement("div");
      cell.className = "cell" + (hero.x === x && hero.y === y ? " me" : "");
      if (world.items.some((item) => item.x === x && item.y === y && !bag.has(item.name))) cell.className += " item";
      grid.append(cell);
    }
  }
  const pocket = document.getElementById("bag");
  pocket.replaceChildren();
  for (const name of bag.items) {
    const chip = document.createElement("span");
    chip.textContent = name;
    pocket.append(chip);
  }
  store.save({ x: hero.x, y: hero.y, items: bag.items });
}
function move(dx, dy) {
  hero.x = Math.max(0, Math.min(world.cols - 1, hero.x + dx));
  hero.y = Math.max(0, Math.min(world.rows - 1, hero.y + dy));
  const found = world.items.find((item) => item.x === hero.x && item.y === hero.y && !bag.has(item.name));
  if (found) {
    bag.add(found);
    document.getElementById("note").textContent = "Found the " + found.name + ".";
  }
  draw();
}
document.getElementById("up").onclick = () => move(0, -1);
document.getElementById("down").onclick = () => move(0, 1);
document.getElementById("left").onclick = () => move(-1, 0);
document.getElementById("right").onclick = () => move(1, 0);
draw();
window.__forgePlay = { start() {}, act(name) { if (name === "right") move(1, 0); }, state() { return { x: hero.x, items: bag.items.length }; } };
