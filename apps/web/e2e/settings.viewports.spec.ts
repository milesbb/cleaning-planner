import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Settings', '/settings', { prepare: logInToHome, readyText: 'Sign out' });
