const TITLE = "Hearth & Crumb";
const COPY = {
  eyebrow: "Saturday morning",
  headline: "Warm bread, cold juice, and a table for the block.",
  lede: "A kid-run bake table in the courtyard. Everything is wrapped, labeled, and gone by noon.",
  features: [
    { title: "Cinnamon rolls", text: "Six to a tin. The first tin is always for the neighbors who helped set up." },
    { title: "Lemon bars", text: "Tart, dusty with sugar, and cut into squares that fit a small hand." },
    { title: "Story cards", text: "Each bag includes a one-line story about who baked it." },
  ],
  when: "Courtyard table · 9:00 to 12:00",
  cta: "Save a seat at the table",
  foot: "Cash in a jar. No online orders. If it rains, we move under the stairs.",
};

const root = document.getElementById("app");
const wrap = document.createElement("div");
wrap.className = "wrap";

const hero = document.createElement("section");
hero.className = "hero";
const eyebrow = document.createElement("p");
eyebrow.className = "eyebrow";
eyebrow.textContent = COPY.eyebrow;
const title = document.createElement("h1");
title.id = "title";
title.textContent = TITLE;
const lede = document.createElement("p");
lede.className = "lede";
lede.textContent = COPY.lede;
const headline = document.createElement("p");
headline.className = "lede";
headline.textContent = COPY.headline;
hero.append(eyebrow, title, headline, lede);

const grid = document.createElement("section");
grid.className = "grid";
COPY.features.forEach((feature) => {
  const card = document.createElement("article");
  card.className = "card";
  const heading = document.createElement("h2");
  heading.textContent = feature.title;
  const text = document.createElement("p");
  text.textContent = feature.text;
  card.append(heading, text);
  grid.appendChild(card);
});

const when = document.createElement("section");
when.className = "when";
const whenText = document.createElement("p");
whenText.textContent = COPY.when;
const cta = document.createElement("a");
cta.className = "pill";
cta.href = "#table";
cta.id = "table";
cta.textContent = COPY.cta;
when.append(whenText, cta);

const foot = document.createElement("footer");
foot.textContent = COPY.foot;
wrap.append(hero, grid, when, foot);
root.appendChild(wrap);
document.title = TITLE;
