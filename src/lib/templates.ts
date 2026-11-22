import type { ProjectFile, ProjectKind } from "./types";

const rawFiles = import.meta.glob("../../templates/*/*", {
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
];

const FILE_ORDER = ["index.html", "styles.css", "main.js", "checks.js"];

export function getTemplate(kind: ProjectKind): { info: TemplateInfo; files: ProjectFile[] } {
  const info = TEMPLATES.find((item) => item.kind === kind);
  if (!info) throw new Error(`Unknown template ${kind}`);
  const files = Object.entries(rawFiles)
    .filter(([path]) => path.includes(`/templates/${kind}/`))
    .map(([filePath, content]) => {
      const filename = filePath.split("/").pop() || filePath;
      const path = filename.endsWith(".css.txt") ? "styles.css" : filename;
      return { path, content };
    })
    .sort((a, b) => FILE_ORDER.indexOf(a.path) - FILE_ORDER.indexOf(b.path));
  return { info, files };
}
