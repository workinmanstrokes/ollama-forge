import { useRef, useState } from "react";
import { applyFix } from "../lib/generate";
import { fixLoop } from "../lib/fixloop";
import { runSmokeTest } from "../lib/preview";
import type { Project, SmokeIssue } from "../lib/types";

export function TestPane({ project, onProject }: { project: Project; onProject: (project: Project) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const abort = useRef<AbortController | null>(null);
  const [assertions, setAssertions] = useState(true);
  const [issues, setIssues] = useState<SmokeIssue[] | null>(null);
  const [status, setStatus] = useState("Not run yet");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");

  async function smoke() {
    const node = host.current;
    if (!node) return [];
    return runSmokeTest(projectRef.current.files, node, { assertions, signal: abort.current?.signal });
  }

  async function run() {
    setBusy(true);
    setStatus("Running smoke test…");
    try {
      const found = await smoke();
      setIssues(found);
      setStatus(found.length ? "Smoke test failed" : "Smoke test passed");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Smoke test failed");
    } finally {
      setBusy(false);
    }
  }

  async function fix() {
    if (!issues?.length) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setLog("");
    try {
      const result = await fixLoop({
        initialIssues: issues,
        signal: controller.signal,
        smoke: async () => {
          setStatus("Retesting…");
          return smoke();
        },
        fix: async (current, attempt) => {
          setStatus(`Fixing, attempt ${attempt} of 3`);
          setLog("");
          const next = await applyFix(
            projectRef.current,
            current,
            attempt,
            (token) => setLog((value) => value + token),
            controller.signal,
          );
          projectRef.current = next;
          onProject(next);
          return true;
        },
      });
      setIssues(result.issues);
      if (result.cancelled) setStatus("Cancelled");
      else if (result.issues.length) setStatus(`Still failing after ${result.attempts} attempts`);
      else setStatus("Smoke test passed");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") setStatus("Cancelled");
      else setStatus(error instanceof Error ? error.message : "Fix failed");
    } finally {
      setBusy(false);
    }
  }

  const summary = issues?.length ? `${status}: ${issues.map((issue) => issue.message).join(" ")}` : status;
  return (
    <div className="test-pane">
      <div className="button-row">
        <button type="button" className="primary" data-testid="smoke-run" disabled={busy} onClick={() => void run()}>Run smoke test</button>
        {issues && issues.length > 0 ? (
          <button type="button" className="secondary" data-testid="fix-it" disabled={busy} onClick={() => void fix()}>Fix it</button>
        ) : null}
        {busy ? <button type="button" className="ghost" onClick={() => abort.current?.abort()}>Cancel</button> : null}
      </div>
      <label className="check">
        <input type="checkbox" checked={assertions} onChange={(event) => setAssertions(event.target.checked)} />
        Run assertion checks
      </label>
      <p data-testid="smoke-result" role="status">{summary}</p>
      {log ? <pre className="stream">{log}</pre> : null}
      <div className="smoke-host" ref={host} />
    </div>
  );
}
