import { parse } from "acorn";
import type { ProjectFile, ReviewItem, SmokeIssue } from "./types";

const PLACEHOLDERS = /\b(lorem ipsum|todo|fixme|coming soon|placeholder|your text here|xxx)\b/i;

export function lintFile(path: string, content: string): SmokeIssue[] {
  if (!path.endsWith(".js")) return [];
  const issues: SmokeIssue[] = [];
  try {
    parse(content, { ecmaVersion: "latest", sourceType: "module" });
  } catch (error) {
    issues.push({ message: error instanceof Error ? error.message : "Syntax error", filename: path });
  }
  if (PLACEHOLDERS.test(content)) issues.push({ message: `Placeholder copy in ${path}`, filename: path });
  return issues;
}

export function reviewFiles(files: ProjectFile[]): ReviewItem[] {
  const js = files.filter((file) => file.path.endsWith(".js")).map((file) => file.content).join("\n");
  const html = files.find((file) => file.path === "index.html")?.content || "";
  const all = files.map((file) => file.content).join("\n");
  return [
    { id: "menu", ok: /id="start"|Start</.test(all), detail: "A start or menu control is present." },
    { id: "pause", ok: !/canvas|kaboom/.test(all) || /pause/i.test(all), detail: "Games can be paused." },
    { id: "save", ok: /createStore|localStorage/.test(js) || !/game|platform|rpg|shoot/i.test(html), detail: "Progress can be saved on the device." },
    { id: "sound", ok: /createSfx|AudioContext|kaboom/.test(js) || !/canvas/.test(all), detail: "Sound uses the local tone generator." },
    { id: "placeholders", ok: !PLACEHOLDERS.test(all), detail: "No placeholder copy." },
    { id: "offline", ok: !/https?:\/\//.test(all.replaceAll("http://www.w3.org/2000/svg", "")), detail: "No network URLs." },
  ];
}
