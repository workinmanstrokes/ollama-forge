import type { SmokeIssue } from "./types";

export async function fixLoop(opts: {
  initialIssues: SmokeIssue[];
  max?: number;
  smoke: () => Promise<SmokeIssue[]>;
  fix: (issues: SmokeIssue[], attempt: number) => Promise<boolean>;
  signal?: AbortSignal;
}): Promise<{ attempts: number; issues: SmokeIssue[]; cancelled: boolean }> {
  const max = opts.max ?? 3;
  let issues = opts.initialIssues;
  let attempts = 0;
  while (issues.length > 0 && attempts < max) {
    if (opts.signal?.aborted) return { attempts, issues, cancelled: true };
    attempts += 1;
    const changed = await opts.fix(issues, attempts);
    if (!changed || opts.signal?.aborted) break;
    issues = await opts.smoke();
  }
  return { attempts, issues, cancelled: Boolean(opts.signal?.aborted) };
}
