import { strToU8, zipSync } from "fflate";
import { safeRelPath } from "./parse";

export function zipTextFiles(
  files: { path: string; content: string }[],
  extra: { path: string; data: Uint8Array }[] = [],
): Uint8Array {
  const map: Record<string, Uint8Array> = {};
  for (const file of files) {
    const path = safeRelPath(file.path);
    if (path) map[path] = strToU8(file.content);
  }
  for (const file of extra) {
    const path = safeRelPath(file.path);
    if (path) map[path] = file.data;
  }
  return zipSync(map, { level: 6 });
}

export function downloadBytes(data: Uint8Array, filename: string, type: string) {
  const blob = new Blob([new Uint8Array(data)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function pwaShell(title: string, theme: string, background: string): { manifest: string; sw: string } {
  const manifest = {
    name: title,
    short_name: title.slice(0, 18),
    start_url: "./",
    display: "standalone",
    background_color: background,
    theme_color: theme,
    icons: [
      { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
  const sw = `const CACHE = "forge-export-v1";
const FILES = ["./", "./index.html", "./styles.css", "./main.js", "./checks.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});
self.addEventListener("fetch", (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
`;
  return { manifest: JSON.stringify(manifest, null, 2), sw };
}

export function injectPwa(html: string): string {
  const tags = `    <link rel="manifest" href="./manifest.webmanifest" />\n    <script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");</script>\n`;
  if (html.includes("</head>")) return html.replace("</head>", `${tags}</head>`);
  return html + tags;
}

export async function rasterIcon(size: number, palette: string[]): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw an icon.");
  const [bg, accent, accent2] = palette;
  ctx.clearRect(0, 0, size, size);
  round(ctx, size * 0.08, size * 0.08, size * 0.84, size * 0.84, size * 0.18);
  ctx.fillStyle = bg || "#140e12";
  ctx.fill();
  ctx.fillStyle = accent || "#ff6a2c";
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.46, size * 0.12, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent2 || "#ffb03a";
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.5, size * 0.055, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e7c3a2";
  ctx.fillRect(size * 0.28, size * 0.72, size * 0.44, size * 0.08);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not encode the icon.");
  return new Uint8Array(await blob.arrayBuffer());
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
