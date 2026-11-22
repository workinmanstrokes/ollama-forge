import { useState } from "react";
import { lineDiff } from "../lib/diffview";
import { relativeTime } from "../lib/format";
import { saveProject } from "../lib/idb";
import { cloneFiles, commitFiles } from "../lib/projects";
import type { Project } from "../lib/types";

export function HistoryPane({ project, onProject }: { project: Project; onProject: (project: Project) => void }) {
  const [selected, setSelected] = useState(project.snapshots[project.snapshots.length - 1]?.id ?? "");
  const [filePath, setFilePath] = useState("main.js");
  const index = project.snapshots.findIndex((item) => item.id === selected);
  const snap = index >= 0 ? project.snapshots[index] : undefined;
  const previous = index > 0 ? project.snapshots[index - 1] : undefined;
  const before = previous?.files.find((file) => file.path === filePath)?.content ?? "";
  const after = snap?.files.find((file) => file.path === filePath)?.content ?? "";
  const rows = snap ? lineDiff(before, after) : [];

  async function rollback() {
    if (!snap) return;
    const next = commitFiles(project, cloneFiles(snap.files), "Rollback", `Restored ${snap.label}`);
    await saveProject(next);
    onProject(next);
  }

  return (
    <div className="history-pane">
      <div className="version-list" data-testid="version-list">
        {[...project.snapshots].reverse().map((item) => (
          <button key={item.id} type="button" className={item.id === selected ? "version selected" : "version"} onClick={() => setSelected(item.id)}>
            <strong>{item.label}</strong>
            <span>{relativeTime(item.createdAt)}</span>
            {item.note ? <span className="muted">{item.note}</span> : null}
          </button>
        ))}
      </div>
      {snap ? (
        <>
          <div className="button-row">
            <label className="field grow">
              <span>File</span>
              <select value={filePath} onChange={(event) => setFilePath(event.target.value)}>
                {snap.files.map((file) => <option key={file.path}>{file.path}</option>)}
              </select>
            </label>
            <button type="button" className="secondary" data-testid="rollback" onClick={() => void rollback()}>Roll back</button>
          </div>
          <div className="diff" data-testid="diff-view">
            {rows.map((row, rowIndex) => (
              <pre key={`${row.type}-${rowIndex}`} className={`diff-${row.type}`}>{row.type === "add" ? "+ " : row.type === "del" ? "- " : "  "}{row.text}</pre>
            ))}
          </div>
        </>
      ) : <p className="muted">No versions yet.</p>}
    </div>
  );
}
