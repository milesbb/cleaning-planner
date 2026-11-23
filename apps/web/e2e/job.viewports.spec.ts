import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Job detail', '/job?id=job-oven', {
  prepare: logInToHome,
  readyText: 'How to do it',
});
