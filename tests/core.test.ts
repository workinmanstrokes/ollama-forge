import { describe, expect, test } from "vitest";
import { lineDiff } from "../src/lib/diffview";
import { fixLoop } from "../src/lib/fixloop";
import { emojiBadge, patternCss, sparkSvg } from "../src/lib/assets";
import { paletteFromSeed } from "../src/lib/palette";
import { applyModelFiles, applyPalette, basicPlan, parseFileBlocks, parsePlan, pickFileForError, setHtmlTitle } from "../src/lib/parse";
import { buildSrcdoc } from "../src/lib/preview";
import { coderMessages, fixerMessages, plannerMessages } from "../src/lib/prompts";
import { assertSafe } from "../src/lib/safety";
import { getTemplate, TEMPLATES } from "../src/lib/templates";
import { contextCharBudget, trimMiddle } from "../src/lib/trim";
import { zipTextFiles } from "../src/lib/zip";
import { unzipSync, strFromU8 } from "fflate";

describe("templates", () => {
  test("every starter parses and stays offline", () => {
    for (const info of TEMPLATES) {
      const { files } = getTemplate(info.kind);
      const names = files.map((file) => file.path);
      expect(names).toEqual(["index.html", "styles.css", "main.js", "checks.js"]);
      const html = files[0]?.content ?? "";
      expect(html).toContain('id="app"');
      expect(html).toContain("styles.css");
      expect(html).toContain("main.js");
      for (const file of files) {
        expect(file.content).not.toMatch(/https?:\/\//);
        expect(assertSafe(file.content).ok).toBe(true);
        if (file.path.endsWith(".js")) new Function(file.content);
      }
      expect(files[2]?.content).toContain("const TITLE");
    }
  });

  test("arcade and hop expose a speed constant", () => {
    expect(getTemplate("arcade").files[2]?.content).toContain("PLAYER_SPEED");
    expect(getTemplate("game").files[2]?.content).toContain("PLAYER_SPEED");
  });
});

describe("prompts and parsing", () => {
  test("trims the middle and budgets context", () => {
    expect(contextCharBudget(4096)).toBe(8192);
    const trimmed = trimMiddle("a".repeat(100) + "MIDDLE" + "b".repeat(100), 40);
    expect(trimmed.length).toBeLessThanOrEqual(40);
    expect(trimmed).toContain("trimmed");
  });

  test("parses file blocks and falls back to a bare file", () => {
    expect(parseFileBlocks("<<<FILE main.js>>>\nconst TITLE = \"A\";\n<<<END>>>")).toEqual([
      { path: "main.js", content: "const TITLE = \"A\";" },
    ]);
    const applied = applyModelFiles([{ path: "main.js", content: "old" }], "const TITLE = \"B\";", "main.js");
    expect(applied.files[0]?.content).toContain("TITLE");
  });

  test("rejects network and unsafe model output", () => {
    expect(assertSafe("fetch('https://example.com')").ok).toBe(false);
    expect(() => applyModelFiles([], "fetch('https://example.com')", "main.js")).toThrow(/offline|network/i);
  });

  test("parses a plan and keeps a basic one", () => {
    const fallback = basicPlan("Title: Star Catch\nA game", "arcade", "Ember Dash");
    expect(fallback.title).toBe("Star Catch");
    const parsed = parsePlan('Here {"title":"Lantern","summary":"s","palette":["#112233","#445566","#778899","#aabbcc","#ddeeff"],"mechanics":"m","assertions":["canvas"]}', fallback);
    expect(parsed.usedFallback).toBe(false);
    expect(parsed.plan.title).toBe("Lantern");
    expect(parsePlan("no json", fallback).usedFallback).toBe(true);
  });

  test("palette and title edits stay in the starter css", () => {
    const css = getTemplate("arcade").files[1]?.content ?? "";
    const next = applyPalette(css, ["#111111", "#222222", "#333333", "#444444", "#555555"]);
    expect(next).toContain("--bg: #111111");
    expect(next).toContain("--accent: #222222");
    expect(setHtmlTitle("<title>Old</title>", "Star <Catch>")).toBe("<title>Star Catch</title>");
  });

  test("prompts name the right role and include the file", () => {
    expect(plannerMessages("arcade", "Title: Star Catch", "notes")[0]?.content).toContain("planner");
    const code = coderMessages({
      kind: "arcade",
      plan: basicPlan("Title: Star Catch", "arcade", "Ember Dash"),
      path: "main.js",
      content: "const TITLE = \"Ember Dash\";",
      budget: 2000,
    });
    expect(code[1]?.content).toContain("Star Catch");
    expect(code[1]?.content).toContain("const TITLE");
    const fix = fixerMessages({ path: "main.js", content: "throw new Error(\"player crashed\");", issues: [{ message: "player crashed", filename: "main.js" }], budget: 2000 });
    expect(fix[0]?.content).toContain("You fix bugs");
    expect(fix[1]?.content).toContain("player crashed");
  });
});

describe("fix loop, diff, assets, zip", () => {
  test("stops early and caps at three attempts", async () => {
    let attempts = 0;
    const early = await fixLoop({
      initialIssues: [{ message: "boom" }],
      smoke: async () => (attempts > 0 ? [] : [{ message: "boom" }]),
      fix: async () => {
        attempts += 1;
        return true;
      },
    });
    expect(early).toMatchObject({ attempts: 1, issues: [] });
    let count = 0;
    const capped = await fixLoop({
      initialIssues: [{ message: "boom" }],
      smoke: async () => [{ message: "boom" }],
      fix: async () => {
        count += 1;
        return true;
      },
    });
    expect(capped.attempts).toBe(3);
    expect(count).toBe(3);
  });

  test("picks the file named by the error", () => {
    const files = [{ path: "main.js", content: "" }, { path: "checks.js", content: "" }];
    expect(pickFileForError(files, [{ message: "no", filename: "checks.js" }])).toBe("checks.js");
    expect(pickFileForError(files, [{ message: "explode" }])).toBe("main.js");
  });

  test("diffs added and removed lines", () => {
    const rows = lineDiff("a\nb\n", "a\nc\n");
    expect(rows.some((row) => row.type === "del" && row.text === "b")).toBe(true);
    expect(rows.some((row) => row.type === "add" && row.text === "c")).toBe(true);
  });

  test("asset helpers are deterministic and safe", () => {
    expect(paletteFromSeed("ocean")).toEqual(paletteFromSeed("ocean"));
    expect(paletteFromSeed("ocean")).toHaveLength(5);
    const svg = sparkSvg(paletteFromSeed("ocean"));
    expect(svg).toContain("<svg");
    expect(assertSafe(svg).ok).toBe(true);
    expect(emojiBadge("<img>", "#112233")).not.toContain("<img>");
    expect(patternCss(paletteFromSeed("forge"))).toContain(".forge-pattern");
  });

  test("zip roundtrip and preview doc escape scripts", () => {
    const zipped = zipTextFiles([{ path: "main.js", content: "const TITLE = \"Star Catch\";" }, { path: "../secret.txt", content: "no" }]);
    const files = unzipSync(zipped);
    expect(strFromU8(files["main.js"]!)).toContain("Star Catch");
    expect(files["../secret.txt"]).toBeUndefined();
    const doc = buildSrcdoc([{ path: "index.html", content: "<body><div id=\"app\"></div></body>" }, { path: "main.js", content: "const x = '</script><script>alert(1)</script>';" }]);
    expect(doc).toContain("forge-preview");
    expect(doc).not.toContain("</script><script>alert");
  });
});
