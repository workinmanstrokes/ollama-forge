export function createLevel() {
  return {
    platforms: [
      { x: 0, y: 200, w: 360, h: 28 },
      { x: 78, y: 156, w: 86, h: 12 },
      { x: 196, y: 118, w: 96, h: 12 },
    ],
    coins: [
      { x: 104, y: 132, got: false },
      { x: 228, y: 94, got: false },
      { x: 300, y: 170, got: false },
    ],
    goal: { x: 322, y: 168, w: 16, h: 32 },
  };
}

export function resetLevel(level) {
  for (const coin of level.coins) coin.got = false;
}
