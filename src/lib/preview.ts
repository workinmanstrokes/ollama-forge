import type { ProjectFile, SmokeIssue } from "./types";

export function escapeScript(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

function file(files: ProjectFile[], path: string): string {
  return files.find((item) => item.path === path)?.content ?? "";
}

function innerBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!match) return '<div id="app"></div>';
  return (match[1] ?? "").replace(/<script[\s\S]*?<\/script>/gi, "");
}

export function buildSrcdoc(files: ProjectFile[]): string {
  const html = file(files, "index.html");
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || "Preview";
  const css = file(files, "styles.css");
  const js = file(files, "main.js");
  const checks = file(files, "checks.js");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title.replace(/[<>&]/g, "")}</title>
<style>${css}</style>
</head>
<body>
${innerBody(html)}
<script>
(function () {
  var send = function (payload) {
    parent.postMessage(Object.assign({ source: "forge-preview" }, payload), "*");
  };
  window.addEventListener("error", function (event) {
    send({
      type: "error",
      message: event.message || "Script error",
      filename: "main.js",
      stack: event.error && event.error.stack ? String(event.error.stack) : ""
    });
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    send({
      type: "error",
      message: reason && reason.message ? String(reason.message) : String(reason),
      filename: "main.js",
      stack: reason && reason.stack ? String(reason.stack) : ""
    });
  });
  var original = console.error.bind(console);
  console.error = function () {
    var message = Array.prototype.map.call(arguments, function (item) { return String(item); }).join(" ");
    send({ type: "console", level: "error", message: message, filename: "main.js" });
    original.apply(console, arguments);
  };
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "forge-host" || data.type !== "run-checks") return;
    var list = window.__forgeChecks || [];
    var results = [];
    for (var i = 0; i < list.length; i++) {
      try {
        var ok = Boolean(list[i]());
        results.push({ ok: ok, message: ok ? "passed" : "assertion returned false" });
      } catch (err) {
        results.push({ ok: false, message: err && err.message ? String(err.message) : String(err) });
      }
    }
    send({ type: "checks", results: results });
  });
  window.addEventListener("load", function () { send({ type: "ready" }); });
})();
</script>
<script>${escapeScript(js)}</script>
<script>${escapeScript(checks)}</script>
</body>
</html>`;
}

export function runSmokeTest(
  files: ProjectFile[],
  host: HTMLElement,
  opts?: { assertions?: boolean; signal?: AbortSignal },
): Promise<SmokeIssue[]> {
  const assertions = opts?.assertions !== false;
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("title", "Smoke test preview");
    iframe.className = "smoke-iframe";
    iframe.srcdoc = buildSrcdoc(files);
    host.replaceChildren(iframe);
    const issues: SmokeIssue[] = [];
    const checkIssues: SmokeIssue[] = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(checksTimer);
      window.clearTimeout(doneTimer);
      window.removeEventListener("message", onMessage);
      resolve([...issues, ...checkIssues]);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as {
        source?: string;
        type?: string;
        message?: string;
        filename?: string;
        results?: { ok: boolean; message: string }[];
      };
      if (!data || data.source !== "forge-preview") return;
      if (data.type === "error" || (data.type === "console" && data.message)) {
        issues.push({ message: data.message || "Unknown error", filename: data.filename || "main.js" });
      }
      if (data.type === "checks" && assertions) {
        for (const result of data.results ?? []) {
          if (!result.ok) checkIssues.push({ message: result.message, filename: "checks.js" });
        }
      }
    };
    window.addEventListener("message", onMessage);
    const checksTimer = window.setTimeout(() => {
      if (assertions) iframe.contentWindow?.postMessage({ source: "forge-host", type: "run-checks" }, "*");
    }, 700);
    const doneTimer = window.setTimeout(finish, 1400);
    opts?.signal?.addEventListener("abort", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(checksTimer);
      window.clearTimeout(doneTimer);
      window.removeEventListener("message", onMessage);
      iframe.remove();
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
