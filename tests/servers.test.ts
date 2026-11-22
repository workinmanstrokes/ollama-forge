import { afterAll, beforeAll, describe, expect, test } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createMockOllama } from "../mock/ollama-server.mjs";
import { createForgeServer } from "../server/index.mjs";
import { chatStream, listModels } from "../src/lib/ollama";

const mock = createMockOllama();
let mockPort = 0;
let forge: ReturnType<typeof createForgeServer> | null = null;
let projects = "";

beforeAll(async () => {
  process.env.MOCK_DELAY = "0";
  mockPort = await mock.listen(0);
  projects = fs.mkdtempSync(path.join(os.tmpdir(), "forge-projects-"));
  forge = createForgeServer({ port: 0, ollamaUrl: `http://127.0.0.1:${mockPort}`, projects, dist: path.join(projects, "missing-dist") });
  await forge.listen();
});

afterAll(async () => {
  await new Promise<void>((resolve) => forge?.server.close(() => resolve()));
  await mock.close();
  fs.rmSync(projects, { recursive: true, force: true });
});

describe("mock ollama and forge-server", () => {
  test("lists models and streams a plan, a file, and a fix", async () => {
    const base = `http://127.0.0.1:${mockPort}`;
    const listed = await listModels(base);
    expect(listed.models.map((model) => model.name)).toContain("qwen2.5-coder:7b");
    expect(listed.version).toBe("mock");
    const plan = await chatStream({
      base,
      model: "qwen2.5-coder:7b",
      temperature: 0.2,
      contextSize: 2048,
      messages: [
        { role: "system", content: "You are the planner for Ollama Forge." },
        { role: "user", content: "Title: Star Catch" },
      ],
    });
    expect(plan).toContain("Star Catch");
    const code = await chatStream({
      base,
      model: "qwen2.5-coder:7b",
      temperature: 0.2,
      contextSize: 2048,
      messages: [
        { role: "system", content: "You write exactly one file" },
        { role: "user", content: `{"title":"Star Catch"}\n<<<FILE main.js>>>\nconst TITLE = "Ember Dash";\n<<<END>>>` },
      ],
    });
    expect(code).toContain("Star Catch");
    const fixed = await chatStream({
      base,
      model: "qwen2.5-coder:7b",
      temperature: 0.2,
      contextSize: 2048,
      messages: [
        { role: "system", content: "You fix bugs in one file" },
        { role: "user", content: "<<<FILE main.js>>>\nthrow new Error(\"player crashed\");\nconst TITLE = \"Star Catch\";\n<<<END>>>" },
      ],
    });
    expect(fixed).not.toContain("throw new Error");
    expect(fixed).toContain("Star Catch");
  });

  test("proxies tags, writes a project, and serves a shared snapshot", async () => {
    const port = forge?.port;
    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await health.json() as { ok: boolean; name: string };
    expect(body).toMatchObject({ ok: true, name: "forge-server" });
    const tags = await fetch(`http://127.0.0.1:${port}/ollama/api/tags`);
    const tagBody = await tags.json() as { models: { name: string }[] };
    expect(tagBody.models[0]?.name).toBe("qwen2.5-coder:7b");
    const saved = await fetch(`http://127.0.0.1:${port}/api/projects/demo-1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Demo", files: [{ path: "index.html", content: "<h1>Hi</h1>" }, { path: "../nope.txt", content: "x" }] }),
    });
    expect(saved.status).toBe(400);
    const good = await fetch(`http://127.0.0.1:${port}/api/projects/demo-1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Demo", files: [{ path: "index.html", content: "<h1>Hi</h1>" }] }),
    });
    expect(good.status).toBe(200);
    expect(fs.readFileSync(path.join(projects, "demo-1", "index.html"), "utf8")).toContain("Hi");
    const share = await fetch(`http://127.0.0.1:${port}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "snap-1", name: "Demo", files: [{ path: "index.html", content: "<h1>Frozen</h1>" }] }),
    });
    const shared = await share.json() as { url: string };
    expect(shared.url).toContain("/p/snap-1/");
    const page = await fetch(`http://127.0.0.1:${port}/p/snap-1/`);
    expect(await page.text()).toContain("Frozen");
  });
});
