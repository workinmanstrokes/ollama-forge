import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveProject } from "../lib/idb";
import { startJob } from "../lib/jobs";
import { generateIntoProject } from "../lib/generate";
import { createStarter } from "../lib/projects";
import { TEMPLATES } from "../lib/templates";
import type { ProjectKind } from "../lib/types";
import { useForge } from "../state/Store";

export function NewProject() {
  const { link, upsert, setActiveProjectId } = useForge();
  const [kind, setKind] = useState<ProjectKind>("arcade");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const online = link.status === "online";

  async function create() {
    const text = prompt.trim();
    if (!text) {
      setError("Describe what you want to make.");
      return;
    }
    setBusy(true);
    setError("");
    const project = createStarter(kind, text);
    await saveProject(project);
    upsert(project);
    setActiveProjectId(project.id);
    if (online) {
      startJob(project.id, ({ signal, report }) => generateIntoProject(project.id, report, signal));
    }
    navigate(`/project/${project.id}`);
  }

  return (
    <main className="page">
      <p className="kicker">New project</p>
      <h1>Pick a starter</h1>
      <div className="template-grid">
        {TEMPLATES.map((template) => (
          <button
            key={template.kind}
            type="button"
            className={kind === template.kind ? "template-card selected" : "template-card"}
            aria-pressed={kind === template.kind}
            data-testid={`template-${template.kind}`}
            onClick={() => setKind(template.kind)}
          >
            <KindMark kind={template.kind} />
            <strong>{template.label}</strong>
            <span>{template.blurb}</span>
          </button>
        ))}
      </div>
      <label className="field">
        <span>What should it be?</span>
        <textarea
          data-testid="prompt"
          rows={5}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="A bright arcade game about catching falling stars. Title: Star Catch"
        />
      </label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button type="button" className="primary" data-testid="create-project" disabled={busy} onClick={() => void create()}>
        {online ? "Create and generate" : "Create starter"}
      </button>
      {online ? null : <p className="muted">Ollama looks offline, so Forge will keep the playable starter. Connect a model, then regenerate.</p>}
    </main>
  );
}

function KindMark({ kind }: { kind: ProjectKind }) {
  return (
    <svg viewBox="0 0 64 40" className="kind-mark" aria-hidden="true">
      {kind === "arcade" ? <path d="M8 30h48M14 30V18h8v12M28 30V10h8v20M42 30V16h8v14" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "game" ? <path d="M10 28c8-16 14-16 18 0M36 22h14M40 18v8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /> : null}
      {kind === "puzzle" ? <path d="M10 8h18v10H10zM28 8h18v10H28zM10 22h18v10H10zM28 22h18v10H28z" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "idle" ? <path d="M12 24h40l-4 6H16zM22 24V14h20v10" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "quiz" ? <path d="M14 10h36v20H14zM22 18h8M34 18h8" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "utility" ? <circle cx="32" cy="20" r="12" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "landing" ? <path d="M8 30V14h48v16M8 18h48" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
    </svg>
  );
}
