import { testAtEveryViewport } from './support/viewport-matrix';

testAtEveryViewport('Forgot password', '/forgot-password');
testAtEveryViewport('Set a new password', '/forgot-password/reset');
