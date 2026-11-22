declare module "../mock/ollama-server.mjs" {
  export function createMockOllama(): {
    listen(port?: number): Promise<number>;
    close(): Promise<void>;
  };
}

declare module "../scripts/export-apk.mjs" {
  export function exportApkStatus(): { ok: boolean; home?: string; message: string };
}

declare module "../server/index.mjs" {
  export function createForgeServer(options?: {
    port?: number;
    ollamaUrl?: string;
    projects?: string;
    dist?: string;
  }): {
    server: { close: (callback: () => void) => void };
    port: number;
    listen(): Promise<number>;
  };
}
