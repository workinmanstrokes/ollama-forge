import { describe, expect, test } from "vitest";
import { approveNextMilestone } from "../src/lib/build";
import { searchProject } from "../src/lib/map";
import { resolveRelative, rewriteSpecifiers } from "../src/lib/modules";
import { spritePixels } from "../src/lib/pixels";
import { lintFile, reviewFiles } from "../src/lib/quality";
import { assignRoles, inferModel } from "../src/lib/routing";
import { fallbackSpec, parseSpec } from "../src/lib/spec";
import { getTemplate } from "../src/lib/templates";
import { wavBytes } from "../src/lib/wav";
import { exportApkStatus } from "../scripts/export-apk.mjs";

describe("multi-file forge", () => {
  test("platformer ships at least 8 files", () => {
    const { files } = getTemplate("platformer");
    expect(files.length).toBeGreaterThanOrEqual(8);
    expect(files.some((file) => file.path === "src/player.js")).toBe(true);
    expect(files.some((file) => file.content.includes("createSfx"))).toBe(true);
    expect(files.some((file) => file.content.includes("pausebtn"))).toBe(true);
  });

  test("rewrites relative imports and keeps vendor specifiers", () => {
    expect(resolveRelative("src/game.js", "./player.js")).toBe("src/player.js");
    const rewritten = rewriteSpecifiers('import { createPlayer } from "./player.js";\nimport { createSfx } from "forge-kit";\n', "src/game.js");
    expect(rewritten).toContain('from "src/player.js"');
    expect(rewritten).toContain('from "forge-kit"');
  });

  test("routes the largest model to the architect and a coder model to files", () => {
    const roles = assignRoles(["qwen2.5-coder:7b", "llama3.1:8b", "qwen2.5-coder:32b"]);
    expect(roles.architect).toBe("qwen2.5-coder:32b");
    expect(roles.coder).toContain("coder");
    expect(inferModel("qwen2.5-coder:32b").context).toBe(32768);
  });

  test("parses an architect spec and holds the second milestone", () => {
    const fallback = fallbackSpec("Moss Run", getTemplate("platformer").files);
    expect(fallback.milestones[1]?.status).toBe("pending");
    const parsed = parseSpec(JSON.stringify({
      title: "Star Catch",
      summary: "Run.",
      modules: [{ path: "src/main.js", summary: "boot", exports: [], imports: [], milestone: "play" }],
      milestones: [
        { id: "play", title: "Play", files: ["src/main.js"] },
        { id: "polish", title: "Credits", files: ["src/credits.js"] },
      ],
    }), fallback);
    expect(parsed.usedFallback).toBe(false);
    expect(parsed.spec.milestones[0]?.status).toBe("approved");
    const project = {
      id: "1",
      name: "Star Catch",
      kind: "platformer" as const,
      prompt: "",
      createdAt: 0,
      updatedAt: 0,
      revision: 1,
      files: [],
      snapshots: [],
      chat: [],
      plan: null,
      build: { status: "awaiting" as const, spec: parsed.spec, summaries: {}, nextFile: null, review: [], error: "", updatedAt: 0 },
    };
    const approved = approveNextMilestone(project);
    expect(approved.build?.spec?.milestones[1]?.status).toBe("approved");
  });

  test("searches the module that mentions speed and rejects placeholder copy", () => {
    const files = [
      { path: "src/main.js", content: "export const TITLE = 'A';" },
      { path: "src/player.js", content: "export const PLAYER_SPEED = 10;" },
    ];
    expect(searchProject(files, "make the player faster")[0]?.path).toBe("src/player.js");
    expect(lintFile("src/player.js", "export const PLAYER_SPEED = ;").length).toBeGreaterThan(0);
    const review = reviewFiles([{ path: "src/main.js", content: "TODO placeholder" }]);
    expect(review.find((item) => item.id === "placeholders")?.ok).toBe(false);
  });

  test("sprite pixels are symmetric and wav files start with RIFF", () => {
    const rows = spritePixels("moss", ["#111111", "#ff6a2c", "#ffb03a", "#ffffff"]);
    expect(rows).toHaveLength(16);
    expect(rows[4]?.[2]).toBe(rows[4]?.[5]);
    expect(String.fromCharCode(...wavBytes().slice(0, 4))).toBe("RIFF");
  });

  test("apk export explains a missing Android SDK", () => {
    const previousHome = process.env.ANDROID_HOME;
    const previousRoot = process.env.ANDROID_SDK_ROOT;
    delete process.env.ANDROID_HOME;
    delete process.env.ANDROID_SDK_ROOT;
    const status = exportApkStatus();
    expect(status.ok).toBe(false);
    expect(status.message).toMatch(/ANDROID_HOME/);
    if (previousHome) process.env.ANDROID_HOME = previousHome;
    if (previousRoot) process.env.ANDROID_SDK_ROOT = previousRoot;
  });
});
