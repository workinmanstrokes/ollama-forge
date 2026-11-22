import { useEffect, useRef } from "react";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";

function languageFor(path: string) {
  if (path.endsWith(".css")) return css();
  if (path.endsWith(".html")) return html();
  return javascript();
}

export function CodeEditor({ path, value, onChange }: { path: string; value: string; onChange: (value: string) => void }) {
  const parent = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const initial = useRef(value);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = parent.current;
    if (!host) return;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initial.current,
        extensions: [
          basicSetup,
          languageFor(path),
          oneDark,
          EditorView.theme({
            "&": { height: "100%", fontSize: "16px" },
            ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
            ".cm-content": { padding: "12px 0" },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    return () => view.destroy();
  }, [path]);

  return <div ref={parent} className="cm-host" data-testid="editor" />;
}
