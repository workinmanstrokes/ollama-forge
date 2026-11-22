function clean(value: string): string {
  return value.replace(/[<>&'"]/g, "");
}

export function sparkSvg(palette: string[]): string {
  const [bg, accent, accent2, ink] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Spark">
  <rect width="128" height="128" rx="28" fill="${clean(bg ?? "#140e12")}"/>
  <path d="M64 18c4 16 18 24 18 42a18 18 0 1 1-36 0c0-18 14-26 18-42z" fill="${clean(accent ?? "#ff6a2c")}"/>
  <path d="M64 40c2 8 8 12 8 20a8 8 0 1 1-16 0c0-8 6-12 8-20z" fill="${clean(accent2 ?? "#ffb03a")}"/>
  <circle cx="64" cy="78" r="4" fill="${clean(ink ?? "#fff6ec")}"/>
</svg>`;
}

export function anvilSvg(palette: string[]): string {
  const [bg, accent, accent2] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Anvil">
  <rect width="128" height="128" rx="28" fill="${clean(bg ?? "#140e12")}"/>
  <path d="M24 54h80l-8 14H32z" fill="${clean(accent2 ?? "#ffb03a")}"/>
  <path d="M36 68h56l-6 10H42z" fill="${clean(accent ?? "#ff6a2c")}"/>
  <rect x="50" y="78" width="28" height="22" rx="3" fill="${clean(accent2 ?? "#e7c3a2")}"/>
  <rect x="40" y="98" width="48" height="8" rx="2" fill="${clean(accent ?? "#c4926a")}"/>
</svg>`;
}

export function coinSvg(palette: string[]): string {
  const [bg, accent, accent2, ink] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Coin">
  <rect width="128" height="128" rx="28" fill="${clean(bg ?? "#140e12")}"/>
  <circle cx="64" cy="64" r="36" fill="${clean(accent ?? "#ff6a2c")}"/>
  <circle cx="64" cy="64" r="26" fill="none" stroke="${clean(accent2 ?? "#ffb03a")}" stroke-width="4"/>
  <path d="M64 46v36M54 54h14a8 8 0 0 1 0 16H54" fill="none" stroke="${clean(ink ?? "#fff6ec")}" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

export function starSvg(palette: string[]): string {
  const [bg, accent, accent2] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Star">
  <rect width="128" height="128" rx="28" fill="${clean(bg ?? "#140e12")}"/>
  <path d="M64 24l10 22 24 3-18 16 5 24-21-12-21 12 5-24-18-16 24-3z" fill="${clean(accent ?? "#ff6a2c")}" stroke="${clean(accent2 ?? "#ffb03a")}" stroke-width="3" stroke-linejoin="round"/>
</svg>`;
}

export function blobSvg(palette: string[]): string {
  const [bg, accent, accent2] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Blob">
  <rect width="128" height="128" rx="28" fill="${clean(bg ?? "#140e12")}"/>
  <path d="M40 70c0-22 14-38 32-34 16 4 24 18 22 34-2 18-16 28-34 26-16-2-20-12-20-26z" fill="${clean(accent ?? "#ff6a2c")}"/>
  <circle cx="58" cy="62" r="4" fill="${clean(accent2 ?? "#fff6ec")}"/>
  <circle cx="78" cy="60" r="4" fill="${clean(accent2 ?? "#fff6ec")}"/>
  <path d="M58 78c6 6 14 6 20 0" fill="none" stroke="${clean(accent2 ?? "#fff6ec")}" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}

export function lanternSvg(palette: string[]): string {
  const [bg, accent, accent2, ink] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Lantern">
  <rect width="128" height="128" rx="28" fill="${clean(bg ?? "#140e12")}"/>
  <rect x="58" y="22" width="12" height="10" rx="2" fill="${clean(ink ?? "#e7c3a2")}"/>
  <path d="M44 40h40l8 48H36z" fill="${clean(accent ?? "#ff6a2c")}"/>
  <path d="M52 48h24l4 28H48z" fill="${clean(accent2 ?? "#ffb03a")}"/>
  <rect x="40" y="88" width="48" height="10" rx="3" fill="${clean(ink ?? "#e7c3a2")}"/>
</svg>`;
}

export const MOTIFS = {
  spark: sparkSvg,
  anvil: anvilSvg,
  coin: coinSvg,
  star: starSvg,
  blob: blobSvg,
  lantern: lanternSvg,
} as const;

export type Motif = keyof typeof MOTIFS;

export function emojiBadge(emoji: string, background: string): string {
  const safe = emoji.replace(/[<>&'"]/g, "").slice(0, 8) || "⭐";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Badge">
  <rect width="128" height="128" rx="32" fill="${clean(background)}"/>
  <text x="64" y="82" text-anchor="middle" font-size="64">${safe}</text>
</svg>`;
}

export function patternCss(palette: string[]): string {
  const [bg, accent, accent2] = palette;
  return `.forge-pattern {
  background-color: ${clean(bg ?? "#140e12")};
  background-image:
    radial-gradient(circle at 20% 20%, ${clean(accent ?? "#ff6a2c")}55, transparent 42%),
    radial-gradient(circle at 80% 0%, ${clean(accent2 ?? "#ffb03a")}44, transparent 36%),
    linear-gradient(135deg, transparent 0 46%, ${clean(accent ?? "#ff6a2c")}22 46% 54%, transparent 54%);
  background-size: auto, auto, 28px 28px;
}`;
}
