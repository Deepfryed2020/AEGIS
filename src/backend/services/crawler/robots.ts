import fetch from 'node-fetch';

const robotsCache = new Map<string, string>();

export async function fetchRobotsTxt(baseUrl: string): Promise<string | null> {
  if (robotsCache.has(baseUrl)) return robotsCache.get(baseUrl) || null;
  try {
    const url = new URL('/robots.txt', baseUrl).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const text = await response.text();
    robotsCache.set(baseUrl, text);
    return text;
  } catch {
    return null;
  }
}

export function isAllowedByRobots(baseUrl: string, path: string, robotsText: string | null): boolean {
  if (!robotsText) return true;
  const rules = robotsText.split(/\r?\n/).map((line) => line.trim());
  let userAgentMatched = false;
  let allow = true;
  for (const rule of rules) {
    if (rule.toLowerCase().startsWith('user-agent:')) {
      userAgentMatched = rule.toLowerCase().includes('*');
      continue;
    }
    if (!userAgentMatched) continue;
    if (rule.toLowerCase().startsWith('disallow:')) {
      const pathRule = rule.split(':')[1]?.trim();
      if (pathRule && path.startsWith(pathRule)) allow = false;
    }
    if (rule.toLowerCase().startsWith('allow:')) {
      const pathRule = rule.split(':')[1]?.trim();
      if (pathRule && path.startsWith(pathRule)) allow = true;
    }
  }
  return allow;
}
