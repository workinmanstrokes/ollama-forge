import { diffLines } from "diff";

export type DiffRow = { type: "add" | "del" | "same"; text: string };

export function lineDiff(before: string, after: string): DiffRow[] {
  const parts = diffLines(before, after);
  const rows: DiffRow[] = [];
  for (const part of parts) {
    const type = part.added ? "add" : part.removed ? "del" : "same";
    const lines = part.value.replace(/\n$/, "").split("\n");
    for (const line of lines) rows.push({ type, text: line });
  }
  return rows;
}
