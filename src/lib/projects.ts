import { uid } from "./format";
import type { Plan, Project, ProjectFile, ProjectKind, Snapshot } from "./types";
import { getTemplate } from "./templates";

export function cloneFiles(files: ProjectFile[]): ProjectFile[] {
  return files.map((file) => ({ path: file.path, content: file.content }));
}

export function makeSnapshot(files: ProjectFile[], label: string, note: string): Snapshot {
  return { id: uid(), createdAt: Date.now(), label, note, files: cloneFiles(files) };
}

export function createStarter(kind: ProjectKind, prompt: string): Project {
  const template = getTemplate(kind);
  const now = Date.now();
  const files = cloneFiles(template.files);
  const text = prompt.trim();
  return {
    id: uid(),
    name: template.info.title,
    kind,
    prompt: text,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    files,
    plan: null,
    chat: text ? [{ id: uid(), role: "user", content: text, createdAt: now }] : [],
    snapshots: [makeSnapshot(files, "Starter", "Template before generation")],
  };
}

export function commitFiles(project: Project, files: ProjectFile[], label: string, note: string, plan?: Plan | null): Project {
  const snapshots = [...project.snapshots, makeSnapshot(files, label, note)].slice(-30);
  return {
    ...project,
    name: plan?.title || project.name,
    plan: plan === undefined ? project.plan : plan,
    files: cloneFiles(files),
    snapshots,
    revision: project.revision + 1,
    updatedAt: Date.now(),
  };
}
