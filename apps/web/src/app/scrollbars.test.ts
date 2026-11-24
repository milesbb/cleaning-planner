import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalStyles = readFileSync(resolve('src/app/globals.css'), 'utf8');

function ruleFor(selector: string): string {
  const start = globalStyles.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} rule in globals.css`);
  return globalStyles.slice(start, globalStyles.indexOf('}', start));
}

describe('scrollbars', () => {
  it('draw the thumb as a yellow pill with the same ink border as every card', () => {
    const thumb = ruleFor('::-webkit-scrollbar-thumb');
    expect(thumb).toContain('background-color: var(--kitchen)');
    expect(thumb).toContain('border: 2px solid var(--ink)');
    expect(thumb).toContain('border-radius: 999px');
  });

  it('leave the track clear so the paper shows through', () => {
    expect(ruleFor('::-webkit-scrollbar-track')).toContain('background: transparent');
  });

  it('give browsers without those pseudo-elements the same colours', () => {
    expect(globalStyles).toContain('@supports not selector(::-webkit-scrollbar)');
    expect(globalStyles).toContain('scrollbar-color: var(--kitchen) transparent');
  });
});
