import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const typeSafetyRules = {
  '@typescript-eslint/explicit-function-return-type': 'error',
  '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
  '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
};

const readabilityRules = {
  'id-length': ['error', { min: 2, properties: 'never', exceptions: ['_'] }],
  'max-params': ['error', 4],
  'max-depth': ['error', 3],
  complexity: ['error', 10],
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
  'no-inline-comments': 'error',
  'no-nested-ternary': 'error',
  'no-console': 'error',
};

export const strictRules = { ...typeSafetyRules, ...readabilityRules };

export const testFileOverrides = {
  files: ['**/*.test.ts', '**/*.test.tsx', '**/e2e/**/*.ts'],
  rules: { 'max-lines-per-function': 'off' },
};

export function typeCheckedLanguageOptions(tsconfigRootDir) {
  return { parserOptions: { projectService: true, tsconfigRootDir } };
}

export function nodeWorkspaceConfig({ rootDir, ignores }) {
  return tseslint.config(
    { ignores },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    { languageOptions: typeCheckedLanguageOptions(rootDir), rules: strictRules },
    testFileOverrides,
    { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },
  );
}
