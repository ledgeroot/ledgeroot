import { existsSync } from "node:fs";

/**
 * Load `.env` from the current working directory into process.env.
 *
 * Called only by the standalone entry points (CLI, MCP server, deploy/demo
 * scripts). The library itself never loads `.env`, so consuming apps keep
 * full control over their own environment.
 */
export function loadEnv(path = ".env"): void {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}
