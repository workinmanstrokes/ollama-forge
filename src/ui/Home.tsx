import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { relativeTime } from "../lib/format";
import { TEMPLATES } from "../lib/templates";
import type { Project } from "../lib/types";
import { useForge } from "../state/Store";
import { Dialog } from "./Dialog";
import { Logo } from "./Logo";

export function Home() {
  const { ready, projects, remove } = useForge();
  const [pending, setPending] = useState<Project | null>(null);
  const navigate = useNavigate();
  return (
    <main className="page">
      <section className="hero-block">
        <p className="kicker">Local models only</p>
        <h1>Make a small app or game on your machine.</h1>
        <p className="lede">Forge plans, writes, previews, and patches projects with the Ollama models already on your PC or phone. The meter stays at zero.</p>
        <Link className="primary" to="/new" data-testid="new-project">New app or game</Link>
      </section>
      <section>
        <h2>Your projects</h2>
        {!ready ? <p className="muted">Opening the workshop…</p> : null}
        {ready && projects.length === 0 ? (
          <div className="empty">
            <Logo size={64} />
            <p>No projects yet. Start from a playable template, then let a local model tune it.</p>
          </div>
        ) : null}
        <div className="project-list">
          {projects.map((project) => {
            const kind = TEMPLATES.find((item) => item.kind === project.kind)?.label ?? project.kind;
            return (
              <article key={project.id} className="project-card">
                <button type="button" className="card-open" onClick={() => navigate(`/project/${project.id}`)}>
                  <span className={`kind-stripe kind-${project.kind}`} />
                  <span>
                    <strong>{project.name}</strong>
                    <span className="muted">{kind} · {relativeTime(project.updatedAt)}</span>
                  </span>
                </button>
                <button type="button" className="ghost" onClick={() => setPending(project)} aria-label={`Delete ${project.name}`}>Delete</button>
              </article>
            );
          })}
        </div>
      </section>
      {pending ? (
        <Dialog
          title={`Delete ${pending.name}?`}
          body="This removes the project from this browser. Copies already saved on the PC stay where they are."
          confirmLabel="Delete"
          danger
          onClose={() => setPending(null)}
          onConfirm={() => {
            void remove(pending.id);
            setPending(null);
          }}
        />
      ) : null}
    </main>
  );
}
