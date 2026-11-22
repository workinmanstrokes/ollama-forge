import type { ProjectFile } from "./types";
import { vendorsFor } from "./vendorSources";

export function resolveRelative(from: string, spec: string): string {
  const base = from.split("/").slice(0, -1);
  for (const part of spec.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") base.pop();
    else base.push(part);
  }
  let path = base.join("/");
  if (!/\.[a-z]+$/i.test(path)) path += ".js";
  return path;
}

export function rewriteSpecifiers(code: string, filePath: string): string {
  return code.replace(/(from\s+|import\s*\(\s*|import\s+)(["'])(\.[^"']+)\2/g, (full, prefix: string, quote: string, spec: string) => {
    if (!prefix.includes("from") && !prefix.includes("(") && !prefix.trim().startsWith("import")) return full;
    return `${prefix}${quote}${resolveRelative(filePath, spec)}${quote}`;
  });
}

export function moduleDataUrl(code: string): string {
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
}

export function usesModules(files: ProjectFile[]): boolean {
  return files.some((file) => file.path.startsWith("src/") || /^\s*import\s/m.test(file.content));
}

export function entryPath(files: ProjectFile[]): string {
  if (files.some((file) => file.path === "src/main.js")) return "src/main.js";
  if (files.some((file) => file.path === "main.js")) return "main.js";
  return files.find((file) => file.path.endsWith(".js"))?.path || "main.js";
}

export function buildModuleSrcdoc(files: ProjectFile[]): string {
  const html = files.find((file) => file.path === "index.html")?.content || "";
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "Preview";
  const css = files.find((file) => file.path === "styles.css")?.content || "";
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || '<div id="app"></div>').replace(/<script[\s\S]*?<\/script>/gi, "");
  const scripts = files.filter((file) => file.path.endsWith(".js") && !file.path.endsWith("checks.js") && !file.path.startsWith("tests/"));
  const rewritten = scripts.map((file) => ({
    path: file.path,
    content: `globalThis.__forgeFile=${JSON.stringify(file.path)};\n${rewriteSpecifiers(file.content, file.path)}`,
  }));
  const vendors = vendorsFor(rewritten.map((file) => file.content));
  const imports: Record<string, string> = {};
  for (const [name, content] of Object.entries(vendors)) imports[name] = moduleDataUrl(content);
  for (const file of rewritten) imports[file.path] = moduleDataUrl(file.content);
  const checks = files.find((file) => file.path === "checks.js")?.content || "";
  const tests = files.filter((file) => file.path.startsWith("tests/") && !/^\s*import\s/m.test(file.content)).map((file) => file.content).join("\n");
  const entry = entryPath(files);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title.replace(/[<>&]/g, "")}</title>
<style>${css}</style>
</head>
<body>
${body}
<script>
(function () {
  var send = function (payload) {
    parent.postMessage(Object.assign({ source: "forge-preview" }, payload), "*");
  };
  window.addEventListener("error", function (event) {
    send({
      type: "error",
      message: event.message || "Script error",
      filename: window.__forgeFile || "src/main.js",
      stack: event.error && event.error.stack ? String(event.error.stack) : ""
    });
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    send({
      type: "error",
      message: reason && reason.message ? String(reason.message) : String(reason),
      filename: window.__forgeFile || "src/main.js",
      stack: reason && reason.stack ? String(reason.stack) : ""
    });
  });
  var original = console.error.bind(console);
  console.error = function () {
    var message = Array.prototype.map.call(arguments, String).join(" ");
    send({ type: "console", level: "error", message: message, filename: window.__forgeFile || "src/main.js" });
    original.apply(console, arguments);
  };
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "forge-host") return;
    if (data.type === "run-checks") {
      var list = window.__forgeChecks || [];
      var results = [];
      for (var i = 0; i < list.length; i++) {
        try {
          var ok = Boolean(list[i]());
          results.push({ ok: ok, message: ok ? "passed" : "assertion returned false" });
        } catch (err) { results.push({ ok: false, message: err && err.message ? String(err.message) : String(err) }); }
      }
      var tests = window.__forgeTests || [];
      for (var t = 0; t < tests.length; t++) {
        try { tests[t](); results.push({ ok: true, message: "test passed" }); }
        catch (err) { results.push({ ok: false, message: err && err.message ? String(err.message) : String(err) }); }
      }
      send({ type: "checks", results: results });
    }
    if (data.type === "play") {
      var play = window.__forgePlay;
      if (!play) { send({ type: "play-result", ok: false, message: "This game has no play check." }); return; }
      try {
        play.start();
        (data.actions || []).forEach(function (action) { play.act(action); });
        send({ type: "play-result", ok: true, message: "played", state: play.state() });
      } catch (err) {
        send({ type: "play-result", ok: false, message: err && err.message ? String(err.message) : String(err) });
      }
    }
  });
  window.addEventListener("load", function () { send({ type: "ready" }); });
})();
</script>
<script type="importmap">${JSON.stringify({ imports })}</script>
<script type="module">import ${JSON.stringify(entry)};</script>
<script>${checks.replace(/<\/script/gi, "<\\/script")}</script>
<script>${tests.replace(/<\/script/gi, "<\\/script")}</script>
</body>
</html>`;
}
