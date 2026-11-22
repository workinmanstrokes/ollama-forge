import { uid } from "./format";
import { getProject, saveProject } from "./idb";
import { chatStream, resolveApiBase } from "./ollama";
import { applyModelFiles, applyPalette, setHtmlTitle } from "./parse";
import { commitFiles } from "./projects";
import { loadSettings } from "./settings";
import { ARCHITECT_SCHEMA, fallbackSpec, parseSpec } from "./spec";
import { projectMap, summarizeFile } from "./map";
import { snippetFor } from "./snippets";
import { reviewFiles } from "./quality";
import { getTemplate } from "./templates";
import { contextCharBudget, trimMiddle } from "./trim";
import type { BuildState, Milestone, Project, ProjectFile } from "./types";
import { SAFETY } from "./prompts";

type Report = (update: { phase?: string; token?: string; reset?: boolean }) => void;

function blankBuild(): BuildState {
  return { status: "idle", spec: null, summaries: {}, nextFile: null, review: [], error: "", updatedAt: Date.now() };
}

export async function buildMulti(projectId: string, report: Report, signal: AbortSignal): Promise<void> {
  let project = await getProject(projectId);
  if (!project) throw new Error("That project is missing.");
  const settings = loadSettings();
  const api = await resolveApiBase(settings);
  const template = getTemplate(project.kind);
  const budget = contextCharBudget(settings.contextSize);
  let build = project.build || blankBuild();

  if (!build.spec) {
    build = { ...build, status: "architecting", error: "" };
    project = await persist(project, build);
    report({ phase: "Architecting", reset: true });
    const tree = project.files.map((file) => `- ${file.path}`).join("\n");
    const text = await chatStream({
      base: api.base,
      model: settings.models.architect,
      temperature: Math.min(settings.temperature, 0.4),
      contextSize: settings.contextSize,
      format: ARCHITECT_SCHEMA,
      signal,
      messages: [
        { role: "system", content: `You are the architect for Ollama Forge.\n${SAFETY}\nReturn only JSON matching the schema. Modules are ES modules. Keep the starter file paths. Put a later credits file on a second milestone.` },
        { role: "user", content: `Type: ${project.kind}\nRequest: ${project.prompt}\nStarter: ${template.info.blurb}\nFile tree:\n${tree}` },
      ],
      onToken: (token) => report({ token }),
    });
    const fallback = fallbackSpec(template.info.title, project.files);
    const parsed = parseSpec(text, fallback);
    build.spec = parsed.spec;
    build.summaries = Object.fromEntries(project.files.map((file) => [file.path, summarizeFile(file.content)]));
    project = await persist(project, build, parsed.spec.title);
  }

  const spec = build.spec;
  if (!spec) throw new Error("The architect did not return a project spec.");
  const milestone = activeMilestone(spec.milestones);
  if (!milestone) {
    build.status = "awaiting";
    await persist(project, build);
    report({ phase: "Waiting for approval", reset: true });
    return;
  }
  milestone.status = "building";
  build.status = "building";
  for (const path of milestone.files) {
    if (signal.aborted) {
      build.status = "paused";
      build.nextFile = path;
      await persist(project, build);
      return;
    }
    build.nextFile = path;
    await persist(project, build);
    report({ phase: `Writing ${path}`, reset: true });
    const current = project.files.find((file) => file.path === path);
    const moduleSpec = spec.modules.find((item) => item.path === path);
    const seed = current?.content || `export const CREDIT = ${JSON.stringify(`Made in Forge: ${spec.title}`)};\n`;
    const text = await chatStream({
      base: api.base,
      model: settings.models.coder,
      temperature: settings.temperature,
      contextSize: settings.contextSize,
      signal,
      messages: [
        { role: "system", content: `You write one ES module for a kid-safe browser ${project.kind}.\n${SAFETY}\nKeep imports and exports working.\n${snippetFor(path, moduleSpec?.summary || "")}\nReply with <<<FILE ${path}>>> then the file, then <<<END>>>.` },
        { role: "user", content: `Spec module: ${JSON.stringify(moduleSpec || { path })}\nProject map:\n${projectMap(project.files, build.summaries, spec, budget)}\n\n<<<FILE ${path}>>>\n${trimMiddle(seed, budget)}\n<<<END>>>` },
      ],
      onToken: (token) => report({ token }),
    });
    const applied = applyModelFiles(project.files, text, path);
    let files = applied.files;
    if (!files.some((file) => file.path === path)) files = [...files, { path, content: seed }];
    files = files.map((file) => {
      if (file.path === "styles.css" && spec.palette.length) return { ...file, content: applyPalette(file.content, spec.palette) };
      if (file.path === "index.html") return { ...file, content: setHtmlTitle(file.content, spec.title) };
      return file;
    });
    const written = files.find((file) => file.path === path);
    if (written) build.summaries[path] = summarizeFile(written.content);
    project = commitFiles(project, files, "Generated", path, { ...project.plan, title: spec.title, summary: spec.summary, palette: spec.palette, mechanics: spec.features.join(", "), assertions: [] });
    project.build = { ...build, updatedAt: Date.now() };
    await saveProject(project);
  }
  milestone.status = "ready";
  const waiting = spec.milestones.find((item) => item.status === "pending");
  if (waiting) {
    build.status = "awaiting";
    build.nextFile = null;
    project.build = build;
    project.chat = [...project.chat, { id: uid(), role: "assistant", content: `${milestone.title} is ready. Approve “${waiting.title}” when you want the next files.`, createdAt: Date.now() }];
    await saveProject(project);
    report({ phase: "Waiting for approval", reset: true });
    return;
  }
  build.status = "reviewing";
  report({ phase: "Reviewing", reset: true });
  build.review = reviewFiles(project.files);
  let notes = build.review.filter((item) => !item.ok).map((item) => item.detail).join(" ");
  try {
    const reviewText = await chatStream({
      base: api.base,
      model: settings.models.reviewer,
      temperature: 0.2,
      contextSize: settings.contextSize,
      format: "json",
      signal,
      messages: [
        { role: "system", content: `You review a kid-safe browser project. Return JSON {"notes":"string","ok":true}. Flag placeholder copy.` },
        { role: "user", content: projectMap(project.files, build.summaries, spec, budget) },
      ],
    });
    const parsed = JSON.parse(reviewText.slice(reviewText.indexOf("{"), reviewText.lastIndexOf("}") + 1)) as { notes?: string };
    if (parsed.notes) notes = `${notes} ${parsed.notes}`.trim();
  } catch {
    notes = notes || "Reviewed with the local checklist.";
  }
  build.status = "done";
  build.nextFile = null;
  project.build = build;
  project.chat = [...project.chat, { id: uid(), role: "assistant", content: notes || `Built ${spec.title}. The checklist is clean.`, createdAt: Date.now() }];
  await saveProject(project);
  report({ phase: "Saved" });
}

function activeMilestone(milestones: Milestone[]): Milestone | undefined {
  return milestones.find((item) => item.status === "approved" || item.status === "building");
}

async function persist(project: Project, build: BuildState, title?: string): Promise<Project> {
  const next: Project = { ...project, build: { ...build, updatedAt: Date.now() }, name: title || project.name, updatedAt: Date.now() };
  await saveProject(next);
  return next;
}

export function approveNextMilestone(project: Project): Project {
  const spec = project.build?.spec;
  if (!spec) return project;
  const next = spec.milestones.find((item) => item.status === "pending");
  if (next) next.status = "approved";
  return {
    ...project,
    build: { ...(project.build || blankBuild()), spec, status: "building", error: "", updatedAt: Date.now() },
  };
}

export function emptyFile(path: string, title: string): ProjectFile {
  return { path, content: `export const CREDIT = ${JSON.stringify(`Made in Forge: ${title}`)};\n` };
}
