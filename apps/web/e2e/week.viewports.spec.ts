import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('This week', '/week', { prepare: logInToHome, readyText: 'Nothing planned' });
