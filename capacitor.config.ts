import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.downtowndiddlerrr.ollamaforge",
  appName: "Ollama Forge",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "http",
    hostname: "localhost",
    cleartext: true,
  },
};

export default config;
