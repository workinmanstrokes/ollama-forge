import { lazy, Suspense, useState } from "react";
import type { Project } from "../lib/types";

const CodeEditor = lazy(() => import("./Editor").then((mod) => ({ default: mod.CodeEditor })));

export function CodePane({ project, onChange }: { project: Project; onChange: (path: string, content: string) => void }) {
  const [path, setPath] = useState("main.js");
  const file = project.files.find((item) => item.path === path) ?? project.files[0];
  if (!file) return <p className="muted">This project has no files.</p>;
  const injected = project.files.some((item) => item.content.includes("player crashed"));
  return (
    <div className="code-pane">
      <span data-testid="file-sync" style={{ display: "none" }}>{injected ? "injected" : "ready"}</span>
      <div className="file-chips" role="tablist" aria-label="Files">
        {project.files.map((item) => (
          <button
            key={item.path}
            type="button"
            role="tab"
            aria-selected={item.path === file.path}
            className={item.path === file.path ? "selected" : ""}
            onClick={() => setPath(item.path)}
          >
            {item.path}
          </button>
        ))}
      </div>
      <div className="editor-wrap">
        <Suspense fallback={<p className="muted">Opening the editor…</p>}>
          <CodeEditor key={`${file.path}:${project.revision}`} path={file.path} value={file.content} onChange={(content) => onChange(file.path, content)} />
        </Suspense>
      </div>
    </div>
  );
}
