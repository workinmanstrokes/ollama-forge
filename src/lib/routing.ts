import type { Role } from "./types";

export type ModelFit = { name: string; sizeB: number; context: number };

export function inferModel(name: string, reportedContext?: number): ModelFit {
  const sizeMatch = name.match(/(\d+(?:\.\d+)?)\s*b/i);
  const sizeB = sizeMatch ? Number(sizeMatch[1]) : 7;
  const contextTag = name.match(/(\d+)\s*k/i);
  const context = reportedContext && reportedContext > 0
    ? reportedContext
    : contextTag
      ? Number(contextTag[1]) * 1024
      : sizeB >= 30
        ? 32768
        : sizeB >= 14
          ? 16384
          : 8192;
  return { name, sizeB, context };
}

export function assignRoles(names: string[]): Record<Role, string> {
  const ranked = names.map((name) => inferModel(name)).sort((a, b) => b.sizeB - a.sizeB || b.context - a.context);
  const fallback = ranked[0]?.name || "qwen2.5-coder:7b";
  const coder = ranked.find((model) => /coder|code/i.test(model.name))?.name || fallback;
  const big = ranked[0]?.name || coder;
  const mid = ranked[Math.min(1, Math.max(0, ranked.length - 1))]?.name || coder;
  return { architect: big, reviewer: big, planner: mid, coder, fixer: coder };
}

export function suggestedContext(names: string[]): number {
  const biggest = names.map((name) => inferModel(name)).sort((a, b) => b.context - a.context)[0];
  return biggest ? Math.min(32768, biggest.context) : 4096;
}
