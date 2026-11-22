import { useState } from "react";

const WINDOWS = `set OLLAMA_HOST=0.0.0.0:11434
set OLLAMA_ORIGINS=*
ollama serve`;

const POWERSHELL = `$env:OLLAMA_HOST="0.0.0.0:11434"
$env:OLLAMA_ORIGINS="*"
ollama serve`;

const UNIX = `OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS=* ollama serve`;

const TERMUX = `pkg update && pkg upgrade -y
pkg install proot-distro
proot-distro install debian
proot-distro login debian
apt update && apt install -y curl ca-certificates
curl -fsSL https://ollama.com/install.sh | sh
ollama serve`;

export function PhoneGuide() {
  return (
    <div className="guide">
      <h2>Connect from the phone</h2>
      <p>The Samsung and the PC need the same Wi-Fi. Guest networks often block devices from seeing each other.</p>
      <ol>
        <li>Quit the Ollama tray app so the terminal can bind the port.</li>
        <li>Start Ollama so it listens on the LAN and answers the browser.</li>
        <li>Find the PC address with <code>ipconfig</code> on Windows or <code>ip addr</code> on Linux. It looks like <code>192.168.1.40</code>.</li>
        <li>On the phone, set the Ollama URL to <code>http://192.168.1.40:11434</code> and tap Test connection.</li>
      </ol>
      <p>The recommended path is forge-server. It serves this app, proxies Ollama, and can save projects on the PC:</p>
      <CopyBlock text="npm run build && npm run server" />
      <p>Then open <code>http://&lt;PC-LAN-IP&gt;:8787</code> on the phone. Forge detects the server and sends model calls through it, which avoids browser CORS blocks.</p>
      <h3>Direct Ollama</h3>
      <p>Use this when the phone browser or the Forge APK talks to Ollama itself.</p>
      <CopyBlock text={POWERSHELL} label="PowerShell" />
      <CopyBlock text={WINDOWS} label="Command Prompt" />
      <CopyBlock text={UNIX} label="macOS or Linux" />
      <p>Allow TCP 11434, and 8787 if you use forge-server, on private networks. On Windows that is an inbound firewall rule for those ports.</p>
      <h3>Ollama in Termux</h3>
      <p>On-device Ollama is optional and slower than the PC. The S25 Ultra can run a small model. Treat 7B and up as a PC job. Install Termux from F-Droid or the Termux GitHub releases, not the old Play Store build. If <code>pkg install ollama</code> exists in your Termux repo, that is the short path. Otherwise use Debian inside proot-distro:</p>
      <CopyBlock text={TERMUX} label="Termux" />
      <p>In the same Debian shell, pull a small model such as <code>ollama pull qwen2.5-coder:1.5b</code>. Keep the session awake with <code>termux-wake-lock</code> from Termux. Point Forge at <code>http://127.0.0.1:11434</code>.</p>
    </div>
  );
}

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [note, setNote] = useState(label ? "Copy" : "Copy");
  return (
    <div className="copy-block">
      {label ? <span className="copy-label">{label}</span> : null}
      <pre>{text}</pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(
            () => setNote("Copied"),
            () => setNote("Select the text to copy"),
          );
        }}
      >
        {note}
      </button>
    </div>
  );
}
