import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Optional: Define configuration schema to require configuration at connection time
export const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
});

export function createStatefulServer({
  sessionId,
  config,
}: {
  sessionId: string;
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "My Stateful MCP Server",
    version: "1.0.0",
  });

  // Session-specific state
  const sessionData = new Map();

  server.tool("get_session", "Get current session ID", {}, async () => {
    return {
      content: [{ type: "text", text: `Session: ${sessionId}` }],
    };
  });

  server.tool(
    "store_data",
    "Store data in session",
    {
      key: z.string().describe("Storage key"),
      value: z.string().describe("Value to store"),
    },
    async ({ key, value }) => {
      sessionData.set(key, value);
      return {
        content: [{ type: "text", text: `Stored ${key}: ${value}` }],
      };
    }
  );

  return server.server;
}
