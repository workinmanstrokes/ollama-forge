import { useRef, useState } from "react";
import { completeEdit } from "../lib/generate";
import { getTemplate } from "../lib/templates";
import type { Project } from "../lib/types";

export function ChatPane({ project, onProject }: { project: Project; onProject: (project: Project) => void }) {
  const template = getTemplate(project.kind);
  const [text, setText] = useState("");
  const [stream, setStream] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  async function send(instruction: string) {
    const value = instruction.trim();
    if (!value || busy) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setStream("");
    try {
      const next = await completeEdit(project, value, (token) => setStream((current) => current + token), controller.signal);
      onProject(next);
      setText("");
      setStream("");
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "The edit failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-pane">
      <div className="chat-log">
        {project.chat.map((message) => (
          <p key={message.id} className={`bubble ${message.role}`}>{message.content}</p>
        ))}
        {stream ? <pre className="stream">{stream}</pre> : null}
        {error ? <p className="error" role="alert">{error}</p> : null}
      </div>
      <div className="chip-row">
        {template.info.chips.map((chip) => (
          <button key={chip} type="button" className="chip" disabled={busy} onClick={() => void send(chip)}>{chip}</button>
        ))}
      </div>
      <label className="field">
        <span>Change the project</span>
        <textarea data-testid="chat-input" rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Make the player faster" />
      </label>
      <div className="button-row">
        <button type="button" className="primary" data-testid="chat-send" disabled={busy} onClick={() => void send(text)}>Send</button>
        {busy ? <button type="button" className="secondary" onClick={() => abort.current?.abort()}>Cancel</button> : null}
      </div>
    </div>
  );
}
