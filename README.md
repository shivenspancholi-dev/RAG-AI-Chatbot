# RAG AI Chatbot

A self-hosted Retrieval-Augmented chatbot that answers questions from your own documents and cites the source of every sentence it returns.

It runs entirely on your own server. There are no external APIs, no API keys, and no paid services: retrieval, ranking and answer composition all happen in this codebase.

![Stack](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)

## How it works

```
knowledge/*.md ──► chunker ──► BM25 index (data/index.json)
                                     │
question ──► tokenizer ──► BM25 search ──► top chunks ──► sentence ranking ──► answer + [n] citations
```

1. **Ingest** (`npm run ingest`): every Markdown/text file in `knowledge/` is split into heading-aware chunks of about 700 characters with a small overlap, then indexed with Okapi BM25.
2. **Retrieve**: the question is tokenized the same way (stopwords removed, light stemming) and the best-matching chunks are found.
3. **Compose**: sentences inside those chunks are scored against the question, and the strongest ones are returned in reading order. Each sentence carries a citation such as `[1]` that links to the chunk it came from.
4. **Context**: a vague follow-up such as "could you explain further?" reuses the topic of the previous question. A follow-up that stands on its own is answered on its own.

Because answers are extracted, not generated, the bot cannot invent facts. If nothing relevant is found it says so.

## Getting started

```bash
npm install
npm run dev        # builds the index, then starts http://localhost:3000
```

Production:

```bash
npm run build      # builds the index and the Next.js app
npm start
```

## Using your own documents

1. Delete the sample files in `knowledge/` (they describe a fictional company).
2. Add your own `.md` or `.txt` files. Use `#` for the document title and `##` headings for sections; headings appear in the citations.
3. Run `npm run ingest` (or restart `npm run dev`).

Set `KNOWLEDGE_DIR` to index a different folder.

## Project structure

```
app/
  actions.ts       Server Actions: askQuestion, getKnowledgeBaseInfo
  chat.tsx         Chat UI with clickable citations and expandable sources
  page.tsx         Home page
lib/
  text.ts          Tokenizer, stopwords, stemmer, sentence splitter
  chunk.ts         Heading-aware Markdown chunker with overlap
  bm25.ts          BM25 index build + search
  answer.ts        Retrieval and extractive answer composition
  index-store.ts   Loads data/index.json once per server process
scripts/ingest.ts  Builds data/index.json from knowledge/
tests/             Unit tests (node:test)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run ingest` | Rebuild the search index from `knowledge/` |
| `npm run dev` | Ingest, then start the dev server |
| `npm run build` | Ingest, then create a production build |
| `npm test` | Run the unit tests |
| `npm run typecheck` | Type-check the project |

CI runs the same steps on every push (`.github/workflows/ci.yml`).

## Limits

- Matching is keyword-based. Synonyms that never appear in the documents ("vacation" vs "annual leave") are not matched; add them to your documents where it matters.
- Answers are quoted sentences, so they read like excerpts, not like a rewritten summary.

## License

MIT
