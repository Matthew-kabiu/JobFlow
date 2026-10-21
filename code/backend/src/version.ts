import { readFileSync } from "node:fs";

// Artifact identity comes from the shipped manifest, never from deployment env.
export const VERSION = (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;
