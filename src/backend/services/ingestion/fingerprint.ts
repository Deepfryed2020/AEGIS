import crypto from 'crypto';

export function fingerprintContent(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}
