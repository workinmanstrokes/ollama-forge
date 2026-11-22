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
