import { describe, expect, it } from 'vitest';
import { DEFAULT_E2E_PORT, e2ePort } from './e2e-port.ts';

describe('e2ePort', () => {
  it('uses the default port when E2E_PORT is not set', () => {
    expect(e2ePort(undefined)).toBe(DEFAULT_E2E_PORT);
    expect(DEFAULT_E2E_PORT).toBe(3000);
  });

  it('uses the default port when E2E_PORT is empty', () => {
    expect(e2ePort('')).toBe(DEFAULT_E2E_PORT);
  });

  it('uses E2E_PORT when it is set', () => {
    expect(e2ePort('3280')).toBe(3280);
  });

  it('accepts the lowest and highest allowed ports', () => {
    expect(e2ePort('1024')).toBe(1024);
    expect(e2ePort('65535')).toBe(65535);
  });

  it.each(['abc', '3000.5', '-3000', '3e3', ' 3000', '0x0bb8', '1023', '65536', '80'])(
    'fails with a clear message for E2E_PORT=%s',
    (badPort) => {
      expect(() => e2ePort(badPort)).toThrow(
        `E2E_PORT must be a whole number from 1024 to 65535, but it is "${badPort}".`,
      );
    },
  );
});
