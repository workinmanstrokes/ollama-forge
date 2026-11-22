import { useMemo, useState } from "react";
import { MOTIFS, emojiBadge, patternCss, type Motif } from "../lib/assets";
import { askForNames } from "../lib/generate";
import { saveProject } from "../lib/idb";
import { paletteFromSeed } from "../lib/palette";
import { applyPalette } from "../lib/parse";
import { commitFiles } from "../lib/projects";
import { useForge } from "../state/Store";
import { downloadBytes } from "../lib/zip";
import { strToU8 } from "fflate";

const EMOJIS = ["⭐", "🔥", "🌙", "🐟", "🍞", "🎈", "🍀", "🐝"];

export function AssetsPage() {
  const { projects, activeProjectId, upsert, link } = useForge();
  const project = projects.find((item) => item.id === activeProjectId) ?? null;
  const [seed, setSeed] = useState("forge");
  const [motif, setMotif] = useState<Motif>("spark");
  const [emoji, setEmoji] = useState("⭐");
  const [names, setNames] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const palette = useMemo(() => paletteFromSeed(seed), [seed]);
  const svg = MOTIFS[motif](palette);
  const badge = emojiBadge(emoji, palette[0] ?? "#140e12");
  const pattern = patternCss(palette);

  async function insert(path: string, content: string) {
    if (!project) return;
    const files = project.files.some((file) => file.path === path)
      ? project.files.map((file) => (file.path === path ? { ...file, content } : file))
      : [...project.files, { path, content }];
    const next = commitFiles(project, files, "Asset", path);
    await saveProject(next);
    upsert(next);
    setNote(`Added ${path} to ${project.name}.`);
  }

  async function applyColors() {
    if (!project) return;
    const files = project.files.map((file) => file.path === "styles.css" ? { ...file, content: applyPalette(file.content, palette) } : file);
    const next = commitFiles(project, files, "Palette", seed);
    await saveProject(next);
    upsert(next);
    setNote(`Applied this palette to ${project.name}.`);
  }

  return (
    <main className="page">
      <p className="kicker">Assets</p>
      <h1>Art from the forge</h1>
      <p className="lede">Palettes, SVG, and badges are drawn on this device. Nothing is fetched.</p>
      <label className="field">
        <span>Seed</span>
        <input data-testid="asset-seed" value={seed} onChange={(event) => setSeed(event.target.value)} />
      </label>
      <div className="swatches" data-testid="asset-palette">
        {palette.map((color) => <span key={color} style={{ background: color }} title={color} />)}
      </div>
      <div className="chip-row">
        {(Object.keys(MOTIFS) as Motif[]).map((item) => (
          <button key={item} type="button" className={item === motif ? "chip selected" : "chip"} onClick={() => setMotif(item)}>{item}</button>
        ))}
      </div>
      <div className="asset-preview" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={() => downloadBytes(strToU8(svg), `${motif}.svg`, "image/svg+xml")}>Download SVG</button>
        {project ? <button type="button" className="primary" onClick={() => void insert(`assets/${motif}.svg`, svg)}>Add to {project.name}</button> : null}
        {project ? <button type="button" className="secondary" onClick={() => void applyColors()}>Apply palette</button> : null}
      </div>
      <h2>Emoji badge</h2>
      <div className="chip-row">
        {EMOJIS.map((item) => (
          <button key={item} type="button" className={item === emoji ? "chip selected" : "chip"} onClick={() => setEmoji(item)} aria-label={item}>{item}</button>
        ))}
      </div>
      <div className="asset-preview" dangerouslySetInnerHTML={{ __html: badge }} />
      <button type="button" className="secondary" onClick={() => downloadBytes(strToU8(badge), "badge.svg", "image/svg+xml")}>Download badge</button>
      {project ? <button type="button" className="secondary" onClick={() => void insert("assets/badge.svg", badge)}>Add badge to project</button> : null}
      <h2>CSS pattern</h2>
      <pre className="pattern-sample" style={{ background: palette[0], color: palette[3] }}>{pattern}</pre>
      <button type="button" className="secondary" onClick={() => void navigator.clipboard?.writeText(pattern)}>Copy CSS</button>
      {project ? <button type="button" className="secondary" onClick={() => void insert("assets/pattern.css", pattern)}>Add pattern file</button> : null}
      {link.status === "online" ? (
        <button
          type="button"
          className="primary"
          onClick={() => {
            setNote("Asking the local model…");
            void askForNames(seed)
              .then((text) => {
                setNames(text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 6));
                setNote("");
              })
              .catch((error: unknown) => setNote(error instanceof Error ? error.message : "The model did not answer."));
          }}
        >
          Ask the local model for names
        </button>
      ) : null}
      {names.length > 0 ? (
        <div className="chip-row">
          {names.map((name) => (
            <button key={name} type="button" className="chip" onClick={() => setSeed(name)}>{name}</button>
          ))}
        </div>
      ) : null}
      {note ? <p className="muted" role="status">{note}</p> : null}
    </main>
  );
}
