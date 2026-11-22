import { nodeWorkspaceConfig } from '../../eslint.shared.mjs';

export default nodeWorkspaceConfig({
  rootDir: import.meta.dirname,
  ignores: ['coverage/**', 'dist/**', 'reports/**', '.stryker-tmp/**'],
});
