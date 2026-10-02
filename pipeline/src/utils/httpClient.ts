import { CONFIG } from '../config.js';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
}

export async function fetchWithRetry(url: string, options: RequestOptions = {}): Promise<Response> {
  const {
    timeoutMs = CONFIG.API_TIMEOUT_MS,
    retries = CONFIG.API_RETRY_ATTEMPTS,
    baseDelayMs = CONFIG.API_RETRY_BASE_DELAY_MS,
    ...fetchOptions
  } = options;

  let attempt = 0;

  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (EquiSight Financial Pipeline)',
          'Accept': 'application/json, text/plain, */*',
          ...fetchOptions.headers,
        }
      });

      clearTimeout(timeout);

      // Success
      if (response.ok) {
        return response;
      }

      // Check for Rate Limit (429)
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        let delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;

        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsed)) {
            delayMs = parsed * 1000;
          }
        }

        console.warn(`[HTTP] Rate limited (429) on ${url}. Retrying attempt ${attempt}/${retries} in ${Math.round(delayMs)}ms...`);
        if (attempt <= retries) {
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }
      }

      // Server error retry (500, 502, 503, 504)
      if (response.status >= 500 && attempt <= retries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[HTTP] Server error (${response.status}) on ${url}. Retrying attempt ${attempt}/${retries} in ${Math.round(delayMs)}ms...`);
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }

      // If client error other than 429 (e.g. 404, 403), return response so caller can handle
      return response;
    } catch (err: any) {
      clearTimeout(timeout);
      const isAbort = err.name === 'AbortError';
      console.warn(`[HTTP] ${isAbort ? 'Timeout' : 'Network error'} on ${url}: ${err.message}. Attempt ${attempt}/${retries}`);

      if (attempt <= retries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        throw new Error(`[HTTP] Failed after ${retries} attempts: ${err.message} (${url})`);
      }
    }
  }

  throw new Error(`[HTTP] Exceeded maximum retries for ${url}`);
}
