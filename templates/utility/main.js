const TITLE = "Kiln Timer";
const PRESETS = [1, 5, 15, 25];

const root = document.getElementById("app");
root.innerHTML = `
  <div class="shell">
    <div>
      <p class="eyebrow">Utility</p>
      <h1 id="title"></h1>
    </div>
    <p id="time">05:00</p>
    <div class="presets" id="presets"></div>
    <div class="controls">
      <button class="primary" id="toggle" type="button">Start</button>
      <button id="reset" type="button">Reset</button>
    </div>
    <p id="done"></p>
  </div>
`;
document.getElementById("title").textContent = TITLE;

let chosen = 5 * 60;
let remaining = chosen;
let running = false;
let last = 0;
const timeEl = document.getElementById("time");
const doneEl = document.getElementById("done");
const toggle = document.getElementById("toggle");

function format(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}
function paint() {
  timeEl.textContent = format(remaining);
  toggle.textContent = running ? "Pause" : remaining === 0 ? "Start" : "Start";
}
function beep() {
  try {
    const context = new AudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = 660;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.25);
    setTimeout(() => context.close(), 400);
  } catch (err) { /* audio can be blocked until a gesture settles */ }
}
function choose(minutes) {
  running = false;
  chosen = minutes * 60;
  remaining = chosen;
  doneEl.textContent = "";
  paint();
}
PRESETS.forEach((minutes) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = minutes + "m";
  button.addEventListener("click", () => choose(minutes));
  document.getElementById("presets").appendChild(button);
});
toggle.addEventListener("click", () => {
  if (remaining === 0) remaining = chosen;
  running = !running;
  last = performance.now();
  doneEl.textContent = "";
  paint();
});
document.getElementById("reset").addEventListener("click", () => choose(chosen / 60));

function frame(now) {
  if (running) {
    const dt = (now - last) / 1000;
    last = now;
    remaining = Math.max(0, remaining - dt);
    if (remaining === 0) {
      running = false;
      doneEl.textContent = "Time.";
      beep();
    }
    timeEl.textContent = format(Math.ceil(remaining));
    toggle.textContent = running ? "Pause" : "Start";
  }
  requestAnimationFrame(frame);
}
choose(5);
requestAnimationFrame(frame);
