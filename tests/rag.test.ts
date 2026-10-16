import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { ask } from "../lib/answer";
import { buildIndex, search } from "../lib/bm25";
import { chunkMarkdown } from "../lib/chunk";
import { stem, tokenize } from "../lib/text";

const dir = path.join(process.cwd(), "knowledge");
const chunks = readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .flatMap((f) => chunkMarkdown(f, readFileSync(path.join(dir, f), "utf8")));
const index = buildIndex(chunks);

test("tokenize drops stopwords and folds inflections", () => {
  assert.deepEqual(tokenize("What are the policies for booking?"), ["policy", "book"]);
  assert.equal(stem("expenses"), "expense");
});

test("chunks keep their heading and stay under the size limit", () => {
  const md = "# Doc\n\n## Part A\n\n" + "Sentence one is here. ".repeat(80) + "\n\n## Part B\n\nShort.";
  const out = chunkMarkdown("doc.md", md, { maxChars: 300, overlapChars: 50 });
  assert.ok(out.length > 2);
  assert.ok(out.every((c) => c.text.length <= 360));
  assert.equal(out.at(-1)?.section, "Part B");
  assert.equal(out[0].title, "Doc");
});

test("search ranks the relevant document first", () => {
  const [top] = search(index, "reset my password");
  assert.equal(top.chunk.source, "it-support.md");
});

test("answers cite the chunks they were taken from", () => {
  const result = ask(index, "How many days of annual leave do I get?");
  assert.ok(result.found);
  assert.match(result.answer, /24 days/);
  assert.match(result.answer, /\[1\]/);
  assert.equal(result.sources[0].source, "leave-policy.md");
});

test("follow-ups answer on their own when they can", () => {
  const result = ask(index, "and what about two-factor?", ["How do I reset my password?"]);
  assert.equal(result.sources[0].section, "Two-factor authentication");
});

test("vague follow-ups reuse the previous topic", () => {
  const result = ask(index, "could you explain further?", ["How do I reset my password?"]);
  assert.ok(result.found);
  assert.equal(result.sources[0].source, "it-support.md");
});

test("unknown topics return a not-found answer with no sources", () => {
  const result = ask(index, "quantum chromodynamics lattice");
  assert.equal(result.found, false);
  assert.equal(result.sources.length, 0);
});
