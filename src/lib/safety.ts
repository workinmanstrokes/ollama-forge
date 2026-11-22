const UNSAFE =
  /\b(porn|xxx|nsfw|sexual|nude|nudes|naked|erotic|cocaine|heroin|meth)\b/i;
const NETWORK = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon)\s*\(/;
const URL = /https?:\/\//i;

export function assertSafe(content: string): { ok: true } | { ok: false; reason: string } {
  const text = content.replaceAll("http://www.w3.org/2000/svg", "");
  if (UNSAFE.test(text)) {
    return { ok: false, reason: "The model returned content Forge will not run." };
  }
  if (NETWORK.test(text) || URL.test(text)) {
    return {
      ok: false,
      reason: "The model tried to add a network call. Forge projects stay offline.",
    };
  }
  return { ok: true };
}
