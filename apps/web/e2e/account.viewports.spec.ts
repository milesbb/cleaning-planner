import { testAtEveryViewport } from './support/viewport-matrix';

testAtEveryViewport('Welcome', '/welcome');
testAtEveryViewport('Create account', '/sign-up');
testAtEveryViewport('Check your email', '/verify');
testAtEveryViewport('Log in', '/sign-in');
testAtEveryViewport('Forgot password', '/forgot-password');
testAtEveryViewport('Set a new password', '/forgot-password/reset');
