import kaboom from "kaboom";
import { createSfx } from "forge-kit";

const TITLE = "Wisp Light";
const root = document.getElementById("app");
root.innerHTML = `<div class="shell"><p class="eyebrow">Top-down</p><h1 id="title"></h1><div id="stage"></div><p id="score">0 wisps</p><button id="start" type="button">Start</button></div>`;
document.getElementById("title").textContent = TITLE;
const sfx = createSfx();
let running = false;
let score = 0;
const k = kaboom({ width: 420, height: 220, background: [22, 14, 18], root: document.getElementById("stage") });
const player = k.add([k.pos(40, 90), k.rect(16, 16), k.area(), k.color(255, 176, 58), "player"]);
function spawn() {
  k.add([k.pos(k.rand(20, 390), k.rand(20, 180)), k.circle(6), k.area(), k.color(255, 210, 120), "wisp"]);
}
k.onUpdate(() => {
  if (!running) return;
  const speed = 140;
  if (k.isKeyDown("left") || k.isKeyDown("a")) player.move(-speed, 0);
  if (k.isKeyDown("right") || k.isKeyDown("d")) player.move(speed, 0);
  if (k.isKeyDown("up") || k.isKeyDown("w")) player.move(0, -speed);
  if (k.isKeyDown("down") || k.isKeyDown("s")) player.move(0, speed);
});
player.onCollide("wisp", (wisp) => {
  k.destroy(wisp);
  score += 1;
  document.getElementById("score").textContent = score + " wisps";
  sfx.coin();
  spawn();
});
document.getElementById("start").addEventListener("click", () => {
  running = true;
  if (k.get("wisp").length === 0) spawn();
  sfx.jump();
});
window.__forgePlay = {
  start() { document.getElementById("start").click(); },
  act() {},
  state() { return { score, running }; },
};
