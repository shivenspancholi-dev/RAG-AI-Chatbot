import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Bm25Index } from "./bm25";

let cached: Promise<Bm25Index> | null = null;

// Loads data/index.json once per server process.
export function loadIndex(): Promise<Bm25Index> {
  if (!cached) {
    const file = path.join(process.cwd(), "data", "index.json");
    cached = readFile(file, "utf8")
      .then((raw) => JSON.parse(raw) as Bm25Index)
      .catch((err) => {
        cached = null;
        throw new Error(`Could not read data/index.json. Run "npm run ingest" first. (${(err as Error).message})`);
      });
  }
  return cached;
}
