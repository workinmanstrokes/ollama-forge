export function createMockOllama(): {
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
};
