export function spritePixels(seed: string, palette: string[]): string[][] {
  const colors = palette.length ? palette : ["#140e12", "#ff6a2c", "#ffb03a", "#fff6ec"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  const rows: string[][] = [];
  for (let y = 0; y < 16; y++) {
    const row: string[] = [];
    for (let x = 0; x < 8; x++) {
      const mirror = x < 4 ? x : 7 - x;
      const bit = (hash >> ((y * 4 + mirror) % 24)) & 3;
      const body = y > 2 && y < 14 && mirror < 3;
      row.push(body && bit > 0 ? colors[1 + (bit % (colors.length - 1))] : colors[0]);
    }
    rows.push(row);
  }
  rows[4][2] = colors[3] || "#fff6ec";
  rows[4][5] = colors[3] || "#fff6ec";
  return rows;
}

export function tilesetPixels(palette: string[]): string[][] {
  const [bg, a, b, ink] = palette.length >= 4 ? palette : ["#140e12", "#ff6a2c", "#ffb03a", "#fff6ec"];
  const rows: string[][] = [];
  for (let y = 0; y < 32; y++) {
    const row: string[] = [];
    for (let x = 0; x < 32; x++) {
      const tile = Math.floor(x / 8) + Math.floor(y / 8) * 4;
      const lx = x % 8;
      const ly = y % 8;
      let color = bg;
      if (tile === 0 && (lx + ly) % 2 === 0) color = a;
      if (tile === 1 && (lx === 0 || ly === 0)) color = b;
      if (tile === 2 && lx > 1 && lx < 6 && ly > 1 && ly < 6) color = a;
      if (tile === 3 && (lx === ly || lx + ly === 7)) color = ink;
      row.push(color);
    }
    rows.push(row);
  }
  return rows;
}

export function iconSet(palette: string[]): { name: string; svg: string }[] {
  const [bg, accent, accent2] = palette;
  const base = (body: string, name: string) => ({
    name,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${bg}"/><g fill="${accent}" stroke="${accent2}" stroke-width="1.5">${body}</g></svg>`,
  });
  return [
    base(`<circle cx="16" cy="16" r="6"/>`, "spark"),
    base(`<path d="M8 20h16l-2 4H10z"/>`, "anvil"),
    base(`<rect x="10" y="8" width="12" height="16" rx="2"/>`, "card"),
    base(`<path d="M8 22l8-12 8 12z"/>`, "home"),
  ];
}
