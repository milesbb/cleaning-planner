import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Add a job', '/room/add?id=room-kitchen', {
  prepare: logInToHome,
  readyText: 'Make your own job',
});
