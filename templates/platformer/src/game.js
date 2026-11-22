import { PLAYER_SPEED, createPlayer } from "./player.js";
import { createLevel } from "./level.js";
import { createAudio } from "./audio.js";
import { createSave } from "./save.js";
import { createFx } from "./particles.js";
import { createInput } from "./input.js";
import { mountShell } from "./ui.js";

export function createGame(root, title) {
  const ui = mountShell(root, title);
  const ctx = ui.canvas.getContext("2d");
  const player = createPlayer();
  const level = createLevel();
  const audio = createAudio();
  const save = createSave(title);
  const fx = createFx();
  const input = createInput(ui.canvas);
  let mode = "menu";
  let score = 0;
  let last = performance.now();
  let jumped = false;

  function overlaps(a, b) {
    return a.x < b.x + (b.w || 14) && a.x + a.w > b.x && a.y < b.y + (b.h || 14) && a.y + a.h > b.y;
  }

  function start() {
    mode = "play";
    ui.menu.hidden = true;
    ui.pause.hidden = true;
    score = 0;
    player.x = 36;
    player.y = 120;
    player.vy = 0;
    for (const coin of level.coins) coin.got = false;
    ui.score.textContent = "0";
  }

  function draw() {
    ctx.fillStyle = "#1a1018";
    ctx.fillRect(0, 0, 360, 240);
    ctx.fillStyle = "#5c3b2a";
    for (const block of level.platforms) ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.fillStyle = "#ffb03a";
    for (const coin of level.coins) {
      if (coin.got) continue;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#5ee0a0";
    ctx.fillRect(level.goal.x, level.goal.y, level.goal.w, level.goal.h);
    ctx.fillStyle = "#ff6a2c";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = "#fff1cf";
    ctx.fillRect(player.x + 6, player.y + 4, 6, 6);
    fx.draw(ctx);
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (mode === "play") {
      if (input.keys.jump && !jumped && player.jump()) audio.jump();
      jumped = input.keys.jump;
      player.step(dt, input.keys, level.platforms);
      for (const coin of level.coins) {
        if (!coin.got && overlaps(player, { x: coin.x - 6, y: coin.y - 6, w: 12, h: 12 })) {
          coin.got = true;
          score += 1;
          ui.score.textContent = String(score);
          audio.coin();
          fx.burst(coin.x, coin.y, "#ffb03a");
        }
      }
      if (overlaps(player, level.goal) && level.coins.every((coin) => coin.got)) {
        mode = "menu";
        ui.menu.hidden = false;
        audio.win();
        save.keep(score);
        document.getElementById("menu-title").textContent = title + " · best " + save.best();
      }
    }
    fx.step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  document.getElementById("start").addEventListener("click", start);
  document.getElementById("resume").addEventListener("click", () => {
    mode = "play";
    ui.pause.hidden = true;
  });
  document.getElementById("pausebtn").addEventListener("click", () => {
    if (mode !== "play") return;
    mode = "pause";
    ui.pause.hidden = false;
    audio.pause();
  });
  for (const name of ["left", "jump", "right"]) {
    const button = document.getElementById(name);
    button.addEventListener("pointerdown", () => input.tap(name, true));
    button.addEventListener("pointerup", () => input.tap(name, false));
  }
  requestAnimationFrame(frame);

  return {
    start,
    act(name) {
      if (name === "start") start();
      if (name === "pause") document.getElementById("pausebtn").click();
      if (name === "left" || name === "right" || name === "jump") input.tap(name, true);
    },
    release() {
      input.tap("left", false);
      input.tap("right", false);
      input.tap("jump", false);
    },
    state() {
      return { mode, score, x: Math.round(player.x), speed: PLAYER_SPEED };
    },
  };
}
