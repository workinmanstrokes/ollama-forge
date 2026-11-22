import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

function lanIPs() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list || []) {
      if (item.family === "IPv4" && !item.internal) ips.push(item.address);
    }
  }
  return ips;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("Body is too large."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safeChild(root, requestPath) {
  const cleaned = decodeURIComponent(requestPath).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.split("/").some((part) => part === "" || part === "." || part === "..")) return null;
  const full = path.resolve(root, cleaned);
  const relative = path.relative(root, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return full;
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function writeProject(dir, id, payload) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    throw Object.assign(new Error("Invalid project id."), { status: 400 });
  }
  if (!payload || !Array.isArray(payload.files)) {
    throw Object.assign(new Error("Expected a files array."), { status: 400 });
  }
  const folder = path.join(dir, id);
  fs.mkdirSync(folder, { recursive: true });
  const written = [];
  for (const file of payload.files) {
    const target = safeChild(folder, String(file.path || ""));
    if (!target || typeof file.content !== "string") {
      throw Object.assign(new Error("A file path was rejected."), { status: 400 });
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content);
    written.push(path.relative(folder, target).split(path.sep).join("/"));
  }
  fs.writeFileSync(path.join(folder, "forge.json"), JSON.stringify({ name: String(payload.name || id), files: written }, null, 2));
  return { id, name: String(payload.name || id), files: written };
}

export function createForgeServer(options = {}) {
  const state = { port: options.port ?? Number(process.env.PORT || 8787) };
  const ollama = (options.ollamaUrl || process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const dist = path.resolve(options.dist || process.env.FORGE_DIST || "dist");
  const projects = path.resolve(options.projects || process.env.FORGE_PROJECTS || "forge-projects");
  const shares = path.join(projects, "shares");

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
      }
      if (url.pathname === "/api/health") {
        send(res, 200, JSON.stringify({ ok: true, name: "forge-server", ollama, port: state.port, lan: lanIPs() }));
        return;
      }
      if (url.pathname.startsWith("/ollama/")) {
        const target = ollama + url.pathname.slice("/ollama".length) + url.search;
        const hasBody = req.method !== "GET" && req.method !== "HEAD";
        const body = hasBody ? await readBody(req, 6_000_000) : undefined;
        const upstream = await fetch(target, {
          method: req.method,
          headers: { "Content-Type": req.headers["content-type"] || "application/json" },
          body,
        });
        res.writeHead(upstream.status, {
          "Content-Type": upstream.headers.get("content-type") || "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        });
        if (!upstream.body) {
          res.end();
          return;
        }
        const reader = upstream.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/projects") {
        fs.mkdirSync(projects, { recursive: true });
        const entries = fs.readdirSync(projects, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && entry.name !== "shares")
          .map((entry) => {
            const metaPath = path.join(projects, entry.name, "forge.json");
            const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : { name: entry.name, files: [] };
            return { id: entry.name, name: meta.name, files: meta.files || [] };
          });
        send(res, 200, JSON.stringify(entries));
        return;
      }
      const projectMatch = url.pathname.match(/^\/api\/projects\/([a-zA-Z0-9_-]+)$/);
      if (req.method === "POST" && projectMatch) {
        const payload = JSON.parse((await readBody(req, 4_000_000)).toString("utf8") || "{}");
        const saved = writeProject(projects, projectMatch[1], payload);
        send(res, 200, JSON.stringify(saved));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/export-apk") {
        const payload = JSON.parse((await readBody(req, 64_000)).toString("utf8") || "{}");
        const id = String(payload.id || "");
        const folder = path.join(projects, id);
        const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
        if (!id || !fs.existsSync(folder)) {
          send(res, 404, JSON.stringify({ error: "Save the project to the PC before building an APK." }));
          return;
        }
        if (!home) {
          send(res, 409, JSON.stringify({ error: "No Android SDK found. Set ANDROID_HOME, then run: npm run export-apk -- forge-projects/" + id }));
          return;
        }
        const child = spawn(process.execPath, ["scripts/export-apk.mjs", folder], { cwd: process.cwd() });
        let log = "";
        child.stdout.on("data", (chunk) => { log += chunk; });
        child.stderr.on("data", (chunk) => { log += chunk; });
        child.on("exit", (code) => {
          send(res, code === 0 ? 200 : 500, JSON.stringify({
            ok: code === 0,
            apk: "android/app/build/outputs/apk/debug/app-debug.apk",
            log: log.slice(-2000),
          }));
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/share") {
        const payload = JSON.parse((await readBody(req, 4_000_000)).toString("utf8") || "{}");
        const saved = writeProject(shares, String(payload.id || ""), payload);
        const host = req.headers.host || `127.0.0.1:${state.port}`;
        send(res, 200, JSON.stringify({ ...saved, url: `http://${host}/p/${saved.id}/` }));
        return;
      }
      if (req.method === "GET" && url.pathname.startsWith("/p/")) {
        const relative = url.pathname.slice(3);
        const folderAndFile = relative.split("/").filter(Boolean);
        const id = folderAndFile.shift();
        if (!id || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
          send(res, 404, JSON.stringify({ error: "Not found" }));
          return;
        }
        const filePath = safeChild(path.join(shares, id), folderAndFile.join("/") || "index.html");
        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          send(res, 404, "Not found", "text/plain; charset=utf-8");
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      if (req.method === "GET") {
        const relative = url.pathname === "/" ? "index.html" : url.pathname;
        const filePath = safeChild(dist, relative);
        if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath);
          res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600" });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
        const index = path.join(dist, "index.html");
        if (fs.existsSync(index) && !path.extname(url.pathname)) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
          fs.createReadStream(index).pipe(res);
          return;
        }
        send(res, 404, "Not found", "text/plain; charset=utf-8");
        return;
      }
      send(res, 405, JSON.stringify({ error: "Method not allowed" }));
    } catch (error) {
      const status = error.status || 500;
      send(res, status, JSON.stringify({ error: error.message || "Server error" }));
    }
  });

  return {
    server,
    get port() {
      return state.port;
    },
    ollama,
    dist,
    projects,
    listen() {
      return new Promise((resolve) => {
        server.listen(state.port, "0.0.0.0", () => {
          const address = server.address();
          state.port = typeof address === "object" && address ? address.port : state.port;
          resolve(state.port);
        });
      });
    },
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const forge = createForgeServer();
  forge.listen().then((port) => {
    console.log(`forge-server listening on 0.0.0.0:${port}`);
    console.log(`proxying Ollama at ${forge.ollama}`);
  });
}
