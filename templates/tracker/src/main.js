import { createTracker } from "./store.js";

const TITLE = "Spark Tracker";
const tracker = createTracker(TITLE);
const root = document.getElementById("app");
const max = () => Math.max(1, ...tracker.counts);

function render() {
  root.innerHTML = `<div class="shell"><p class="eyebrow">Tracker</p><h1 id="title"></h1><div class="bars" id="bars"></div><div id="days"></div></div>`;
  document.getElementById("title").textContent = TITLE;
  const bars = document.getElementById("bars");
  const days = document.getElementById("days");
  tracker.days.forEach((day, index) => {
    const bar = document.createElement("span");
    bar.style.height = Math.max(8, (tracker.counts[index] / max()) * 110) + "px";
    bars.append(bar);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = day + " " + tracker.counts[index];
    button.addEventListener("click", () => { tracker.add(index); render(); });
    days.append(button);
  });
}
render();
