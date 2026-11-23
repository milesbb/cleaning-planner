import { afterEach, describe, expect, it } from 'vitest';
import { chooseCurrentHome, rememberCurrentHome, rememberedHomeId } from './current-home';

const HOMES = [
  { id: 'home-1', name: 'Our flat' },
  { id: 'home-2', name: 'Mum’s house' },
];

afterEach(() => {
  window.localStorage.clear();
});

describe('the current home', () => {
  it('is the one this device last looked at', () => {
    expect(chooseCurrentHome(HOMES, 'home-2')?.name).toBe('Mum’s house');
  });

  it('is the first home when none is remembered, or the remembered one was left', () => {
    expect(chooseCurrentHome(HOMES, null)?.id).toBe('home-1');
    expect(chooseCurrentHome(HOMES, 'home-gone')?.id).toBe('home-1');
  });

  it('is nothing for someone without a home', () => {
    expect(chooseCurrentHome([], 'home-1')).toBeNull();
  });

  it('is remembered on this device', () => {
    rememberCurrentHome('home-2');
    expect(rememberedHomeId()).toBe('home-2');
    expect(window.localStorage.length).toBe(1);
  });
});
