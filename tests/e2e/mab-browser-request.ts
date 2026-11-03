import type {Page} from '@playwright/test';

// Use the browser's cookie policy for the production Secure session cookie.
// APIRequestContext treats plain loopback HTTP differently from Chromium.
export async function browserRequests(page: Page) {
  await page.goto('/');
  async function send(method: string, url: string, options?: {data?: unknown; params?: Record<string, string>}) {
    const result = await page.evaluate(async ({method, url, options}) => {
      const target = new URL(url, location.origin);
      for (const [key, value] of Object.entries(options?.params ?? {})) target.searchParams.set(key, value);
      const response = await fetch(target, {
        method, credentials: 'same-origin',
        headers: options?.data === undefined ? {} : {'content-type': 'application/json'},
        body: options?.data === undefined ? undefined : JSON.stringify(options.data),
      });
      return {status: response.status, body: await response.json()};
    }, {method, url, options});
    return {status: () => result.status, json: async () => result.body};
  }
  return {
    get: (url: string, options?: {params?: Record<string, string>}) => send('GET', url, options),
    post: (url: string, options?: {data?: unknown}) => send('POST', url, options),
  };
}
