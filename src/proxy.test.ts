import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import { proxy } from './proxy';

it('serves / in the negotiated locale without a redirect', () => {
  const request = new NextRequest('http://192.168.1.50:5173/', {
    headers: { host: '192.168.1.50:5173', 'accept-language': 'ar' },
  });
  const response = proxy(request);

  expect(response.status).toBe(200);
  expect(response.headers.get('location')).toBeNull();
  expect(response.headers.get('x-middleware-rewrite')).toBe('http://192.168.1.50:5173/ar');
});

it('lets a language cookie choose the rewritten locale', () => {
  const request = new NextRequest('http://192.168.1.50:5173/', {
    headers: { host: '192.168.1.50:5173', cookie: 'nxc-language=en', 'accept-language': 'ar' },
  });
  const response = proxy(request);

  expect(response.headers.get('x-middleware-rewrite')).toBe('http://192.168.1.50:5173/en');
});
