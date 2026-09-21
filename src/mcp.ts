import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServices } from "./bootstrap.js";
import { createToolRouter } from "./tools/registry.js";

/**
 * The package's own version, read rather than written down here.
 *
 * A literal drifts the moment a release bumps the manifest — this server
 * reported 0.1.0 while the package was on 0.4.x — and it is the version hosts
 * display next to the server's name.
 */
function packageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const manifest = readFileSync(join(here, "..", "package.json"), "utf8");
  return (JSON.parse(manifest) as { version: string }).version;
}

/** Start the ledgeroot MCP server over stdio. */
export async function serveMCP(): Promise<void> {
  const services = createServices();
  const server = new McpServer({ name: "ledgeroot", version: packageVersion() });
  createToolRouter(server, services);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
