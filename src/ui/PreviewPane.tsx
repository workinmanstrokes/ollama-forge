import { useEffect, useRef, useState } from "react";
import { buildSrcdoc } from "../lib/preview";
import type { DeviceFrame, ProjectFile } from "../lib/types";

const FRAMES: DeviceFrame[] = ["phone", "tablet", "desktop"];

function fingerprint(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function PreviewPane({ files, device, onDevice }: { files: ProjectFile[]; device: DeviceFrame; onDevice: (device: DeviceFrame) => void }) {
  const signature = files.map((file) => `${file.path}\n${file.content}`).join("\n---\n");
  const filesRef = useRef(files);
  filesRef.current = files;
  const [doc, setDoc] = useState(() => buildSrcdoc(files));
  useEffect(() => {
    const timer = window.setTimeout(() => setDoc(buildSrcdoc(filesRef.current)), 200);
    return () => window.clearTimeout(timer);
  }, [signature]);

  return (
    <div className="preview-pane">
      <div className="segmented" role="group" aria-label="Preview size">
        {FRAMES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={device === item}
            className={device === item ? "selected" : ""}
            data-testid={`device-${item}`}
            onClick={() => onDevice(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className={`device ${device}`}>
        <iframe key={fingerprint(doc)} data-testid="preview-frame" title="Project preview" sandbox="allow-scripts" srcDoc={doc} />
      </div>
    </div>
  );
}
