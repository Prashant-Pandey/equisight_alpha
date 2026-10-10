/**
 * Yahoo Finance session cookie and crumb management with in-memory caching.
 */

import { fetchWithRetry } from '../../utils/httpClient.js';

let cachedYahooAuth: { cookie: string; crumb: string; timestamp: number } | null = null;

export async function getYahooAuth(): Promise<{ cookie: string; crumb: string } | null> {
  const now = Date.now();
  if (cachedYahooAuth && (now - cachedYahooAuth.timestamp < 1000 * 60 * 45)) {
    return cachedYahooAuth;
  }

  try {
    const cookieRes = await fetchWithRetry('https://fc.yahoo.com', {
      timeoutMs: 4000,
      retries: 1,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }).catch(() => null);

    const rawCookie = cookieRes?.headers.get('set-cookie');
    const cookie = rawCookie ? rawCookie.split(';')[0] : '';
    if (!cookie) return null;

    const crumbRes = await fetchWithRetry('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      timeoutMs: 4000,
      retries: 1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': cookie
      }
    });

    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.includes('html') || crumb.includes('Error')) return null;

    cachedYahooAuth = { cookie, crumb, timestamp: now };
    return cachedYahooAuth;
  } catch {
    return null;
  }
}
