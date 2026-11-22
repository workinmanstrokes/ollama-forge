import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function sdkHome() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
}

export function exportApkStatus() {
  const home = sdkHome();
  if (!home) {
    return {
      ok: false,
      message: "No Android SDK found. Install Android Studio or the command-line tools, set ANDROID_HOME, then run this command again.",
    };
  }
  return { ok: true, home, message: `Using Android SDK at ${home}.` };
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

async function main() {
  const source = process.argv[2];
  const status = exportApkStatus();
  if (!source) {
    console.error("Usage: npm run export-apk -- <exported-folder>");
    process.exit(1);
  }
  if (!fs.existsSync(path.resolve(source, "index.html"))) {
    console.error("The folder needs an index.html export.");
    process.exit(1);
  }
  if (!status.ok) {
    console.error(status.message);
    process.exit(1);
  }
  const root = process.cwd();
  const dest = path.join(root, "android", "app", "src", "main", "assets", "public");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(path.resolve(source), dest, { recursive: true });
  const gradle = path.join(root, "android", process.platform === "win32" ? "gradlew.bat" : "gradlew");
  await run(gradle, ["assembleDebug"], path.join(root, "android"));
  console.log("Debug APK: android/app/build/outputs/apk/debug/app-debug.apk");
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
