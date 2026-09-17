import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServices } from "./bootstrap.js";
import { createToolRouter } from "./tools/registry.js";

/** Start the ledgeroot MCP server over stdio. */
export async function serveMCP(): Promise<void> {
  const services = createServices();
  const server = new McpServer({ name: "ledgeroot", version: "0.1.0" });
  createToolRouter(server, services);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
