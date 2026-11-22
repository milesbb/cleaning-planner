import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';
import {
  strictRules,
  testFileOverrides,
  typeCheckedLanguageOptions,
} from '../../eslint.shared.mjs';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      '.lighthouseci/**',
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: typeCheckedLanguageOptions(import.meta.dirname),
    rules: strictRules,
  },
  testFileOverrides,
);
