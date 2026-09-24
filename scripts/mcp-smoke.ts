import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Drive the engine the way an agent host does: over MCP, not over the CLI.
 *
 * The engine's own tests call the tool handlers in-process, which cannot catch a
 * tool that is registered wrongly, an input schema a host would reject, or a
 * server that fails to start. This spawns the real server over stdio and speaks
 * the real protocol, which is the surface the demo depends on.
 */
const ROOT = new URL("..", import.meta.url).pathname;

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/cli.js", "serve"],
  cwd: ROOT,
  env: { ...(process.env as Record<string, string>) },
});

const client = new Client({ name: "ledgeroot-smoke", version: "0.0.0" });

function show(label: string, value: unknown): void {
  const text = JSON.stringify(value, null, 2);
  console.log(`\n=== ${label} ===\n${text.length > 1400 ? `${text.slice(0, 1400)}\n…` : text}`);
}

try {
  await client.connect(transport);
  console.log("connected:", JSON.stringify(client.getServerVersion()));

  const { tools } = await client.listTools();
  console.log(`\ntools exposed (${tools.length}):`);
  for (const tool of tools) {
    const required = (tool.inputSchema as { required?: string[] } | undefined)?.required ?? [];
    console.log(`  ${tool.name.padEnd(24)} required: [${required.join(", ")}]`);
  }

  show("ledgeroot_mandate_list", await client.callTool({ name: "ledgeroot_mandate_list", arguments: {} }));
  show(
    "ledgeroot_receipt_list (first 1)",
    await client.callTool({ name: "ledgeroot_receipt_list", arguments: {} }),
  );
  show("ledgeroot_verify", await client.callTool({ name: "ledgeroot_verify", arguments: {} }));
} finally {
  await client.close();
}
