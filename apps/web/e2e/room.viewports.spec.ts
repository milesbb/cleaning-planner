import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Room', '/room?id=room-kitchen', {
  prepare: logInToHome,
  readyText: 'Clean the oven',
});
