import type {Page} from '@playwright/test';

type Multipart = Record<string, string | {name: string; mimeType: string; buffer: Uint8Array}>;
type Options = {data?: unknown; params?: Record<string, string>; multipart?: Multipart};

// Exercise Chromium's production Secure Cookie policy, including real multipart
// and byte downloads. APIRequestContext handles HTTP loopback differently.
export async function browserRequests(page: Page) {
  await page.goto('/');
  async function send(method: string, url: string, options?: Options) {
    const multipart = options?.multipart && Object.entries(options.multipart).map(([key, value]) =>
      [key, typeof value === 'string' ? value : {name:value.name,mimeType:value.mimeType,bytes:Array.from(value.buffer)}] as const);
    const result = await page.evaluate(async ({method, url, data, params, multipart}) => {
      const target = new URL(url, location.origin);
      for (const [key, value] of Object.entries(params ?? {})) target.searchParams.set(key, value);
      let body: BodyInit | undefined;
      if (multipart) {
        const form = new FormData();
        for (const [key, value] of multipart) {
          if (typeof value === 'string') form.set(key, value);
          else form.set(key, new Blob([new Uint8Array(value.bytes)], {type:value.mimeType}), value.name);
        }
        body = form;
      } else if (data !== undefined) body = JSON.stringify(data);
      const response = await fetch(target, {
        method, credentials:'same-origin', body,
        headers: data === undefined || multipart ? {} : {'content-type':'application/json'},
      });
      return {status:response.status,bytes:Array.from(new Uint8Array(await response.arrayBuffer())),
        headers:Object.fromEntries(response.headers.entries())};
    }, {method,url,data:options?.data,params:options?.params,multipart});
    return {
      status: () => result.status,
      json: async () => JSON.parse(Buffer.from(result.bytes).toString('utf8')),
      body: async () => Buffer.from(result.bytes),
      headers: () => result.headers,
    };
  }
  return {
    get: (url: string, options?: {params?: Record<string, string>}) => send('GET',url,options),
    post: (url: string, options?: Options) => send('POST',url,options),
  };
}
