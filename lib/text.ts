// Text normalisation shared by indexing and querying.
// Both sides must tokenize identically, so every rule lives here.

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can could did do does for from had has have how i if in into is it its " +
    "me my of on or our so than that the their them then there these they this to was we were what when where " +
    "which who why will with would you your about any all also am just more most not no only other some such " +
    "should may might must up out over very each own same too s t"
  ).split(" "),
);

// A light suffix stripper (not a full Porter stemmer). It folds the common
// inflections so "policies", "policy" and "booking", "booked" meet.
export function stem(word: string): string {
  if (word.length <= 3) return word;
  const rules: [RegExp, string][] = [
    [/ies$/, "y"],
    [/(ss)es$/, "$1"],
    [/([^s])s$/, "$1"],
    [/eed$/, "ee"],
    [/(..)ing$/, "$1"],
    [/(..)ed$/, "$1"],
    [/(..)ly$/, "$1"],
  ];
  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) return word.replace(pattern, replacement);
  }
  return word;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
