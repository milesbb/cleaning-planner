import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

// Today with a job open: beside the list on laptops, its own page on phones.
testAtEveryViewport('Today with a job open', '/today?job=job-oven', {
  prepare: logInToHome,
  readyText: 'How often',
});
