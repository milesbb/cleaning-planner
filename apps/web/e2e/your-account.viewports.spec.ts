import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Your account', '/settings/account', {
  prepare: logInToHome,
  readyText: 'Your homes',
});
