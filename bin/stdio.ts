#!/usr/bin/env tsx

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupServer } from "../lib/stdio-server.ts";

const run = async () => {
  const server = await setupServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Health Data MCP server running on stdio");
};

run().catch(console.error);
