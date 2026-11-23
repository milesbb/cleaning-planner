import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Today', '/today', { prepare: logInToHome, readyText: 'Clean the oven' });
