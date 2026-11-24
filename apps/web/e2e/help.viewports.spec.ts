import { logInToHome } from './support/fake-home';
import { testAtEveryViewport } from './support/viewport-matrix';

testAtEveryViewport('Help', '/help', { prepare: logInToHome, readyText: 'Share your home' });
