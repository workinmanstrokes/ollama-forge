import type { ProjectFile, ProjectSpec } from "./types";
import { trimMiddle } from "./trim";

export function summarizeFile(content: string): string {
  const comment = content.match(/\/\*\*([\s\S]*?)\*\//)?.[1] || content.match(/^\s*\/\/\s*(.+)$/m)?.[1] || "";
  const exports = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  const bits = [comment.trim(), exports.length ? `exports ${exports.join(", ")}` : ""].filter(Boolean);
  return bits.join(" · ").slice(0, 180) || "source file";
}

export function projectMap(files: ProjectFile[], summaries: Record<string, string>, spec: ProjectSpec | null, budget: number): string {
  const lines = (spec?.modules || files.map((file) => ({ path: file.path, summary: summaries[file.path] || summarizeFile(file.content), exports: [], imports: [], milestone: "" })))
    .map((mod) => `- ${mod.path}: ${summaries[mod.path] || mod.summary}`);
  return trimMiddle(lines.join("\n"), Math.min(budget, 2500));
}

export function searchProject(files: ProjectFile[], query: string, limit = 3): { path: string; excerpt: string; score: number }[] {
  const terms = query.toLowerCase().split(/[^a-z0-9_]+/).filter((term) => term.length > 2);
  return files
    .map((file) => {
      const hay = `${file.path}\n${file.content}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
      const hit = terms.map((term) => file.content.toLowerCase().indexOf(term)).find((index) => index >= 0) ?? 0;
      return { path: file.path, score, excerpt: file.content.slice(Math.max(0, hit - 80), hit + 220) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
