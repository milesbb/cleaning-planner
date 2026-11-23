import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Change email', '/settings/account/email', {
  prepare: logInToHome,
  readyText: 'New email',
});
