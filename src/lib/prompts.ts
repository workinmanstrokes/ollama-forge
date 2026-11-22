import type { Plan, SmokeIssue } from "./types";
import { trimMiddle } from "./trim";

export const SAFETY = `Kid-safe rules:
- No sexual content, nudity, romance, or dating.
- No graphic violence, gore, horror, or real-world harm.
- Cartoon collecting, jumping, puzzles, and timers are fine.
- Do not collect personal data.
- Do not use fetch, XMLHttpRequest, WebSocket, EventSource, or any http or https URL.
- The file must run offline in a browser from a single folder.`;

export function plannerMessages(kind: string, prompt: string, notes: string) {
  return [
    {
      role: "system" as const,
      content: `You are the planner for Ollama Forge, a local app and game maker.\n${SAFETY}\nReturn ONLY a JSON object with keys title, summary, palette, mechanics, assertions.\npalette is an array of 5 hex colors: dark background, accent, second accent, light text, success.\nassertions is a short array of strings.\nNo markdown.`,
    },
    {
      role: "user" as const,
      content: `Project type: ${kind}\nTemplate: ${notes}\nUser request:\n${prompt}`,
    },
  ];
}

export function coderMessages(opts: { kind: string; plan: Plan; path: string; content: string; budget: number }) {
  return [
    {
      role: "system" as const,
      content: `You write exactly one file for a kid-safe browser ${opts.kind}.\n${SAFETY}\nKeep working entry points. Keep const TITLE and const PLAYER_SPEED if they exist.\nReply with the complete ${opts.path} only, wrapped exactly as <<<FILE ${opts.path}>>> then the file, then <<<END>>>.`,
    },
    {
      role: "user" as const,
      content: `Plan:\n${JSON.stringify({ title: opts.plan.title, summary: opts.plan.summary, mechanics: opts.plan.mechanics })}\n\nCurrent ${opts.path}:\n<<<FILE ${opts.path}>>>\n${trimMiddle(opts.content, opts.budget)}\n<<<END>>>`,
    },
  ];
}

export function fixerMessages(opts: { path: string; content: string; issues: SmokeIssue[]; budget: number }) {
  const errors = opts.issues.map((issue) => issue.message).slice(0, 8).join("\n");
  return [
    {
      role: "system" as const,
      content: `You fix bugs in one file for a kid-safe browser app.\n${SAFETY}\nReturn the full corrected file as:\n<<<FILE ${opts.path}>>>\ncomplete file\n<<<END>>>`,
    },
    {
      role: "user" as const,
      content: `Errors:\n${errors}\n\n<<<FILE ${opts.path}>>>\n${trimMiddle(opts.content, opts.budget)}\n<<<END>>>`,
    },
  ];
}

export function editorMessages(opts: { instruction: string; path: string; content: string; budget: number }) {
  return [
    {
      role: "system" as const,
      content: `You edit one file for a kid-safe browser app.\n${SAFETY}\nFollow the instruction and keep the app working.\nReturn the full file as:\n<<<FILE ${opts.path}>>>\ncomplete file\n<<<END>>>`,
    },
    {
      role: "user" as const,
      content: `Instruction: ${opts.instruction}\n\n<<<FILE ${opts.path}>>>\n${trimMiddle(opts.content, opts.budget)}\n<<<END>>>`,
    },
  ];
}

export function namePrompt(seed: string): string {
  return `List 4 short kid-safe names for handmade art about "${seed.replace(/"/g, "")}". One name per line. No numbers. No adult themes. No links.`;
}
