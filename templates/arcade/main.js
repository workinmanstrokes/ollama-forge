const TITLE = "Ember Dash";
const PLAYER_SPEED = 280;

const root = document.getElementById("app");
root.innerHTML = `
  <div class="shell">
    <header class="hud">
      <div>
        <p class="eyebrow">Arcade</p>
        <h1 id="title"></h1>
      </div>
      <div class="stats">
        <span id="score">0</span>
        <span id="lives"></span>
      </div>
    </header>
    <canvas id="game" width="360" height="520"></canvas>
    <p class="hint">Drag, or use the arrow keys. Catch sparks and dodge cinders.</p>
    <div id="over" hidden>
      <div>
        <p id="over-text">The lantern cools.</p>
        <button id="restart" type="button">Play again</button>
      </div>
    </div>
  </div>
`;

document.getElementById("title").textContent = TITLE;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const over = document.getElementById("over");
const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (err) { /* sandboxed preview has no storage */ }
  },
};

let best = Number(store.get("forge-best-" + TITLE) || 0);
let playerX = 180;
const keys = { left: false, right: false };
let dragging = false;
let sparks = [];
let cinders = [];
let particles = [];
let score = 0;
let lives = 3;
let playing = true;
let spawn = 0;
let last = performance.now();

function hearts() {
  livesEl.textContent = "♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, 3 - lives));
}
hearts();

function reset() {
  playerX = 180;
  sparks = [];
  cinders = [];
  particles = [];
  score = 0;
  lives = 3;
  playing = true;
  spawn = 0;
  over.hidden = true;
  hearts();
  scoreEl.textContent = "0";
}

document.getElementById("restart").addEventListener("click", reset);
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") keys.left = true;
  if (event.key === "ArrowRight") keys.right = true;
});
window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft") keys.left = false;
  if (event.key === "ArrowRight") keys.right = false;
});
canvas.addEventListener("pointerdown", (event) => {
  dragging = true;
  movePointer(event);
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (dragging) movePointer(event);
});
canvas.addEventListener("pointerup", () => { dragging = false; });

function movePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  playerX = Math.max(24, Math.min(336, (event.clientX - rect.left) * scale));
}

function burst(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({ x, y, vx: Math.cos(i) * 70, vy: Math.sin(i) * 70 - 30, life: 0.45, color });
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (playing) {
    if (keys.left) playerX -= PLAYER_SPEED * dt;
    if (keys.right) playerX += PLAYER_SPEED * dt;
    playerX = Math.max(24, Math.min(336, playerX));
    spawn -= dt;
    if (spawn <= 0) {
      spawn = Math.max(0.32, 1.05 - score / 500);
      const x = 30 + Math.random() * 300;
      if (Math.random() < 0.72) sparks.push({ x, y: -16, vy: 110 + score * 0.4 });
      else cinders.push({ x, y: -16, vy: 130 + score * 0.35 });
    }
    const caught = (item, near, onHit) => {
      item.y += item.vy * dt;
      if (Math.abs(item.x - playerX) < near && item.y > 448 && item.y < 506) {
        onHit(item);
        return false;
      }
      return item.y < 540;
    };
    sparks = sparks.filter((item) => caught(item, 28, (spark) => {
      score += 5;
      scoreEl.textContent = String(score);
      burst(spark.x, spark.y, "#ffb03a");
    }));
    cinders = cinders.filter((item) => caught(item, 24, (cinder) => {
      lives -= 1;
      hearts();
      burst(cinder.x, cinder.y, "#ff8d7a");
      if (lives <= 0) {
        playing = false;
        best = Math.max(best, score);
        store.set("forge-best-" + TITLE, String(best));
        document.getElementById("over-text").textContent = "Score " + score + " · best " + best;
        over.hidden = false;
      }
    }));
  }
  particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  });
  particles = particles.filter((particle) => particle.life > 0);

  const sky = ctx.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, "#3a1824");
  sky.addColorStop(1, "#120c0c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 360, 520);
  ctx.fillStyle = "rgba(255, 160, 70, 0.08)";
  for (let i = 0; i < 18; i++) ctx.fillRect((i * 53) % 360, (i * 97) % 420, 2, 2);
  ctx.fillStyle = "rgba(255, 176, 58, 0.16)";
  ctx.fillRect(0, 470, 360, 50);

  sparks.forEach((spark) => {
    ctx.fillStyle = "rgba(255, 176, 58, 0.28)";
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe3a4";
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  cinders.forEach((cinder) => {
    ctx.fillStyle = "#4a2a28";
    ctx.beginPath();
    ctx.moveTo(cinder.x, cinder.y - 11);
    ctx.lineTo(cinder.x + 10, cinder.y);
    ctx.lineTo(cinder.x, cinder.y + 11);
    ctx.lineTo(cinder.x - 10, cinder.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff6a2c";
    ctx.fillRect(cinder.x - 2, cinder.y - 2, 4, 4);
  });
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life * 2);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 3, 3);
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = "#4a2c22";
  roundRect(playerX - 22, 468, 44, 28, 9);
  ctx.fill();
  ctx.fillStyle = "#ffb03a";
  ctx.beginPath();
  ctx.arc(playerX, 482, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff1cf";
  ctx.beginPath();
  ctx.arc(playerX, 482, 3, 0, Math.PI * 2);
  ctx.fill();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
