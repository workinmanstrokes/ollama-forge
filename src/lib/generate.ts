import { uid } from "./format";
import { getProject, saveProject } from "./idb";
import { chatStream, generateText, resolveApiBase } from "./ollama";
import { applyModelFiles, applyPalette, basicPlan, parsePlan, pickFileForError, setHtmlTitle } from "./parse";
import { coderMessages, editorMessages, fixerMessages, namePrompt, plannerMessages } from "./prompts";
import { commitFiles } from "./projects";
import { loadSettings } from "./settings";
import { getTemplate } from "./templates";
import { contextCharBudget } from "./trim";
import type { Project, SmokeIssue } from "./types";

type Report = (update: { phase?: string; token?: string; reset?: boolean }) => void;

async function clientSettings() {
  const settings = loadSettings();
  const api = await resolveApiBase(settings);
  return { settings, api, budget: contextCharBudget(settings.contextSize) };
}

export async function generateIntoProject(projectId: string, report: Report, signal: AbortSignal): Promise<void> {
  const project = await getProject(projectId);
  if (!project) throw new Error("That project is missing.");
  const { settings, api, budget } = await clientSettings();
  const template = getTemplate(project.kind);
  report({ phase: "Planning", reset: true });
  const planText = await chatStream({
    base: api.base,
    model: settings.models.planner,
    messages: plannerMessages(project.kind, project.prompt, template.info.blurb),
    temperature: settings.temperature,
    contextSize: settings.contextSize,
    signal,
    onToken: (token) => report({ token }),
  });
  const parsed = parsePlan(planText, basicPlan(project.prompt, project.kind, template.info.title));
  const logic = project.files.find((file) => file.path === template.info.logicFile);
  if (!logic) throw new Error("This template has no logic file.");
  report({ phase: `Writing ${logic.path}`, reset: true });
  const codeText = await chatStream({
    base: api.base,
    model: settings.models.coder,
    messages: coderMessages({
      kind: project.kind,
      plan: parsed.plan,
      path: logic.path,
      content: logic.content,
      budget,
    }),
    temperature: settings.temperature,
    contextSize: settings.contextSize,
    signal,
    onToken: (token) => report({ token }),
  });
  const applied = applyModelFiles(project.files, codeText, logic.path);
  const files = applied.files.map((file) => {
    if (file.path === "styles.css") return { ...file, content: applyPalette(file.content, parsed.plan.palette) };
    if (file.path === "index.html") return { ...file, content: setHtmlTitle(file.content, parsed.plan.title) };
    return file;
  });
  const summary = parsed.usedFallback
    ? `The plan was not valid JSON, so Forge used a basic plan for “${parsed.plan.title}”.`
    : `Planned “${parsed.plan.title}” and updated ${applied.applied.join(", ")}.`;
  const next = commitFiles(project, files, "Generated", parsed.plan.summary, parsed.plan);
  next.chat = [...project.chat, { id: uid(), role: "assistant", content: summary, createdAt: Date.now() }];
  await saveProject(next);
  report({ phase: "Saved" });
}

export async function completeEdit(project: Project, instruction: string, onToken: (token: string) => void, signal: AbortSignal): Promise<Project> {
  const { settings, api, budget } = await clientSettings();
  const template = getTemplate(project.kind);
  const file = project.files.find((item) => item.path === template.info.logicFile);
  if (!file) throw new Error("There is no file to edit.");
  const text = await chatStream({
    base: api.base,
    model: settings.models.coder,
    messages: editorMessages({ instruction, path: file.path, content: file.content, budget }),
    temperature: settings.temperature,
    contextSize: settings.contextSize,
    signal,
    onToken,
  });
  const applied = applyModelFiles(project.files, text, file.path);
  const next = commitFiles(project, applied.files, "Edit", instruction);
  const now = Date.now();
  next.chat = [
    ...project.chat,
    { id: uid(), role: "user", content: instruction, createdAt: now },
    { id: uid(), role: "assistant", content: `Updated ${applied.applied.join(", ")}.`, createdAt: now },
  ];
  await saveProject(next);
  return next;
}

export async function applyFix(project: Project, issues: SmokeIssue[], attempt: number, onToken: (token: string) => void, signal: AbortSignal): Promise<Project> {
  const { settings, api, budget } = await clientSettings();
  const path = pickFileForError(project.files, issues);
  const file = project.files.find((item) => item.path === path);
  if (!file) throw new Error("No file matches that error.");
  const text = await chatStream({
    base: api.base,
    model: settings.models.fixer,
    messages: fixerMessages({ path, content: file.content, issues, budget }),
    temperature: settings.temperature,
    contextSize: settings.contextSize,
    signal,
    onToken,
  });
  const applied = applyModelFiles(project.files, text, path);
  const next = commitFiles(project, applied.files, `Fix ${attempt}`, issues.map((issue) => issue.message).join("\n"));
  await saveProject(next);
  return next;
}

export async function askForNames(seed: string, signal?: AbortSignal): Promise<string> {
  const { settings, api } = await clientSettings();
  return generateText({
    base: api.base,
    model: settings.models.coder,
    prompt: namePrompt(seed),
    temperature: settings.temperature,
    contextSize: settings.contextSize,
    signal,
  });
}
