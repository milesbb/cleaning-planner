// Fake addresses built into the e2e build (playwright.config.ts for local runs,
// .github/workflows/release-checks.yml for CI). Every request to them is
// answered by the mocks in this folder; nothing reaches AWS.
export const E2E_ENVIRONMENT = {
  NEXT_PUBLIC_API_URL: 'https://api.example.test',
  NEXT_PUBLIC_USER_POOL_ID: 'ap-southeast-2_e2eTestPool',
  NEXT_PUBLIC_USER_POOL_CLIENT_ID: 'e2etestclient',
} as const;

export const COGNITO_URL = 'https://cognito-idp.ap-southeast-2.amazonaws.com/';
