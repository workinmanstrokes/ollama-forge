import { useState } from "react";
import { PhoneGuide } from "./PhoneGuide";
import { useForge } from "../state/Store";
import type { Role, Settings } from "../lib/types";

const ROLES: { id: Role; label: string }[] = [
  { id: "architect", label: "Architect" },
  { id: "reviewer", label: "Reviewer" },
  { id: "planner", label: "Planner" },
  { id: "coder", label: "Coder" },
  { id: "fixer", label: "Fixer" },
];

export function SettingsPage() {
  const { settings, updateSettings, link, refreshLink } = useForge();
  const [message, setMessage] = useState("");
  const models = Array.from(new Set([...Object.values(settings.models), ...settings.knownModels, ...link.models].filter(Boolean)));

  function patch(partial: Partial<Settings>) {
    updateSettings({ ...settings, ...partial });
  }

  async function test() {
    setMessage("Testing…");
    const latest = await refreshLink();
    setMessage(latest.detail);
  }

  return (
    <main className="page">
      <p className="kicker">Settings</p>
      <h1>Workshop</h1>
      <section className="panel">
        <h2>Connection</h2>
        <label className="field">
          <span>How Forge reaches Ollama</span>
          <select
            value={settings.connection}
            onChange={(event) => patch({ connection: event.target.value as Settings["connection"] })}
          >
            <option value="auto">Auto</option>
            <option value="direct">Direct</option>
            <option value="server">Forge server</option>
          </select>
        </label>
        <label className="field">
          <span>Ollama URL</span>
          <input
            data-testid="settings-ollama-url"
            value={settings.ollamaUrl}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            onChange={(event) => patch({ ollamaUrl: event.target.value })}
          />
        </label>
        {settings.connection === "direct" ? null : (
          <label className="field">
            <span>Forge server URL</span>
            <input
              data-testid="settings-server-url"
              value={settings.serverUrl}
              placeholder="http://192.168.1.40:8787"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => patch({ serverUrl: event.target.value })}
            />
          </label>
        )}
        <button type="button" className="primary" data-testid="test-connection" onClick={() => void test()}>
          Test connection
        </button>
        <p className="muted" data-testid="connection-result" role="status">{message || link.detail}</p>
        {link.server ? (
          <p className="muted">
            Server on port {link.server.port}.
            {link.server.lan.length ? ` On the phone, open http://${link.server.lan[0]}:${link.server.port}` : ""}
          </p>
        ) : null}
      </section>
      <section className="panel">
        <h2>Models</h2>
        <p className="muted">Small local models do best when each role has a code model, such as qwen2.5-coder.</p>
        {ROLES.map((role) => (
          <label className="field" key={role.id}>
            <span>{role.label}</span>
            <select
              data-testid={`model-${role.id}`}
              value={settings.models[role.id]}
              onChange={(event) => patch({ models: { ...settings.models, [role.id]: event.target.value } })}
            >
              {models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>
        ))}
        {models.length === 0 ? <p className="muted">Run <code>ollama pull qwen2.5-coder:7b</code> on the PC, then test the connection.</p> : null}
      </section>
      <section className="panel">
        <h2>Generation</h2>
        <label className="field">
          <span>Temperature {settings.temperature.toFixed(1)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={settings.temperature}
            onChange={(event) => patch({ temperature: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          <span>Context size</span>
          <select value={settings.contextSize} onChange={(event) => patch({ contextSize: Number(event.target.value) })}>
            <option value={2048}>2048</option>
            <option value={4096}>4096</option>
            <option value={8192}>8192</option>
            <option value={16384}>16384</option>
            <option value={32768}>32768</option>
          </select>
        </label>
        <p className="muted">Forge trims each prompt to this context. Bigger models can take 16384 or 32768.</p>
        <label className="check">
          <input type="checkbox" checked={settings.autoRoute} onChange={(event) => patch({ autoRoute: event.target.checked })} />
          Auto-assign models by size. The largest model plans and reviews. A coder model writes files.
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.localImage} onChange={(event) => patch({ localImage: event.target.checked })} />
          Local images. Off by default. Forge only calls ComfyUI or Stable Diffusion if this is on and one is already running on this machine.
        </label>
      </section>
      <section className="panel">
        <PhoneGuide />
      </section>
      <section className="panel">
        <h2>About</h2>
        <p>Ollama Forge is a local workshop for DowntownDiddlerrr, made for Michael.</p>
        <p><a href="mailto:mscofield1588@gmail.com">mscofield1588@gmail.com</a></p>
        <p>Kid-safe rules are always on. Prompts refuse sexual content, graphic violence, and data collection. Generated projects cannot add network calls.</p>
        <p>Forge has no analytics, crash reports, or ads.</p>
      </section>
    </main>
  );
}
