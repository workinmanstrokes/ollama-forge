import type { ProjectFile } from "./types";
import { resolveRelative } from "./modules";
import { VENDORS } from "./vendorSources";

let ready: Promise<void> | null = null;

export async function bundleWithEsbuild(files: ProjectFile[]): Promise<string> {
  const esbuild = await import("esbuild-wasm");
  const wasm = await import("esbuild-wasm/esbuild.wasm?url");
  if (!ready) {
    ready = esbuild.initialize({ wasmURL: wasm.default });
  }
  await ready;
  const byPath = new Map(files.map((file) => [file.path, file.content]));
  const entry = byPath.has("src/main.js") ? "src/main.js" : "main.js";
  const result = await esbuild.build({
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    stdin: {
      contents: byPath.get(entry) || "",
      resolveDir: "/",
      sourcefile: entry,
      loader: "js",
    },
    plugins: [
      {
        name: "forge-files",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.startsWith(".")) {
              const from = args.importer && args.importer !== "<stdin>" ? args.importer : entry;
              return { path: resolveRelative(from, args.path), namespace: "forge" };
            }
            return { path: args.path, namespace: "forge" };
          });
          build.onLoad({ filter: /.*/, namespace: "forge" }, (args) => {
            const contents = VENDORS[args.path] || byPath.get(args.path);
            if (contents === undefined) return { errors: [{ text: `Missing ${args.path}` }] };
            return { contents, loader: "js" };
          });
        },
      },
    ],
  });
  return result.outputFiles[0]?.text || "";
}
