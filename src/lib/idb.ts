import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project } from "./types";

interface ForgeDB extends DBSchema {
  projects: { key: string; value: Project };
}

let dbPromise: Promise<IDBPDatabase<ForgeDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<ForgeDB>("ollama-forge", 1, {
      upgrade(database) {
        database.createObjectStore("projects", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function listProjects(): Promise<Project[]> {
  const all = await (await db()).getAll("projects");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return (await db()).get("projects", id);
}

export async function saveProject(project: Project): Promise<void> {
  await (await db()).put("projects", project);
}

export async function deleteProject(id: string): Promise<void> {
  await (await db()).delete("projects", id);
}
