import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface McpTransportsRepository {
  set: (sessionId: string, transport: StreamableHTTPServerTransport) => void;
  get: (sessionId: string) => StreamableHTTPServerTransport | undefined;
  has: (sessionId: string) => boolean;
  delete: (sessionId: string) => void;
  clear: () => void;
  entries: () => IterableIterator<[string, StreamableHTTPServerTransport]>;
}

export const createMcpTransportsRepository = (): McpTransportsRepository => {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  return {
    set: (sessionId: string, transport: StreamableHTTPServerTransport) => {
      transports.set(sessionId, transport);
    },

    get: (sessionId: string) => {
      return transports.get(sessionId);
    },

    has: (sessionId: string) => {
      return transports.has(sessionId);
    },

    delete: (sessionId: string) => {
      transports.delete(sessionId);
    },

    clear: () => {
      transports.clear();
    },

    entries: () => {
      return transports.entries();
    },
  };
};
