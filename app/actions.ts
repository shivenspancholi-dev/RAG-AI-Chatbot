"use server";

import { ask, type Answer } from "@/lib/answer";
import { loadIndex } from "@/lib/index-store";

const MAX_QUESTION_LENGTH = 500;

export async function askQuestion(question: string, previousQuestions: string[]): Promise<Answer> {
  const q = String(question ?? "").trim().slice(0, MAX_QUESTION_LENGTH);
  if (!q) {
    return { answer: "Please type a question.", sources: [], found: false, queryTerms: [] };
  }
  const history = Array.isArray(previousQuestions) ? previousQuestions.slice(-3).map(String) : [];
  const index = await loadIndex();
  return ask(index, q, history);
}

export async function getKnowledgeBaseInfo() {
  const index = await loadIndex();
  const docs = new Map<string, string>();
  for (const c of index.chunks) docs.set(c.source, c.title);
  return {
    documents: [...docs].map(([source, title]) => ({ source, title })),
    chunks: index.chunks.length,
    builtAt: index.builtAt,
  };
}
