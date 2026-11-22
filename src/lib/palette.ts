function hashString(seed: string): number {
  let hash = 2166136261;
  const text = seed || "forge";
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

export function paletteFromSeed(seed: string): string[] {
  const hue = hashString(seed) % 360;
  return [
    hslToHex(hue, 32, 9),
    hslToHex(hue, 82, 56),
    hslToHex((hue + 32) % 360, 88, 64),
    hslToHex(hue, 35, 96),
    hslToHex((hue + 150) % 360, 52, 62),
  ];
}

export const EMBER_PALETTE = ["#140e12", "#ff6a2c", "#ffb03a", "#fff6ec", "#5ee0a0"];
