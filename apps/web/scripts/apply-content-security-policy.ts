import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addContentSecurityPolicy } from './content-security-policy.ts';

const EXPORT_FOLDER = 'out';

function htmlFilesIn(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.html'))
    .map((path) => join(folder, path));
}

const apiOrigin = process.env.NEXT_PUBLIC_API_URL;
const pages = htmlFilesIn(EXPORT_FOLDER);
for (const pagePath of pages) {
  writeFileSync(pagePath, addContentSecurityPolicy(readFileSync(pagePath, 'utf8'), apiOrigin));
}
process.stdout.write(`Content-Security-Policy added to ${String(pages.length)} pages\n`);
