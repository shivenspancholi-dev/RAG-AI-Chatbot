// Splits Markdown documents into overlapping, heading-aware chunks.

export interface Chunk {
  id: string;
  source: string; // file name, e.g. "leave-policy.md"
  title: string; // document title (first H1)
  section: string; // nearest heading above the chunk
  text: string;
}

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

interface Block {
  section: string;
  text: string;
}

function toBlocks(markdown: string): { title: string; blocks: Block[] } {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  let section = "";
  const blocks: Block[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ section, text });
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const label = heading[2].trim();
      if (heading[1].length === 1 && !title) title = label;
      section = label;
    } else if (line.trim() === "") {
      flush();
    } else {
      // Keep list items readable once lines are joined.
      buffer.push(line.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+\.\s+/, ""));
    }
  }
  flush();
  return { title, blocks };
}

export function chunkMarkdown(source: string, markdown: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? 700;
  const overlapChars = options.overlapChars ?? 120;
  const { title, blocks } = toBlocks(markdown);
  const chunks: Chunk[] = [];

  let current = "";
  let currentSection = "";

  const emit = () => {
    if (!current.trim()) return;
    chunks.push({
      id: `${source}#${chunks.length}`,
      source,
      title: title || source,
      section: currentSection,
      text: current.trim(),
    });
  };

  for (const block of blocks) {
    // A new section always starts a new chunk so citations point at one heading.
    if (block.section !== currentSection && current) {
      emit();
      current = "";
    }
    currentSection = block.section;

    const pieces = block.text.length > maxChars ? splitLong(block.text, maxChars) : [block.text];
    for (const piece of pieces) {
      if (current && current.length + piece.length + 1 > maxChars) {
        emit();
        const tail = current.slice(-overlapChars);
        const cut = tail.indexOf(" ");
        current = (cut >= 0 ? tail.slice(cut + 1) : tail) + " " + piece;
      } else {
        current = current ? `${current} ${piece}` : piece;
      }
    }
  }
  emit();
  return chunks;
}

function splitLong(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(". ", maxChars);
    if (cut < maxChars / 2) cut = rest.lastIndexOf(" ", maxChars);
    if (cut <= 0) cut = maxChars;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1);
  }
  if (rest.trim()) out.push(rest.trim());
  return out;
}
