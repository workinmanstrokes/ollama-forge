const TITLE = "Anvil Taps";
const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (err) { /* sandboxed preview */ }
  },
};

const root = document.getElementById("app");
root.innerHTML = `
  <div class="shell">
    <div>
      <p class="eyebrow">Idle</p>
      <h1 id="title"></h1>
    </div>
    <p class="sparks" id="sparks">0</p>
    <p class="rate" id="rate">1 spark per tap</p>
    <button id="tap" type="button">Strike the anvil</button>
    <div class="upgrades" id="upgrades"></div>
  </div>
`;
document.getElementById("title").textContent = TITLE;

const catalog = [
  { id: "bellows", name: "Bellows", detail: "+1 spark per tap", cost: 15, click: 1, rate: 0, owned: 0 },
  { id: "apprentice", name: "Apprentice", detail: "+1 spark each second", cost: 50, click: 0, rate: 1, owned: 0 },
  { id: "furnace", name: "Furnace", detail: "+5 sparks each second", cost: 200, click: 0, rate: 5, owned: 0 },
];

let sparks = 0;
const saved = store.get("forge-idle-" + TITLE);
if (saved) {
  try {
    const data = JSON.parse(saved);
    sparks = Number(data.sparks) || 0;
    catalog.forEach((item) => {
      const found = (data.owned || {})[item.id];
      if (found) {
        item.owned = found.owned;
        item.cost = found.cost;
      }
    });
  } catch (err) { /* keep defaults */ }
}

function perClick() {
  return 1 + catalog.reduce((sum, item) => sum + item.click * item.owned, 0);
}
function perSecond() {
  return catalog.reduce((sum, item) => sum + item.rate * item.owned, 0);
}
function persist() {
  const owned = {};
  catalog.forEach((item) => { owned[item.id] = { owned: item.owned, cost: item.cost }; });
  store.set("forge-idle-" + TITLE, JSON.stringify({ sparks, owned }));
}
function render() {
  document.getElementById("sparks").textContent = Math.floor(sparks).toLocaleString() + " sparks";
  document.getElementById("rate").textContent = perClick() + " per tap · " + perSecond() + " per second";
  const box = document.getElementById("upgrades");
  box.replaceChildren();
  catalog.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade";
    button.disabled = sparks < item.cost;
    const label = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = item.name + " · " + item.owned;
    label.append(name, document.createTextNode(item.detail));
    const price = document.createElement("span");
    price.textContent = Math.ceil(item.cost).toLocaleString();
    button.append(label, price);
    button.addEventListener("click", () => buy(item.id));
    box.appendChild(button);
  });
}
function buy(id) {
  const item = catalog.find((entry) => entry.id === id);
  if (!item || sparks < item.cost) return;
  sparks -= item.cost;
  item.owned += 1;
  item.cost = Math.ceil(item.cost * 1.65);
  persist();
  render();
}
document.getElementById("tap").addEventListener("click", () => {
  sparks += perClick();
  persist();
  render();
});
setInterval(() => {
  const gain = perSecond();
  if (gain > 0) {
    sparks += gain;
    persist();
    render();
  }
}, 1000);
render();
