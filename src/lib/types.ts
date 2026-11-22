export type ProjectKind = "arcade" | "game" | "puzzle" | "idle" | "quiz" | "utility" | "landing";

export type ProjectFile = {
  path: string;
  content: string;
};

export type Plan = {
  title: string;
  summary: string;
  palette: string[];
  mechanics: string;
  assertions: string[];
};

export type Snapshot = {
  id: string;
  createdAt: number;
  label: string;
  note: string;
  files: ProjectFile[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  prompt: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  files: ProjectFile[];
  snapshots: Snapshot[];
  chat: ChatMessage[];
  plan: Plan | null;
};

export type Role = "planner" | "coder" | "fixer";

export type Settings = {
  ollamaUrl: string;
  serverUrl: string;
  connection: "auto" | "direct" | "server";
  models: Record<Role, string>;
  knownModels: string[];
  temperature: number;
  contextSize: number;
};

export type SmokeIssue = {
  message: string;
  filename?: string;
};

export type DeviceFrame = "phone" | "tablet" | "desktop";
export type StudioTab = "preview" | "code" | "chat" | "test" | "history";
export type EnvironmentName = "dev" | "preview" | "prod";
