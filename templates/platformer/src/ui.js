export function mountShell(root, title) {
  root.innerHTML = `
    <div class="shell">
      <header class="hud">
        <div>
          <p class="eyebrow">Platformer</p>
          <h1 id="title"></h1>
        </div>
        <strong id="score">0</strong>
      </header>
      <div class="stage">
        <canvas id="game" width="360" height="240"></canvas>
        <div id="menu" class="overlay"><div><h2 id="menu-title"></h2><p class="hint">Catch the sparks, then reach the lantern.</p><button id="start" class="play" type="button">Start</button></div></div>
        <div id="pause" class="overlay" hidden><div><h2>Paused</h2><button id="resume" class="play" type="button">Resume</button></div></div>
      </div>
      <div class="pad">
        <button type="button" id="left">Left</button>
        <button type="button" id="jump">Jump</button>
        <button type="button" id="right">Right</button>
        <button type="button" id="pausebtn">Pause</button>
      </div>
      <p class="hint">Arrows or the pad. Jump from the ground or a ledge.</p>
    </div>`;
  document.getElementById("title").textContent = title;
  document.getElementById("menu-title").textContent = title;
  return {
    canvas: document.getElementById("game"),
    score: document.getElementById("score"),
    menu: document.getElementById("menu"),
    pause: document.getElementById("pause"),
  };
}
