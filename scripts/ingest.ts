// Reads every Markdown file in ./knowledge, chunks it, builds the BM25 index
// and writes it to ./data/index.json. Run with: npm run ingest

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildIndex } from "../lib/bm25";
import { chunkMarkdown, type Chunk } from "../lib/chunk";

const root = process.cwd();
const knowledgeDir = path.join(root, process.env.KNOWLEDGE_DIR ?? "knowledge");
const outFile = path.join(root, "data", "index.json");

async function main() {
  const files = (await readdir(knowledgeDir)).filter((f) => /\.(md|markdown|txt)$/i.test(f)).sort();
  if (files.length === 0) {
    throw new Error(`No .md or .txt files found in ${knowledgeDir}`);
  }

  const chunks: Chunk[] = [];
  for (const file of files) {
    const text = await readFile(path.join(knowledgeDir, file), "utf8");
    const docChunks = chunkMarkdown(file, text);
    chunks.push(...docChunks);
    console.log(`  ${file}: ${docChunks.length} chunks`);
  }

  const index = buildIndex(chunks);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(index));
  console.log(`Indexed ${files.length} documents, ${chunks.length} chunks, ${Object.keys(index.df).length} terms -> data/index.json`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
