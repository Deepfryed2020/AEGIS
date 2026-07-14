import fetch from 'node-fetch';

export async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    const text = await response.text();
    return { text, contentType: response.headers.get('content-type') || '' };
  } finally {
    clearTimeout(timeout);
  }
}
