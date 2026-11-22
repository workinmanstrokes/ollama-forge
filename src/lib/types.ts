export type ProjectKind =
  | "arcade"
  | "game"
  | "puzzle"
  | "idle"
  | "quiz"
  | "utility"
  | "landing"
  | "platformer"
  | "shooter"
  | "rpg"
  | "cards"
  | "productivity"
  | "tracker"
  | "chatapp";

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

export type ModuleSpec = {
  path: string;
  summary: string;
  exports: string[];
  imports: string[];
  milestone: string;
};

export type Milestone = {
  id: string;
  title: string;
  summary: string;
  files: string[];
  status: "pending" | "approved" | "building" | "ready";
};

export type ProjectSpec = {
  title: string;
  summary: string;
  features: string[];
  screens: string[];
  dataModel: { name: string; fields: string[] }[];
  modules: ModuleSpec[];
  milestones: Milestone[];
  palette: string[];
};

export type ReviewItem = { id: string; ok: boolean; detail: string };

export type BuildState = {
  status: "idle" | "architecting" | "building" | "awaiting" | "reviewing" | "paused" | "done" | "error";
  spec: ProjectSpec | null;
  summaries: Record<string, string>;
  nextFile: string | null;
  review: ReviewItem[];
  error: string;
  updatedAt: number;
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
  build?: BuildState | null;
};

export type Role = "architect" | "reviewer" | "planner" | "coder" | "fixer";

export type Settings = {
  ollamaUrl: string;
  serverUrl: string;
  connection: "auto" | "direct" | "server";
  models: Record<Role, string>;
  knownModels: string[];
  temperature: number;
  contextSize: number;
  autoRoute: boolean;
  localImage: boolean;
};

export type SmokeIssue = {
  message: string;
  filename?: string;
};

export type DeviceFrame = "phone" | "tablet" | "desktop";
export type StudioTab = "preview" | "code" | "chat" | "test" | "history";
export type EnvironmentName = "dev" | "preview" | "prod";
