import { Sql } from '../../db.js';

export async function indexChunks(documentId: string, chunks: Array<{ text: string; chunkIndex: number }>) {
  for (const chunk of chunks) {
    await Sql.run(`INSERT INTO document_chunks (id, evidenceId, chunkIndex, chunkHash, snippet, createdAt) VALUES (?, ?, ?, ?, ?, ?)`, [
      `${documentId}-${chunk.chunkIndex}`,
      documentId,
      chunk.chunkIndex,
      `${documentId}-${chunk.chunkIndex}`,
      chunk.text.slice(0, 200),
      new Date().toISOString(),
    ]);
  }
}
