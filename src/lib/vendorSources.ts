import forgeKit from "../../vendor/forge-kit.js?raw";
import forgeUi from "../../vendor/forge-ui.js?raw";
import preact from "../../node_modules/preact/dist/preact.mjs?raw";
import hooks from "../../node_modules/preact/hooks/dist/hooks.mjs?raw";
import kaboom from "../../node_modules/kaboom/dist/kaboom.mjs?raw";

export const VENDORS: Record<string, string> = {
  "forge-kit": forgeKit,
  "forge-ui": forgeUi,
  preact,
  "preact/hooks": hooks,
  kaboom,
};

const NEEDS: Record<string, string[]> = {
  "forge-ui": ["preact"],
  "preact/hooks": ["preact"],
};

export function vendorsFor(sources: string[]): Record<string, string> {
  const wanted = new Set<string>();
  const queue = [...sources];
  while (queue.length) {
    const source = queue.pop() || "";
    for (const name of Object.keys(VENDORS)) {
      if (wanted.has(name)) continue;
      if (source.includes(`"${name}"`) || source.includes(`'${name}'`)) {
        wanted.add(name);
        for (const extra of NEEDS[name] || []) queue.push(`"${extra}"`);
      }
    }
  }
  const picked: Record<string, string> = {};
  for (const name of wanted) picked[name] = VENDORS[name] || "";
  return picked;
}
