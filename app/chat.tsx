"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Answer, Source } from "@/lib/answer";
import { askQuestion } from "./actions";

interface Turn {
  question: string;
  result: Answer | null;
  error?: string;
}

const SUGGESTIONS = [
  "How many days of annual leave do I get?",
  "Can I work remotely?",
  "How do I reset my password?",
  "What is the expense claim deadline?",
];

export default function Chat({ documents }: { documents: { source: string; title: string }[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function submit(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    const previous = turns.map((t) => t.question);
    setInput("");
    setTurns((t) => [...t, { question: q, result: null }]);
    startTransition(async () => {
      try {
        const result = await askQuestion(q, previous);
        setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, result } : turn)));
      } catch (err) {
        const error = err instanceof Error ? err.message : "Something went wrong.";
        setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, error } : turn)));
      }
    });
  }

  return (
    <section className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6" aria-live="polite">
        {turns.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium">Try one of these:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm hover:border-violet-400 hover:text-violet-600 dark:border-neutral-700 dark:hover:text-violet-400"
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              Indexed: {documents.map((d) => d.title).join(", ")}
            </p>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-sm text-white">
              {turn.question}
            </div>
            <div className="max-w-[95%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed dark:border-neutral-800 dark:bg-neutral-900">
              {turn.error ? (
                <p className="text-red-600">{turn.error}</p>
              ) : turn.result ? (
                <AnswerView result={turn.result} turn={i} />
              ) : (
                <p className="animate-pulse text-neutral-500">Searching the knowledge base…</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="sticky bottom-0 mt-6 flex gap-2 bg-neutral-50 pb-2 pt-3 dark:bg-neutral-950"
      >
        <label htmlFor="q" className="sr-only">Your question</label>
        <input
          id="q"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Ask a question about the documents…"
          className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}

function AnswerView({ result, turn }: { result: Answer; turn: number }) {
  return (
    <div>
      <p>{renderCitations(result.answer, turn)}</p>
      {result.sources.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sources</p>
          {result.sources.map((s) => (
            <SourceCard key={s.n} source={s} turn={turn} />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceCard({ source, turn }: { source: Source; turn: number }) {
  return (
    <details id={`src-${turn}-${source.n}`} className="group rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-800/60">
      <summary className="cursor-pointer list-none">
        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-violet-100 font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
          {source.n}
        </span>
        <span className="font-medium">{source.title}</span>
        {source.section && source.section !== source.title && <span className="text-neutral-500"> › {source.section}</span>}
        <span className="ml-2 text-neutral-400">({source.source})</span>
      </summary>
      <p className="mt-2 whitespace-pre-line text-neutral-600 dark:text-neutral-300">{source.excerpt}</p>
    </details>
  );
}

function renderCitations(text: string, turn: number) {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = /^\[(\d+)\]$/.exec(part);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <a key={i} href={`#src-${turn}-${m[1]}`} className="ml-0.5 align-super text-[10px] font-semibold text-violet-600 dark:text-violet-400">
        [{m[1]}]
      </a>
    );
  });
}
