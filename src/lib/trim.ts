export function contextCharBudget(contextSize: number): number {
  const size = Number.isFinite(contextSize) ? contextSize : 4096;
  return Math.max(2000, Math.min(20000, Math.floor(size * 2)));
}

export function trimMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const marker = "\n/* …trimmed for context… */\n";
  const budget = Math.max(0, maxChars - marker.length);
  const head = Math.floor(budget * 0.55);
  const tail = budget - head;
  return text.slice(0, head) + marker + text.slice(text.length - tail);
}
