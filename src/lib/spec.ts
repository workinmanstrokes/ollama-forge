import type { Milestone, ModuleSpec, ProjectFile, ProjectSpec } from "./types";

export function fallbackSpec(title: string, files: ProjectFile[]): ProjectSpec {
  const modules: ModuleSpec[] = files
    .filter((file) => file.path.endsWith(".js") && file.path !== "checks.js" && !file.path.startsWith("tests/"))
    .map((file) => ({
      path: file.path,
      summary: file.path,
      exports: [],
      imports: [],
      milestone: "play",
    }));
  modules.push({ path: "src/credits.js", summary: "One-line credits.", exports: ["CREDIT"], imports: [], milestone: "polish" });
  const milestones: Milestone[] = [
    { id: "play", title: "Playable build", summary: "Menu, play, and save.", files: modules.filter((item) => item.milestone === "play").map((item) => item.path), status: "approved" },
    { id: "polish", title: "Credits", summary: "Add a credits line.", files: ["src/credits.js"], status: "pending" },
  ];
  return {
    title,
    summary: "A multi-file kid-safe project.",
    features: ["menu", "pause", "save", "sound"],
    screens: ["menu", "play"],
    dataModel: [{ name: "Save", fields: ["best"] }],
    modules,
    milestones,
    palette: ["#140e12", "#ff6a2c", "#ffb03a", "#fff6ec", "#5ee0a0"],
  };
}

export function parseSpec(text: string, fallback: ProjectSpec): { spec: ProjectSpec; usedFallback: boolean } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { spec: fallback, usedFallback: true };
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Partial<ProjectSpec>;
    if (!Array.isArray(raw.modules) || !Array.isArray(raw.milestones)) return { spec: fallback, usedFallback: true };
    const spec: ProjectSpec = {
      title: String(raw.title || fallback.title).replace(/[<>&]/g, "").slice(0, 60),
      summary: String(raw.summary || fallback.summary).slice(0, 400),
      features: asStrings(raw.features),
      screens: asStrings(raw.screens),
      dataModel: Array.isArray(raw.dataModel)
        ? raw.dataModel.map((item) => ({ name: String(item.name || "Data"), fields: asStrings(item.fields) })).slice(0, 12)
        : [],
      modules: raw.modules.map((item) => ({
        path: String(item.path || ""),
        summary: String(item.summary || ""),
        exports: asStrings(item.exports),
        imports: asStrings(item.imports),
        milestone: String(item.milestone || "play"),
      })).filter((item) => item.path.endsWith(".js")),
      milestones: raw.milestones.map((item, index) => ({
        id: String(item.id || `m${index}`),
        title: String(item.title || `Milestone ${index + 1}`),
        summary: String(item.summary || ""),
        files: asStrings(item.files).filter((path) => path.endsWith(".js")),
        status: index === 0 ? "approved" : "pending",
      })),
      palette: Array.isArray(raw.palette) ? raw.palette.map(String).slice(0, 5) : fallback.palette,
    };
    if (!spec.milestones.length) return { spec: fallback, usedFallback: true };
    return { spec, usedFallback: false };
  } catch {
    return { spec: fallback, usedFallback: true };
  }
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean).slice(0, 24) : [];
}

export const ARCHITECT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    features: { type: "array", items: { type: "string" } },
    screens: { type: "array", items: { type: "string" } },
    dataModel: { type: "array", items: { type: "object", properties: { name: { type: "string" }, fields: { type: "array", items: { type: "string" } } }, required: ["name", "fields"] } },
    modules: { type: "array", items: { type: "object", properties: { path: { type: "string" }, summary: { type: "string" }, exports: { type: "array", items: { type: "string" } }, imports: { type: "array", items: { type: "string" } }, milestone: { type: "string" } }, required: ["path", "summary", "milestone"] } },
    milestones: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, summary: { type: "string" }, files: { type: "array", items: { type: "string" } } }, required: ["id", "title", "files"] } },
    palette: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "modules", "milestones"],
} as const;
