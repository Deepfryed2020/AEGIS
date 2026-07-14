export function chunkText(content: string, size = 800) {
  const chunks: Array<{ text: string; chunkIndex: number }> = [];
  const words = content.split(/\s+/).filter(Boolean);
  for (let index = 0; index < words.length; index += size) {
    chunks.push({ text: words.slice(index, index + size).join(' '), chunkIndex: chunks.length });
  }
  return chunks.length ? chunks : [{ text: content.slice(0, 200), chunkIndex: 0 }];
}
