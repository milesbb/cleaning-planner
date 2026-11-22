import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

function isHeaderRules(value: unknown): value is { headers: HeaderRule[] } {
  return typeof value === 'object' && value !== null && 'headers' in value;
}

const configuration: unknown = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8'));
if (!isHeaderRules(configuration)) throw new Error('vercel.json has no headers');
const everyPage = configuration.headers.find((rule) => rule.source === '/(.*)');
const headers = new Map(everyPage?.headers.map((header) => [header.key, header.value]));

describe('security headers on every page (vercel.json)', () => {
  it.each([
    ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['X-Frame-Options', 'DENY'],
    ['Content-Security-Policy', "frame-ancestors 'none'"],
    ['Cross-Origin-Opener-Policy', 'same-origin'],
  ])('sends %s: %s', (name, value) => {
    expect(headers.get(name)).toBe(value);
  });

  it('turns off browser features the app never uses', () => {
    const permissions = headers.get('Permissions-Policy') ?? '';
    ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()'].forEach((feature) => {
      expect(permissions).toContain(feature);
    });
  });
});
