import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { saveProject } from "../lib/idb";
import { approveNextMilestone } from "../lib/build";
import { generateIntoProject } from "../lib/generate";
import { cancelJob, getJob, startJob, subscribeJob, type JobView } from "../lib/jobs";
import type { DeviceFrame, EnvironmentName, ProjectFile, StudioTab } from "../lib/types";
import { useForge } from "../state/Store";
import { ChatPane } from "./ChatPane";
import { CodePane } from "./CodePane";
import { Dialog } from "./Dialog";
import { ExportPane } from "./ExportPane";
import { HistoryPane } from "./HistoryPane";
import { PreviewPane } from "./PreviewPane";
import { TestPane } from "./TestPane";
import { useMedia } from "./useMedia";

const TABS: { id: StudioTab; label: string }[] = [
  { id: "preview", label: "Preview" },
  { id: "code", label: "Code" },
  { id: "chat", label: "Chat" },
  { id: "test", label: "Test" },
  { id: "history", label: "History" },
];

export function Studio() {
  const { id } = useParams();
  const { ready, projects, upsert, reload, setActiveProjectId, link, settings } = useForge();
  const project = projects.find((item) => item.id === id);
  const wide = useMedia("(min-width: 960px)");
  const [tab, setTab] = useState<StudioTab>("preview");
  const [env, setEnv] = useState<EnvironmentName>("dev");
  const [device, setDevice] = useState<DeviceFrame>("phone");
  const [job, setJob] = useState<JobView | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [snapshotId, setSnapshotId] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const saveChain = useRef(Promise.resolve());

  useEffect(() => {
    if (!id) return;
    setActiveProjectId(id);
    return subscribeJob(id, setJob);
  }, [id, setActiveProjectId]);

  useEffect(() => {
    if (job?.done && !job.cancelled && !job.error) void reload();
  }, [job?.done, job?.cancelled, job?.error, reload]);

  useEffect(() => {
    if (!project) return;
    const status = project.build?.status;
    if ((status === "building" || status === "architecting") && !getJob(project.id)) {
      startJob(project.id, ({ signal, report }) => generateIntoProject(project.id, report, signal));
    }
  }, [project]);

  if (!ready) return <main className="page"><p className="muted">Opening the project…</p></main>;
  if (!project) {
    return (
      <main className="page">
        <h1>Project not found</h1>
        <Link className="primary" to="/">Back to projects</Link>
      </main>
    );
  }

  const snapshot = project.snapshots.find((item) => item.id === snapshotId) ?? project.snapshots[project.snapshots.length - 1];

  function onFiles(path: string, content: string) {
    const files = project!.files.map((file) => file.path === path ? { ...file, content } : file);
    const next = { ...project!, files, updatedAt: Date.now() };
    upsert(next);
    saveChain.current = saveChain.current.then(() => saveProject(next));
  }

  async function beginGeneration(fresh = false) {
    setConfirmRegen(false);
    setEnv("dev");
    setTab("chat");
    let current = project!;
    if (fresh) {
      current = { ...current, build: null };
      await saveProject(current);
      upsert(current);
    }
    startJob(current.id, ({ signal, report }) => generateIntoProject(current.id, report, signal));
  }

  async function approveMilestone() {
    const next = approveNextMilestone(project!);
    await saveProject(next);
    upsert(next);
    startJob(next.id, ({ signal, report }) => generateIntoProject(next.id, report, signal));
  }

  async function share() {
    if (!snapshot || link.mode !== "server") return;
    const root = settings.serverUrl.trim().replace(/\/$/, "");
    const response = await fetch(`${root}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: snapshot.id, name: project!.name, files: snapshot.files }),
    });
    const body = await response.json() as { url?: string; error?: string };
    setShareUrl(response.ok && body.url ? body.url : body.error || "Could not share this snapshot.");
  }

  const livePreview = <PreviewPane files={project.files} device={device} onDevice={setDevice} />;
  const tool = tab === "code"
    ? <CodePane project={project} onChange={onFiles} />
    : tab === "chat" || (tab === "preview" && wide)
      ? <ChatPane project={project} onProject={upsert} />
      : tab === "test"
        ? <TestPane project={project} onProject={upsert} />
        : tab === "history"
          ? <HistoryPane project={project} onProject={upsert} />
          : livePreview;

  return (
    <main className="studio">
      <header className="studio-top">
        <Link to="/" className="ghost back">Projects</Link>
        <div>
          <div className="title-row">
            <p className="kicker">{project.kind}</p>
            <p className={`status-pill ${link.status}`} role="status">{link.status === "online" ? "Online" : link.status === "offline" ? "Offline" : "Checking"}</p>
          </div>
          <h1 data-testid="project-title">{project.name}</h1>
          <p className="muted" data-testid="file-count">{project.files.length} files</p>
        </div>
        <div className="segmented" role="group" aria-label="Environment">
          {(["dev", "preview", "prod"] as EnvironmentName[]).map((item) => (
            <button key={item} type="button" data-testid={`env-${item}`} className={env === item ? "selected" : ""} aria-pressed={env === item} onClick={() => setEnv(item)}>
              {item === "dev" ? "Dev" : item === "preview" ? "Preview" : "Prod"}
            </button>
          ))}
        </div>
      </header>
      {job ? (
        <section className="stream-card" aria-live="polite">
          <div className="stream-head">
            <strong data-testid="generation-status">{job.phase}</strong>
            {job.done ? null : <button type="button" className="ghost" onClick={() => cancelJob(project.id)}>Cancel</button>}
          </div>
          {job.error ? <p className="error">{job.error}</p> : null}
          {!job.done && job.output ? <pre className="stream">{job.output}</pre> : null}
        </section>
      ) : null}
      {project.build?.spec ? (
        <div className="milestone-list">
          {project.build.spec.milestones.map((item) => (
            <p key={item.id} className="note">{item.title} · {item.status}</p>
          ))}
          {project.build.status === "awaiting" ? (
            <button type="button" className="primary" data-testid="approve-milestone" onClick={() => void approveMilestone()}>Build next milestone</button>
          ) : null}
          {project.build.status === "paused" ? (
            <button type="button" className="secondary" onClick={() => void beginGeneration(false)}>Resume build</button>
          ) : null}
          {project.build.review.length ? (
            <ul className="review-list">
              {project.build.review.map((item) => <li key={item.id}>{item.ok ? "Ready" : "Check"} · {item.detail}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
      {!project.plan && !project.build && !job ? <p className="note">This is the playable starter. Connect Ollama and regenerate to customize it.</p> : null}
      {env === "dev" ? (
        <div className={wide ? "studio-grid" : "studio-stack"}>
          <div className="studio-main">{tool}</div>
          {wide ? <div className="studio-side">{livePreview}</div> : null}
        </div>
      ) : null}
      {env === "preview" ? (
        <section className="preview-env">
          <label className="field">
            <span>Frozen snapshot</span>
            <select value={snapshot?.id ?? ""} onChange={(event) => setSnapshotId(event.target.value)}>
              {[...project.snapshots].reverse().map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          {snapshot ? <SnapshotFrame files={snapshot.files} device={device} onDevice={setDevice} /> : <p className="muted">Save a version before sharing a preview.</p>}
          {link.mode === "server" && snapshot ? (
            <button type="button" className="primary" onClick={() => void share()}>Share this snapshot on the LAN</button>
          ) : null}
          {shareUrl ? <p className="share-url" data-testid="share-url">{shareUrl}</p> : null}
        </section>
      ) : null}
      {env === "prod" ? <ExportPane project={project} files={project.files} /> : null}
      {env === "dev" ? (
        <div className="studio-actions">
          <nav className="studio-tabs" aria-label="Project">
            {TABS.map((item) => (
              <button key={item.id} type="button" data-testid={`tab-${item.id}`} className={tab === item.id ? "selected" : ""} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>
          <button type="button" className="secondary" onClick={() => { if (project.plan || project.build) setConfirmRegen(true); else void beginGeneration(false); }}>Regenerate</button>
        </div>
      ) : null}
      {confirmRegen ? (
        <Dialog
          title="Generate again?"
          body="Forge will ask the model for a new version. The current files stay in history so you can roll back."
          confirmLabel="Regenerate"
          onClose={() => setConfirmRegen(false)}
          onConfirm={() => void beginGeneration(true)}
        />
      ) : null}
    </main>
  );
}

function SnapshotFrame({ files, device, onDevice }: { files: ProjectFile[]; device: DeviceFrame; onDevice: (device: DeviceFrame) => void }) {
  return <PreviewPane files={files} device={device} onDevice={onDevice} />;
}
