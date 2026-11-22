import type { Settings } from "./types";

export const SETTINGS_KEY = "ollama-forge.settings.v1";

export const defaultSettings: Settings = {
  ollamaUrl: "http://localhost:11434",
  serverUrl: "",
  connection: "auto",
  models: {
    architect: "qwen2.5-coder:7b",
    reviewer: "qwen2.5-coder:7b",
    planner: "qwen2.5-coder:7b",
    coder: "qwen2.5-coder:7b",
    fixer: "qwen2.5-coder:7b",
  },
  knownModels: [],
  temperature: 0.4,
  contextSize: 4096,
  autoRoute: true,
  localImage: false,
};

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(): Settings {
  const raw = storage()?.getItem(SETTINGS_KEY);
  if (!raw) return structuredClone(defaultSettings);
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...defaultSettings,
      ...parsed,
      models: { ...defaultSettings.models, ...parsed.models },
      knownModels: Array.isArray(parsed.knownModels) ? parsed.knownModels.filter((item) => typeof item === "string") : [],
      temperature: clamp(Number(parsed.temperature ?? defaultSettings.temperature), 0, 1),
      contextSize: [2048, 4096, 8192, 16384, 32768].includes(Number(parsed.contextSize)) ? Number(parsed.contextSize) : 4096,
      autoRoute: parsed.autoRoute !== false,
      localImage: parsed.localImage === true,
    };
  } catch {
    return structuredClone(defaultSettings);
  }
}

export function saveSettings(settings: Settings): void {
  storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
