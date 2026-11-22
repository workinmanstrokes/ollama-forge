import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deleteProject, listProjects, saveProject } from "../lib/idb";
import { listModels, resolveApiBase, type ServerHealth } from "../lib/ollama";
import { loadSettings, saveSettings } from "../lib/settings";
import type { Project, Settings } from "../lib/types";

export type LinkState = {
  status: "checking" | "online" | "offline";
  detail: string;
  mode: "server" | "direct" | "unknown";
  server: ServerHealth | null;
  models: string[];
};

type StoreValue = {
  ready: boolean;
  settings: Settings;
  updateSettings: (next: Settings) => void;
  projects: Project[];
  reload: () => Promise<void>;
  upsert: (project: Project) => void;
  remove: (id: string) => Promise<void>;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  link: LinkState;
  refreshLink: () => Promise<LinkState>;
};

const StoreContext = createContext<StoreValue | null>(null);

function offlineDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : "Ollama is offline";
  if (/failed to fetch|networkerror|load failed|timed out/i.test(message)) {
    return "Couldn't reach Ollama. Check the address, or start it on this machine.";
  }
  return message;
}

const initialLink: LinkState = {
  status: "checking",
  detail: "Looking for Ollama",
  mode: "unknown",
  server: null,
  models: [],
};

export function ForgeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [projects, setProjects] = useState<Project[]>([]);
  const [ready, setReady] = useState(false);
  const [link, setLink] = useState<LinkState>(initialLink);
  const [activeProjectId, setActiveId] = useState<string | null>(() => sessionStorage.getItem("forge.active"));

  const reload = useCallback(async () => {
    setProjects(await listProjects());
  }, []);

  const refreshId = useRef(0);
  const refreshLink = useCallback(async () => {
    const id = ++refreshId.current;
    setLink((current) => ({ ...current, status: "checking", detail: "Looking for Ollama" }));
    try {
      const current = loadSettings();
      const api = await resolveApiBase(current);
      const listed = await listModels(api.base);
      const models = listed.models.map((model) => model.name).filter(Boolean);
      const version = listed.version ? `Ollama ${listed.version}` : "Ollama";
      const next: LinkState = {
        status: "online",
        detail: `${version} · ${models.length} model${models.length === 1 ? "" : "s"} · ${models.join(", ")}`,
        mode: api.mode,
        server: api.server,
        models,
      };
      if (refreshId.current !== id) return next;
      setSettings((prev) => {
        const saved = { ...prev, knownModels: models };
        saveSettings(saved);
        return saved;
      });
      setLink(next);
      return next;
    } catch (error) {
      const next: LinkState = {
        status: "offline",
        detail: offlineDetail(error),
        mode: "unknown",
        server: null,
        models: [],
      };
      if (refreshId.current !== id) return next;
      setLink(next);
      return next;
    }
  }, []);

  useEffect(() => {
    void reload().finally(() => setReady(true));
    void refreshLink();
  }, [reload, refreshLink]);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const upsert = useCallback((project: Project) => {
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)].sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteProject(id);
    setProjects((current) => current.filter((item) => item.id !== id));
    setActiveId((current) => {
      if (current === id) {
        sessionStorage.removeItem("forge.active");
        return null;
      }
      return current;
    });
  }, []);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) sessionStorage.setItem("forge.active", id);
    else sessionStorage.removeItem("forge.active");
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      settings,
      updateSettings,
      projects,
      reload,
      upsert,
      remove,
      activeProjectId,
      setActiveProjectId,
      link,
      refreshLink,
    }),
    [ready, settings, updateSettings, projects, reload, upsert, remove, activeProjectId, setActiveProjectId, link, refreshLink],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useForge(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Forge store is missing");
  return value;
}

export async function persist(project: Project): Promise<void> {
  await saveProject(project);
}
