import type { Settings } from "./types";

export type OllamaModel = { name: string; size?: number };

export type ServerHealth = {
  ok: boolean;
  name: string;
  ollama: string;
  port: number;
  lan: string[];
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function trimBase(url: string): string {
  return url.trim().replace(/\/$/, "");
}

export async function checkHealth(serverUrl: string): Promise<ServerHealth | null> {
  const base = serverUrl ? trimBase(serverUrl) : "";
  try {
    const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<ServerHealth>;
    if (!data.ok || data.name !== "forge-server") return null;
    return {
      ok: true,
      name: "forge-server",
      ollama: String(data.ollama ?? ""),
      port: Number(data.port ?? 0),
      lan: Array.isArray(data.lan) ? data.lan.map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function resolveApiBase(settings: Settings): Promise<{ base: string; mode: "server" | "direct"; server: ServerHealth | null }> {
  if (settings.connection !== "direct") {
    const candidates = settings.connection === "server" ? [settings.serverUrl] : [settings.serverUrl, ""];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      const key = candidate.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      if (settings.connection === "server" && !key) continue;
      const health = await checkHealth(key);
      if (health) {
        const origin = key ? trimBase(key) : "";
        return { base: `${origin}/ollama`, mode: "server", server: health };
      }
    }
    if (settings.connection === "server") {
      throw new Error("Forge server is not reachable. Check the server address, or switch connection to Direct.");
    }
  }
  return { base: trimBase(settings.ollamaUrl || "http://localhost:11434"), mode: "direct", server: null };
}

export async function listModels(base: string, signal?: AbortSignal): Promise<{ models: OllamaModel[]; version?: string }> {
  const response = await fetch(`${trimBase(base)}/api/tags`, { signal: signal ?? AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(await errorText(response, base));
  }
  const body = (await response.json()) as { models?: OllamaModel[] };
  let version: string | undefined;
  try {
    const versionResponse = await fetch(`${trimBase(base)}/api/version`, { signal: AbortSignal.timeout(4000) });
    if (versionResponse.ok) {
      const versionBody = (await versionResponse.json()) as { version?: string };
      version = versionBody.version;
    }
  } catch {
    version = undefined;
  }
  return { models: body.models ?? [], version };
}

async function readNdjson(
  response: Response,
  onLine: (json: Record<string, unknown>) => void,
  signal: AbortSignal,
): Promise<void> {
  if (!response.body) throw new Error("Ollama returned an empty body.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const onAbort = () => {
    void reader.cancel();
  };
  signal.addEventListener("abort", onAbort);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consume(line, onLine);
    }
    if (buffer.trim()) consume(buffer, onLine);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

function consume(line: string, onLine: (json: Record<string, unknown>) => void) {
  const trimmed = line.trim();
  if (!trimmed) return;
  const json = JSON.parse(trimmed) as Record<string, unknown>;
  if (typeof json.error === "string") throw new Error(json.error);
  onLine(json);
}

function connectGuard(userSignal: AbortSignal | undefined, timeoutMs: number) {
  const link = new AbortController();
  const timer = setTimeout(() => {
    link.abort(new DOMException("Timed out waiting for Ollama", "TimeoutError"));
  }, timeoutMs);
  const onAbort = () => link.abort(userSignal?.reason);
  userSignal?.addEventListener("abort", onAbort);
  return {
    signal: link.signal,
    connected() {
      clearTimeout(timer);
    },
    done() {
      clearTimeout(timer);
      userSignal?.removeEventListener("abort", onAbort);
    },
  };
}

export async function chatStream(opts: {
  base: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  contextSize: number;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}): Promise<string> {
  if (!opts.model.trim()) throw new Error("Pick a model in Settings first.");
  const link = connectGuard(opts.signal, 60000);
  try {
    const response = await fetch(`${trimBase(opts.base)}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: link.signal,
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
        options: { temperature: opts.temperature, num_ctx: opts.contextSize },
      }),
    });
    link.connected();
    if (!response.ok) throw new Error(await errorText(response, opts.base));
    let full = "";
    await readNdjson(response, (json) => {
      const message = json.message as { content?: string } | undefined;
      const token = message?.content ?? "";
      if (token) {
        full += token;
        opts.onToken?.(token);
      }
    }, link.signal);
    return full;
  } catch (error) {
    throw explain(error, opts.base);
  } finally {
    link.done();
  }
}

export async function generateText(opts: {
  base: string;
  model: string;
  prompt: string;
  temperature: number;
  contextSize: number;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}): Promise<string> {
  if (!opts.model.trim()) throw new Error("Pick a model in Settings first.");
  const link = connectGuard(opts.signal, 60000);
  try {
    const response = await fetch(`${trimBase(opts.base)}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: link.signal,
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.prompt,
        stream: true,
        options: { temperature: opts.temperature, num_ctx: opts.contextSize },
      }),
    });
    link.connected();
    if (!response.ok) throw new Error(await errorText(response, opts.base));
    let full = "";
    await readNdjson(response, (json) => {
      const token = typeof json.response === "string" ? json.response : "";
      if (token) {
        full += token;
        opts.onToken?.(token);
      }
    }, link.signal);
    return full;
  } catch (error) {
    throw explain(error, opts.base);
  } finally {
    link.done();
  }
}

async function errorText(response: Response, base: string): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { error?: string };
    if (json.error) return `Ollama at ${base}: ${json.error}`;
  } catch {
    /* plain text */
  }
  return `Ollama at ${base} returned ${response.status}. ${text.slice(0, 180)}`;
}

function explain(error: unknown, base: string): Error {
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
    if (error.name === "TimeoutError") {
      return new Error(`Ollama at ${base} did not answer. Check that it is running and the address is right.`);
    }
    return error;
  }
  if (error instanceof TypeError) {
    return new Error(
      `Couldn't reach Ollama at ${base}. On a phone, use the PC's LAN address or forge-server. Direct browser calls need Ollama started with OLLAMA_ORIGINS=*.`,
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}
