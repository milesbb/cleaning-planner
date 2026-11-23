import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Home', '/home', { prepare: logInToHome, readyText: 'Living room' });
