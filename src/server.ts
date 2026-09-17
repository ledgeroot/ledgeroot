import { loadEnv } from "./env.js";
import { serveMCP } from "./mcp.js";

loadEnv();
await serveMCP();
