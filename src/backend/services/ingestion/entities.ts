export function extractEntities(content: string) {
  return Array.from(new Set((content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).slice(0, 20)));
}
