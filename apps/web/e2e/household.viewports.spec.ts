import { testAtEveryViewport } from './support/viewport-matrix';
import { logInToHome } from './support/fake-home';

testAtEveryViewport('Start or join a home', '/homes/new');
testAtEveryViewport('Accept an invite', '/join?code=7K3M9QZA');
testAtEveryViewport('Setup: rooms', '/setup/rooms');
testAtEveryViewport('Setup: appliances', '/setup/appliances');
testAtEveryViewport('Setup: reminders', '/setup/reminders');
testAtEveryViewport('Today', '/today', { prepare: logInToHome, readyText: 'Clean the oven' });
testAtEveryViewport('This week', '/week', { prepare: logInToHome, readyText: 'Nothing planned' });
testAtEveryViewport('Home', '/home', { prepare: logInToHome, readyText: 'Living room' });
testAtEveryViewport('Room', '/room?id=room-kitchen', {
  prepare: logInToHome,
  readyText: 'Clean the oven',
});
testAtEveryViewport('Job detail', '/job?id=job-oven', {
  prepare: logInToHome,
  readyText: 'How to do it',
});
testAtEveryViewport('Settings', '/settings', { prepare: logInToHome, readyText: 'Sign out' });
testAtEveryViewport('Home settings', '/settings/home', {
  prepare: logInToHome,
  readyText: 'Get an invite code',
});
testAtEveryViewport('Home settings for the owner', '/settings/home', {
  prepare: (page) => logInToHome(page, { isOwner: true }),
  readyText: 'Change home details',
});
testAtEveryViewport('Change password', '/settings/account/password', {
  prepare: logInToHome,
  readyText: 'Current password',
});
testAtEveryViewport('Add a job', '/room/add?id=room-kitchen', {
  prepare: logInToHome,
  readyText: 'Make your own job',
});
