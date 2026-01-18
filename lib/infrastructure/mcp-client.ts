import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const createMcpClient = async (server: McpServer): Promise<Client> => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({
    name: "gemini-health-client",
    version: "1.0.0",
  });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return client;
};
