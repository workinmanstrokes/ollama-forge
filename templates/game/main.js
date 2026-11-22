const TITLE = "Lantern Hop";
const PLAYER_SPEED = 220;

const root = document.getElementById("app");
root.innerHTML = `
  <div class="shell">
    <header class="hud">
      <div>
        <p class="eyebrow">Game</p>
        <h1 id="title"></h1>
      </div>
      <span id="score">0</span>
    </header>
    <div id="track">
      <div id="ground"></div>
      <div id="player" aria-label="Lantern runner">
        <span class="flame"></span>
        <span class="pack"></span>
        <span class="leg left"></span>
        <span class="leg right"></span>
      </div>
    </div>
    <p class="hint">Tap, click, or press space to jump.</p>
    <div id="over" hidden>
      <p id="over-text">The lantern rests.</p>
      <button id="restart" type="button">Run again</button>
    </div>
  </div>
`;

document.getElementById("title").textContent = TITLE;
const track = document.getElementById("track");
const player = document.getElementById("player");
const scoreEl = document.getElementById("score");
const over = document.getElementById("over");
let y = 0;
let vy = 0;
let playing = true;
let score = 0;
let obstacles = [];
let spawnIn = 1;
let last = performance.now();

function jump() {
  if (playing && y <= 0) vy = 620;
}
function clearRocks() {
  obstacles.forEach((item) => item.el.remove());
  obstacles = [];
}
function reset() {
  y = 0;
  vy = 0;
  playing = true;
  score = 0;
  spawnIn = 1;
  scoreEl.textContent = "0";
  over.hidden = true;
  clearRocks();
}
track.addEventListener("pointerdown", jump);
window.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "ArrowUp") {
    event.preventDefault();
    jump();
  }
});
document.getElementById("restart").addEventListener("click", reset);

function spawn() {
  const el = document.createElement("div");
  el.className = "rock";
  track.appendChild(el);
  obstacles.push({ x: track.clientWidth + 8, el });
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (playing) {
    vy -= 1700 * dt;
    y = Math.max(0, y + vy * dt);
    if (y === 0) vy = 0;
    score += dt * 12;
    scoreEl.textContent = String(Math.floor(score));
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawnIn = 1.15;
      spawn();
    }
    obstacles = obstacles.filter((item) => {
      item.x -= PLAYER_SPEED * dt;
      item.el.style.transform = "translateX(" + item.x + "px)";
      if (item.x < 78 && item.x > 28 && y < 42) {
        playing = false;
        document.getElementById("over-text").textContent = "You hopped " + Math.floor(score) + " steps.";
        over.hidden = false;
      }
      if (item.x < -40) {
        item.el.remove();
        return false;
      }
      return true;
    });
  }
  player.style.bottom = 28 + y + "px";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
