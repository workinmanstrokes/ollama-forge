declare module "../mock/ollama-server.mjs" {
  export function createMockOllama(): {
    listen(port?: number): Promise<number>;
    close(): Promise<void>;
  };
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
