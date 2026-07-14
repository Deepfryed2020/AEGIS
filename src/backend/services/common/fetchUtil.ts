import fetch from 'node-fetch';

const MAX_RETRIES = 3;

export async function fetchWithRetries(url: string) {
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      const buffer = Buffer.from(await response.arrayBuffer());
      return { buffer, contentType };
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error('Failed to fetch URL');
}
