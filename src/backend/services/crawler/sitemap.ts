import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

export async function fetchSitemap(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return [];
    const xml = await response.text();
    const document = await parseStringPromise(xml);
    const urls = document.urlset?.url?.map((entry: any) => entry.loc?.[0]).filter(Boolean) || [];
    return urls;
  } catch {
    return [];
  }
}
