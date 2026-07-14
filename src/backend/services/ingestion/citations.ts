export function buildCitations(content: string, documentId: string) {
  const snippets = content.split(/\.|\n/).map((segment) => segment.trim()).filter(Boolean).slice(0, 3);
  return snippets.map((quote, index) => ({ documentId, quote, paragraph: index + 1, url: '', retrievedDate: new Date().toISOString() }));
}
