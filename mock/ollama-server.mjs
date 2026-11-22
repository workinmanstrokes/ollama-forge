import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MODELS = [
  { name: "qwen2.5-coder:7b", size: 0 },
  { name: "llama3.1:8b", size: 0 },
];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function extractFile(text) {
  const match = text.match(/<<<FILE\s+([^\n>]+)>>>\s*([\s\S]*?)<<<END>>>/);
  if (!match) return null;
  return { path: match[1].trim(), content: match[2].replace(/^\n/, "").replace(/\n$/, "") };
}

function titleFrom(text) {
  const planned = text.match(/"title"\s*:\s*"([^"]+)"/);
  if (planned) return planned[1];
  const typed = text.match(/Title:\s*([^\n]+)/i);
  return typed ? typed[1].trim() : "Spark Project";
}

function plan(text) {
  return JSON.stringify(
    {
      title: titleFrom(text),
      summary: "A kid-safe local project based on the request.",
      palette: ["#140e12", "#ff6a2c", "#ffb03a", "#fff6ec", "#5ee0a0"],
      mechanics: "Keep the starter playable and follow the request.",
      assertions: ["The app renders"],
    },
    null,
    2,
  );
}

function code(text) {
  const current = extractFile(text);
  const title = titleFrom(text);
  const content = current
    ? current.content.replace(/const TITLE = ".*?";/, `const TITLE = ${JSON.stringify(title)};`)
    : `const TITLE = ${JSON.stringify(title)};\ndocument.getElementById("app").textContent = TITLE;\n`;
  return `<<<FILE ${current?.path || "main.js"}>>>\n${content}\n<<<END>>>`;
}

function fix(text) {
  const current = extractFile(text);
  const content = (current?.content || "").split("\n").filter((line) => !line.includes("throw new Error")).join("\n");
  return `<<<FILE ${current?.path || "main.js"}>>>\n${content}\n<<<END>>>`;
}

function edit(text) {
  const current = extractFile(text);
  let content = current?.content || "";
  if (/faster/i.test(text)) {
    content = content.replace(/const PLAYER_SPEED = (\d+);/, (_, speed) => `const PLAYER_SPEED = ${Math.round(Number(speed) * 1.5)};`);
  } else if (!content.startsWith("// forge-edit")) {
    content = `// forge-edit\n${content}`;
  }
  return `<<<FILE ${current?.path || "main.js"}>>>\n${content}\n<<<END>>>`;
}

function replyFor(body) {
  if (body.prompt) {
    return "Hearthcrumb\nLittle Lantern\nCourtyard Star\nSoft Anvil\n";
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n");
  const user = messages.filter((item) => item.role === "user").map((item) => item.content).join("\n");
  if (system.includes("You are the planner")) return plan(user);
  if (system.includes("You fix bugs")) return fix(user);
  if (system.includes("You edit one file")) return edit(user);
  return code(user);
}

function writeStream(res, text, kind) {
  const delay = Number(process.env.MOCK_DELAY ?? 3);
  const size = 80;
  let offset = 0;
  const send = () => {
    if (offset >= text.length) {
      const done = kind === "generate"
        ? { model: "mock", response: "", done: true }
        : { model: "mock", message: { role: "assistant", content: "" }, done: true };
      res.write(`${JSON.stringify(done)}\n`);
      res.end();
      return;
    }
    const piece = text.slice(offset, offset + size);
    offset += size;
    const line = kind === "generate"
      ? { model: "mock", response: piece, done: false }
      : { model: "mock", message: { role: "assistant", content: piece }, done: false };
    res.write(`${JSON.stringify(line)}\n`);
    setTimeout(send, delay);
  };
  send();
}

export function createMockOllama() {
  const server = http.createServer(async (req, res) => {
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
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method === "GET" && url.pathname === "/api/tags") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models: MODELS }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/version") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ version: "mock" }));
      return;
    }
    if (req.method === "POST" && (url.pathname === "/api/chat" || url.pathname === "/api/generate")) {
      const body = JSON.parse((await readBody(req)) || "{}");
      const text = replyFor(body);
      res.writeHead(200, { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" });
      if (body.stream === false) {
        const payload = url.pathname === "/api/generate"
          ? { model: "mock", response: text, done: true }
          : { model: "mock", message: { role: "assistant", content: text }, done: true };
        res.end(JSON.stringify(payload));
        return;
      }
      writeStream(res, text, url.pathname === "/api/generate" ? "generate" : "chat");
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
  return {
    listen(port = 0) {
      return new Promise((resolve) => {
        server.listen(port, "127.0.0.1", () => {
          const address = server.address();
          resolve(typeof address === "object" && address ? address.port : port);
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const mock = createMockOllama();
  const port = Number(process.env.PORT || 11435);
  mock.listen(port).then((actual) => {
    console.log(`mock ollama listening on ${actual}`);
  });
}
