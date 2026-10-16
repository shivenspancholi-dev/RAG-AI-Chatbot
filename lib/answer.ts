// Retrieval + extractive answer composition.
// The answer is built only from sentences that exist in the knowledge base,
// and every sentence carries a citation back to the chunk it came from.

import { idf, search, type Bm25Index, type SearchHit } from "./bm25";
import { splitSentences, tokenize } from "./text";

export interface Source {
  n: number; // citation number shown in the answer, e.g. [1]
  source: string;
  title: string;
  section: string;
  excerpt: string;
  score: number;
}

export interface Answer {
  answer: string;
  sources: Source[];
  found: boolean;
  queryTerms: string[];
}

export interface AskOptions {
  topK?: number;
  maxSentences?: number;
  minScore?: number;
}

// Follow-ups that make no sense alone ("and how long is it valid?") borrow the
// topic of the previous question so retrieval stays on the same subject.
export function contextualTerms(question: string, previousQuestions: string[]): string[] {
  const terms = tokenize(question);
  const last = previousQuestions.at(-1);
  if (last) {
    for (const t of tokenize(last)) if (!terms.includes(t)) terms.push(t);
  }
  return terms;
}

export function ask(index: Bm25Index, question: string, previousQuestions: string[] = [], options: AskOptions = {}): Answer {
  const topK = options.topK ?? 4;
  const maxSentences = options.maxSentences ?? 3;
  const minScore = options.minScore ?? 1.0;

  // Answer from the question alone when it retrieves something; only fall
  // back to conversation context when it does not.
  let queryTerms = tokenize(question);
  let hits = search(index, queryTerms, topK).filter((h) => h.score >= minScore);
  if (hits.length === 0 && previousQuestions.length > 0) {
    queryTerms = contextualTerms(question, previousQuestions);
    hits = search(index, queryTerms, topK).filter((h) => h.score >= minScore);
  }

  if (hits.length === 0) {
    return {
      answer: "I couldn't find anything about that in the knowledge base. Try rephrasing, or add a document that covers it.",
      sources: [],
      found: false,
      queryTerms,
    };
  }

  const picked = pickSentences(index, hits, queryTerms, maxSentences);

  // Number sources in the order they are first cited.
  const sourceNumbers = new Map<string, number>();
  const sources: Source[] = [];
  const parts: string[] = [];
  for (const p of picked) {
    let n = sourceNumbers.get(p.hit.chunk.id);
    if (n === undefined) {
      n = sources.length + 1;
      sourceNumbers.set(p.hit.chunk.id, n);
      sources.push({
        n,
        source: p.hit.chunk.source,
        title: p.hit.chunk.title,
        section: p.hit.chunk.section,
        excerpt: p.hit.chunk.text,
        score: Number(p.hit.score.toFixed(3)),
      });
    }
    parts.push(`${p.sentence} [${n}]`);
  }

  return { answer: parts.join(" "), sources, found: true, queryTerms };
}

interface Picked {
  hit: SearchHit;
  sentence: string;
  score: number;
  order: number;
}

function pickSentences(index: Bm25Index, hits: SearchHit[], terms: string[], max: number): Picked[] {
  const candidates: Picked[] = [];
  hits.forEach((hit, rank) => {
    splitSentences(hit.chunk.text).forEach((sentence, i) => {
      const tokens = new Set(tokenize(sentence));
      let score = 0;
      for (const t of terms) if (tokens.has(t)) score += idf(index, t);
      if (score === 0) return;
      // Favour sentences from higher-ranked chunks.
      score *= 1 / (1 + rank * 0.35);
      candidates.push({ hit, sentence, score, order: rank * 1000 + i });
    });
  });

  const chosen: Picked[] = [];
  const seen = new Set<string>();
  candidates.sort((a, b) => b.score - a.score);
  // Drop sentences that only share a minor word with the question.
  const cutoff = (candidates[0]?.score ?? 0) * 0.5;
  for (const c of candidates) {
    if (c.score < cutoff) break;
    const key = c.sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(c);
    if (chosen.length === max) break;
  }
  // Present the chosen sentences in reading order, not score order.
  return chosen.sort((a, b) => a.order - b.order);
}
