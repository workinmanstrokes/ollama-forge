import type { ProjectFile, ProjectKind } from "./types";

const rawFiles = import.meta.glob("../../templates/**/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type TemplateInfo = {
  kind: ProjectKind;
  label: string;
  blurb: string;
  logicFile: string;
  title: string;
  chips: string[];
  multi?: boolean;
};

export const TEMPLATES: TemplateInfo[] = [
  {
    kind: "arcade",
    label: "Canvas arcade",
    blurb: "Catch sparks and dodge cinders on a touch canvas.",
    logicFile: "main.js",
    title: "Ember Dash",
    chips: ["Make the player faster", "Add a bigger score bonus"],
  },
  {
    kind: "game",
    label: "Vanilla game",
    blurb: "A small jump game made with plain HTML, CSS, and JS.",
    logicFile: "main.js",
    title: "Lantern Hop",
    chips: ["Make the player faster", "Space the rocks farther apart"],
  },
  {
    kind: "puzzle",
    label: "Puzzle",
    blurb: "A sliding tile puzzle that always starts solvable.",
    logicFile: "main.js",
    title: "Ember Tiles",
    chips: ["Add a congratulations message", "Use a 4 by 4 board"],
  },
  {
    kind: "idle",
    label: "Idle clicker",
    blurb: "Tap an anvil, buy helpers, and keep the sparks.",
    logicFile: "main.js",
    title: "Anvil Taps",
    chips: ["Make each tap worth more", "Lower the first upgrade cost"],
  },
  {
    kind: "quiz",
    label: "Quiz",
    blurb: "Multiple choice questions with a score at the end.",
    logicFile: "main.js",
    title: "Spark Quiz",
    chips: ["Add one more question about the ocean", "Make the correct answer easier to see"],
  },
  {
    kind: "utility",
    label: "Utility app",
    blurb: "A large-type timer with minute presets.",
    logicFile: "main.js",
    title: "Kiln Timer",
    chips: ["Add a 45 minute preset", "Make the time larger"],
  },
  {
    kind: "landing",
    label: "Landing page",
    blurb: "A single-page site with a hero, features, and a footer.",
    logicFile: "main.js",
    title: "Hearth & Crumb",
    chips: ["Rewrite the headline for a school bake sale", "Add a fourth treat card"],
  },
  {
    kind: "platformer",
    label: "Platformer",
    blurb: "Run, jump, pause, and save a best score across modules.",
    logicFile: "src/player.js",
    title: "Moss Run",
    chips: ["Make the player faster", "Add another coin"],
    multi: true,
  },
  {
    kind: "shooter",
    label: "Top-down",
    blurb: "A Kaboom scene where a lantern collects wisps.",
    logicFile: "src/main.js",
    title: "Wisp Light",
    chips: ["Make the lantern faster", "Add a second wisp"],
    multi: true,
  },
  {
    kind: "rpg",
    label: "RPG inventory",
    blurb: "Walk a small map and keep found items.",
    logicFile: "src/main.js",
    title: "Lantern Pack",
    chips: ["Add a compass to the map", "Make the note friendlier"],
    multi: true,
  },
  {
    kind: "cards",
    label: "Card game",
    blurb: "Match pairs of lantern cards.",
    logicFile: "src/main.js",
    title: "Pair Lanterns",
    chips: ["Add two more cards", "Change the hint text"],
    multi: true,
  },
  {
    kind: "productivity",
    label: "Productivity",
    blurb: "Tasks, a note, and settings with Preact.",
    logicFile: "src/main.js",
    title: "Hearth List",
    chips: ["Add a fourth starter task", "Make the empty note warmer"],
    multi: true,
  },
  {
    kind: "tracker",
    label: "Tracker",
    blurb: "A week of bars you can tap to log.",
    logicFile: "src/main.js",
    title: "Spark Tracker",
    chips: ["Start the week at zero", "Rename Saturday"],
    multi: true,
  },
  {
    kind: "chatapp",
    label: "Chat",
    blurb: "A local chat with canned, kid-safe replies.",
    logicFile: "src/main.js",
    title: "Courtyard Chat",
    chips: ["Add a reply about lemonade", "Make the greeting shorter"],
    multi: true,
  },
];

function projectPath(kind: string, filePath: string): string {
  const marker = `/templates/${kind}/`;
  const index = filePath.indexOf(marker);
  let relative = index >= 0 ? filePath.slice(index + marker.length) : filePath.split("/").pop() || filePath;
  if (relative.endsWith(".css.txt")) relative = relative.slice(0, -4);
  return relative;
}

export function getTemplate(kind: ProjectKind): { info: TemplateInfo; files: ProjectFile[] } {
  const info = TEMPLATES.find((item) => item.kind === kind);
  if (!info) throw new Error(`Unknown template ${kind}`);
  const files = Object.entries(rawFiles)
    .filter(([path]) => path.includes(`/templates/${kind}/`))
    .map(([filePath, content]) => ({ path: projectPath(kind, filePath), content }))
    .filter((file) => !file.path.endsWith(".map"))
    .sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path));
  return { info, files };
}

function rank(path: string): number {
  if (path === "index.html") return 0;
  if (path === "styles.css") return 1;
  if (path === "checks.js") return 8;
  if (path.startsWith("tests/")) return 9;
  return 2;
}
