import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Home settings', '/settings/home', {
  prepare: logInToHome,
  readyText: 'Get an invite code',
});
testAtEveryViewport('Home settings for the owner', '/settings/home', {
  prepare: (page) => logInToHome(page, { isOwner: true }),
  readyText: 'Change home details',
});
