export function snippetFor(path: string, summary: string): string {
  const text = `${path} ${summary}`.toLowerCase();
  if (text.includes("player") || text.includes("speed")) {
    return `Example:\nexport const PLAYER_SPEED = 170;\nexport function createPlayer() {\n  return { x: 0, y: 0, jump() { return true; } };\n}`;
  }
  if (text.includes("menu") || text.includes("ui") || text.includes("pause")) {
    return `Example:\nexport function mountShell(root, title) {\n  root.innerHTML = '<button id="start" type="button">Start</button><button id="pausebtn" type="button">Pause</button>';\n}`;
  }
  if (text.includes("save")) {
    return `Example:\nimport { createStore } from "forge-kit";\nexport function createSave(title) {\n  const store = createStore(title);\n  return { best() { return 0; }, keep(score) { store.save({ best: score }); return score; } };\n}`;
  }
  return `Use export for anything another file imports. Import forge-kit for save, sound, and particles. No network calls.`;
}
