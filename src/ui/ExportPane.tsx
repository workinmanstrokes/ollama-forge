import { useState } from "react";
import { strToU8 } from "fflate";
import { EMBER_PALETTE } from "../lib/palette";
import { slugify } from "../lib/parse";
import type { Project, ProjectFile } from "../lib/types";
import { useForge } from "../state/Store";
import { downloadBytes, injectPwa, pwaShell, rasterIcon, zipTextFiles } from "../lib/zip";

export function ExportPane({ project, files }: { project: Project; files: ProjectFile[] }) {
  const { settings, link } = useForge();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const root = serverRoot();

  function serverRoot(): string | null {
    if (link.status !== "online" || link.mode !== "server" || !link.server) return null;
    return settings.serverUrl.trim().replace(/\/$/, "");
  }

  async function downloadProject() {
    downloadBytes(zipTextFiles(files), `${slugify(project.name)}.zip`, "application/zip");
  }

  async function downloadPwa() {
    setBusy(true);
    setNote("Packing the PWA…");
    try {
      const palette = project.plan?.palette?.length ? project.plan.palette : EMBER_PALETTE;
      const [icon192, icon512] = await Promise.all([rasterIcon(192, palette), rasterIcon(512, palette)]);
      const shell = pwaShell(project.name, palette[1] ?? "#ff6a2c", palette[0] ?? "#140e12");
      const packed = files.map((file) => file.path === "index.html" ? { ...file, content: injectPwa(file.content) } : file);
      const bytes = zipTextFiles(packed, [
        { path: "manifest.webmanifest", data: strToU8(shell.manifest) },
        { path: "sw.js", data: strToU8(shell.sw) },
        { path: "icons/icon-192.png", data: icon192 },
        { path: "icons/icon-512.png", data: icon512 },
      ]);
      downloadBytes(bytes, `${slugify(project.name)}-pwa.zip`, "application/zip");
      setNote("PWA zip downloaded.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not pack the PWA.");
    } finally {
      setBusy(false);
    }
  }

  async function saveToPc() {
    if (root === null) return;
    setNote("Writing to the PC…");
    const response = await fetch(`${root}/api/projects/${project.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project.id, name: project.name, files }),
    });
    const body = await response.json() as { error?: string };
    setNote(response.ok ? `Saved on the PC as ${project.name}.` : body.error || "The PC could not save the project.");
  }

  return (
    <div className="export-pane">
      <h2>Prod export</h2>
      <p>A zip of the HTML, CSS, and JavaScript runs anywhere you can open a file or a static folder.</p>
      <div className="button-row">
        <button type="button" className="primary" data-testid="export-zip" onClick={() => void downloadProject()}>Download project ZIP</button>
        <button type="button" className="secondary" data-testid="export-pwa" disabled={busy} onClick={() => void downloadPwa()}>Download standalone PWA</button>
        {root !== null ? <button type="button" className="secondary" onClick={() => void saveToPc()}>Save to PC</button> : null}
      </div>
      {note ? <p className="muted" role="status">{note}</p> : null}
      <h3>Wrap an export as an APK</h3>
      <ol>
        <li>Download the standalone PWA and unzip it.</li>
        <li>Create a Capacitor app and copy those files into its web folder.</li>
        <li>Run <code>npm install @capacitor/core @capacitor/cli @capacitor/android</code>, then <code>npx cap add android</code> and <code>npx cap sync android</code>.</li>
        <li>From <code>android</code>, run <code>./gradlew assembleDebug</code>.</li>
        <li>Copy the debug APK to the Samsung S25 Ultra and install it. Android will ask you to allow that source.</li>
      </ol>
      <p className="muted">PWABuilder and Bubblewrap can wrap a hosted manifest too. Hosting the unzipped folder on your LAN is enough. Forge does not upload the project anywhere.</p>
    </div>
  );
}
