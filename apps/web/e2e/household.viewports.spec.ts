import { testAtEveryViewport } from './support/viewport-matrix';

testAtEveryViewport('Start or join a home', '/homes/new');
testAtEveryViewport('Accept an invite', '/join?code=7K3M9QZA');
