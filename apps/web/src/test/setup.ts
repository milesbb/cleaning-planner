import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import type { AxeResults } from 'axe-core';
import { afterEach, expect } from 'vitest';

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

function describeViolations(results: AxeResults): string {
  return results.violations
    .map(
      (violation) => `${violation.id}: ${violation.help} (${String(violation.nodes.length)} nodes)`,
    )
    .join('\n');
}

expect.extend({
  toHaveNoViolations(results: AxeResults): MatcherResult {
    const pass = results.violations.length === 0;
    return {
      pass,
      message: (): string =>
        pass
          ? 'Expected accessibility violations, but found none'
          : `Expected no accessibility violations:\n${describeViolations(results)}`,
    };
  },
});

afterEach(() => {
  cleanup();
});

// jsdom has no ResizeObserver; Radix measures the hidden input it adds when a
// switch sits inside a form.
class NoopResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (!('ResizeObserver' in globalThis)) globalThis.ResizeObserver = NoopResizeObserver;
