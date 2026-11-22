import type { Plan, ProjectFile, ProjectKind } from "./types";
import { assertSafe } from "./safety";
import { paletteFromSeed } from "./palette";

const FILE_BLOCK = /<<<FILE\s+([^\n>]+)>>>\s*([\s\S]*?)<<<END>>>/g;

export function stripFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  return fence ? fence[1] : trimmed;
}

export function safeRelPath(input: string): string | null {
  const cleaned = input.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.length > 120) return null;
  const parts = cleaned.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return null;
  if (!/^[a-zA-Z0-9._/-]+$/.test(cleaned)) return null;
  return cleaned;
}

export function parseFileBlocks(text: string): { path: string; content: string }[] {
  const blocks: { path: string; content: string }[] = [];
  for (const match of text.matchAll(FILE_BLOCK)) {
    const path = safeRelPath(match[1] ?? "");
    if (!path) continue;
    blocks.push({ path, content: stripFences(match[2] ?? "") });
  }
  return blocks;
}

export function applyModelFiles(
  files: ProjectFile[],
  output: string,
  fallbackPath: string,
): { files: ProjectFile[]; applied: string[] } {
  let blocks = parseFileBlocks(output);
  if (blocks.length === 0) {
    const stripped = stripFences(output);
    const path = safeRelPath(fallbackPath);
    if (!path || !stripped) {
      throw new Error("The model did not return a file Forge could apply.");
    }
    blocks = [{ path, content: stripped }];
  }
  const next = files.map((file) => ({ ...file }));
  const applied: string[] = [];
  for (const block of blocks) {
    if (block.content.length > 200_000) {
      throw new Error(`${block.path} from the model is too large to apply.`);
    }
    const safe = assertSafe(block.content);
    if (!safe.ok) throw new Error(safe.reason);
    const index = next.findIndex((file) => file.path === block.path);
    if (index >= 0) next[index] = { path: block.path, content: block.content };
    else next.push({ path: block.path, content: block.content });
    applied.push(block.path);
  }
  return { files: next, applied };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizePalette(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const colors = value.filter((item): item is string => typeof item === "string" && /^#[0-9a-fA-F]{6}$/.test(item));
  return colors.length >= 5 ? colors.slice(0, 5) : fallback;
}

export function basicPlan(prompt: string, kind: ProjectKind, fallbackTitle: string): Plan {
  const titled = prompt.match(/Title:\s*([^\n]+)/i);
  const title = (titled?.[1] ?? fallbackTitle).trim().slice(0, 60) || fallbackTitle;
  return {
    title,
    summary: prompt.trim().slice(0, 280) || `A kid-safe ${kind} project.`,
    palette: paletteFromSeed(title),
    mechanics: prompt.trim().slice(0, 700),
    assertions: [],
  };
}

export function parsePlan(text: string, fallback: Plan): { plan: Plan; usedFallback: boolean } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { plan: fallback, usedFallback: true };
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    return {
      usedFallback: false,
      plan: {
        title: asString(raw.title, fallback.title).replace(/[<>&]/g, "").slice(0, 60),
        summary: asString(raw.summary, fallback.summary).slice(0, 400),
        palette: normalizePalette(raw.palette, fallback.palette),
        mechanics: asString(raw.mechanics, fallback.mechanics).slice(0, 800),
        assertions: Array.isArray(raw.assertions)
          ? raw.assertions.map((item) => String(item)).filter(Boolean).slice(0, 8)
          : [],
      },
    };
  } catch {
    return { plan: fallback, usedFallback: true };
  }
}

export function setHtmlTitle(html: string, title: string): string {
  const safe = title.replace(/[<>&]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safe}</title>`);
  }
  return html;
}

export function applyPalette(css: string, palette: string[]): string {
  const keys = ["--bg", "--accent", "--accent-2", "--ink", "--good"];
  let next = css;
  keys.forEach((key, index) => {
    const color = palette[index];
    if (!color) return;
    const pattern = new RegExp(`(${key}\\s*:\\s*)([^;]+)`, "i");
    if (pattern.test(next)) next = next.replace(pattern, `$1${color}`);
  });
  return next;
}

export function pickFileForError(files: ProjectFile[], issues: { message: string; filename?: string }[]): string {
  for (const issue of issues) {
    if (issue.filename && files.some((file) => file.path === issue.filename)) return issue.filename;
    const named = files.find((file) => issue.message.includes(file.path));
    if (named) return named.path;
  }
  if (files.some((file) => file.path === "main.js")) return "main.js";
  return files.find((file) => file.path.endsWith(".js"))?.path ?? files[0]?.path ?? "main.js";
}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "forge-project";
}
