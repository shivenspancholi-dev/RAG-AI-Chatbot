import { getKnowledgeBaseInfo } from "./actions";
import Chat from "./chat";

export const dynamic = "force-dynamic";

export default async function Home() {
  const info = await getKnowledgeBaseInfo();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">RAG AI Chatbot</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Ask your knowledge base</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Answers are built from {info.documents.length} documents ({info.chunks} chunks) and every sentence links back to its source.
          Everything runs on this server; no external APIs are called.
        </p>
      </header>
      <Chat documents={info.documents} />
    </main>
  );
}
