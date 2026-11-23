import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Delete account', '/settings/account/delete', {
  prepare: (page) => logInToHome(page, { isOwner: true }),
  readyText: 'Your password',
});
