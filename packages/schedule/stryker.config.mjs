const config = {
  testRunner: 'vitest',
  mutate: ['src/**/*.ts', '!src/**/*.test.ts'],
  reporters: ['clear-text', 'progress', 'html'],
  coverageAnalysis: 'perTest',
  thresholds: { high: 90, low: 85, break: 85 },
  tempDirName: '.stryker-tmp',
  htmlReporter: { fileName: 'reports/mutation/index.html' },
};

export default config;
