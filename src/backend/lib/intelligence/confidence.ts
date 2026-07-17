export function calculateConfidence(factors: { sourceTrust: number; mentionCount: number; relationshipCount: number; contentLength: number }): number {
  const mentionFactor = Math.min(1, factors.mentionCount / 5);
  const relationshipFactor = Math.min(1, factors.relationshipCount / 10);
  const lengthFactor = Math.min(1, factors.contentLength / 5000);
  const combined = factors.sourceTrust * 0.5 + mentionFactor * 0.2 + relationshipFactor * 0.15 + lengthFactor * 0.15;
  return Math.round(combined * 100) / 100;
}
