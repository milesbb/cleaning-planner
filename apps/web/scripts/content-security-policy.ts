import { createHash } from 'node:crypto';

const COGNITO_ORIGIN = 'https://cognito-idp.ap-southeast-2.amazonaws.com';
const INLINE_SCRIPT_PATTERN = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const EXISTING_POLICY_PATTERN = /<meta http-equiv="Content-Security-Policy" content="[^"]*"\/>/;
const HEAD_OPENING_TAG = '<head>';

export interface PolicyOptions {
  scriptHashes: readonly string[];
  apiOrigin: string | undefined;
}

function hashOf(scriptText: string): string {
  return `'sha256-${createHash('sha256').update(scriptText).digest('base64')}'`;
}

export function inlineScriptHashes(html: string): string[] {
  return [...html.matchAll(INLINE_SCRIPT_PATTERN)].map((match) => hashOf(match[1] ?? ''));
}

function validatedApiOrigin(apiOrigin: string | undefined): string[] {
  if (apiOrigin === undefined || apiOrigin === '') return [];
  const url = URL.canParse(apiOrigin) ? new URL(apiOrigin) : undefined;
  if (url?.protocol !== 'https:') throw new Error('The API address must be an https URL');
  return [url.origin];
}

export function buildContentSecurityPolicy({ scriptHashes, apiOrigin }: PolicyOptions): string {
  const connectSources = ["'self'", ...validatedApiOrigin(apiOrigin), COGNITO_ORIGIN];
  return (
    [
      "default-src 'self'",
      `script-src 'self' ${scriptHashes.join(' ')}`.trimEnd(),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src ${connectSources.join(' ')}`,
      "manifest-src 'self'",
      "worker-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ') + ';'
  );
}

export function addContentSecurityPolicy(html: string, apiOrigin: string | undefined): string {
  const withoutOldPolicy = html.replace(EXISTING_POLICY_PATTERN, '');
  if (!withoutOldPolicy.includes(HEAD_OPENING_TAG)) throw new Error('Page has no <head>');
  const policy = buildContentSecurityPolicy({
    scriptHashes: inlineScriptHashes(withoutOldPolicy),
    apiOrigin,
  });
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}"/>`;
  return withoutOldPolicy.replace(HEAD_OPENING_TAG, `${HEAD_OPENING_TAG}${meta}`);
}
