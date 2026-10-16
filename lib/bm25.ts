// Okapi BM25 index over document chunks. Serialisable to JSON so the
// ingest step can build it once and the app can load it at startup.

import type { Chunk } from "./chunk";
import { tokenize } from "./text";

export interface IndexedChunk extends Chunk {
  length: number;
  tf: Record<string, number>;
}

export interface Bm25Index {
  version: 1;
  builtAt: string;
  k1: number;
  b: number;
  avgLength: number;
  df: Record<string, number>;
  chunks: IndexedChunk[];
}

export interface SearchHit {
  chunk: IndexedChunk;
  score: number;
}

export function buildIndex(chunks: Chunk[], k1 = 1.2, b = 0.75): Bm25Index {
  const df: Record<string, number> = {};
  const indexed: IndexedChunk[] = chunks.map((chunk) => {
    // Section headings carry strong signal, so they are indexed with the body.
    const tokens = tokenize(`${chunk.section} ${chunk.text}`);
    const tf: Record<string, number> = {};
    for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
    for (const t of Object.keys(tf)) df[t] = (df[t] ?? 0) + 1;
    return { ...chunk, length: tokens.length, tf };
  });
  const total = indexed.reduce((sum, c) => sum + c.length, 0);
  return {
    version: 1,
    builtAt: new Date().toISOString(),
    k1,
    b,
    avgLength: indexed.length ? total / indexed.length : 0,
    df,
    chunks: indexed,
  };
}

export function idf(index: Bm25Index, term: string): number {
  const n = index.chunks.length;
  const d = index.df[term] ?? 0;
  return Math.log(1 + (n - d + 0.5) / (d + 0.5));
}

export function search(index: Bm25Index, query: string | string[], topK = 4): SearchHit[] {
  const terms = [...new Set(Array.isArray(query) ? query : tokenize(query))];
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const chunk of index.chunks) {
    let score = 0;
    for (const term of terms) {
      const f = chunk.tf[term];
      if (!f) continue;
      const norm = 1 - index.b + index.b * (chunk.length / (index.avgLength || 1));
      score += idf(index, term) * ((f * (index.k1 + 1)) / (f + index.k1 * norm));
    }
    if (score > 0) hits.push({ chunk, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, topK);
}
