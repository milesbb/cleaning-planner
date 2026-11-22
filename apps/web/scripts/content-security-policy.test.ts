import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  addContentSecurityPolicy,
  buildContentSecurityPolicy,
  inlineScriptHashes,
} from './content-security-policy.ts';

function sha256(text: string): string {
  return `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
}

const page = `<!DOCTYPE html><html lang="en-GB"><head><meta charSet="utf-8"/><script src="/_next/a.js" async=""></script><script id="_R_">window.first = 1;</script></head><body><script>self.__next_f.push([0])</script></body></html>`;

describe('inlineScriptHashes', () => {
  it('hashes every inline script and ignores external ones', () => {
    expect(inlineScriptHashes(page)).toEqual([
      sha256('window.first = 1;'),
      sha256('self.__next_f.push([0])'),
    ]);
  });

  it('returns nothing for a page without inline scripts', () => {
    expect(inlineScriptHashes('<html><head></head><body></body></html>')).toEqual([]);
  });
});

describe('buildContentSecurityPolicy', () => {
  const policy = buildContentSecurityPolicy({
    scriptHashes: ["'sha256-abc'"],
    apiOrigin: 'https://api.example.com',
  });

  it('only allows our own files and the listed inline scripts to run', () => {
    expect(policy).toContain("script-src 'self' 'sha256-abc'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('only allows connections to ourselves, the API and Cognito', () => {
    expect(policy).toContain(
      "connect-src 'self' https://api.example.com https://cognito-idp.ap-southeast-2.amazonaws.com",
    );
  });

  it.each([
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ])('includes %s', (directive) => {
    expect(policy).toContain(directive);
  });

  it('leaves out the API when there is none configured', () => {
    expect(buildContentSecurityPolicy({ scriptHashes: [], apiOrigin: undefined })).toContain(
      "connect-src 'self' https://cognito-idp.ap-southeast-2.amazonaws.com;",
    );
  });

  it('rejects an API address that is not an https origin', () => {
    expect(() =>
      buildContentSecurityPolicy({ scriptHashes: [], apiOrigin: 'javascript:alert(1)' }),
    ).toThrow('The API address must be an https URL');
  });
});

describe('addContentSecurityPolicy', () => {
  const updated = addContentSecurityPolicy(page, 'https://api.example.com');

  it('puts the policy first in <head>, before any script', () => {
    const metaPosition = updated.indexOf('http-equiv="Content-Security-Policy"');
    expect(metaPosition).toBeGreaterThan(updated.indexOf('<head>'));
    expect(updated.slice(0, metaPosition)).not.toContain('script');
  });

  it("allows exactly the page's own inline scripts", () => {
    expect(updated).toContain(sha256('window.first = 1;'));
    expect(updated).toContain(sha256('self.__next_f.push([0])'));
  });

  it('replaces an existing policy instead of adding a second one', () => {
    const twice = addContentSecurityPolicy(updated, 'https://api.example.com');
    expect(twice.match(/Content-Security-Policy/g)).toHaveLength(1);
  });

  it('refuses a page without a <head>', () => {
    expect(() => addContentSecurityPolicy('<html><body></body></html>', undefined)).toThrow(
      'Page has no <head>',
    );
  });
});
