import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Change password', '/settings/account/password', {
  prepare: logInToHome,
  readyText: 'Current password',
});
