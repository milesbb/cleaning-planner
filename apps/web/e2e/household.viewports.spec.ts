import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Start or join a home', '/homes/new');
testAtEveryViewport('Accept an invite', '/join?code=7K3M9QZA');
testAtEveryViewport('Setup: rooms', '/setup/rooms');
testAtEveryViewport('Setup: appliances', '/setup/appliances');
testAtEveryViewport('Setup: reminders', '/setup/reminders');
testAtEveryViewport('Today', '/today', { prepare: logInToHome, readyText: 'Clean the oven' });
testAtEveryViewport('This week', '/week', { prepare: logInToHome, readyText: 'Nothing planned' });
