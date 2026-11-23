import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HOME_SETUP } from './home-setup';
import { forgetHomeSetup, useHomeSetup } from './home-setup-draft';

const STORAGE_KEY = 'cleaning-planner.home-setup';

afterEach(() => {
  vi.restoreAllMocks();
  forgetHomeSetup();
});

describe('the home being set up', () => {
  it('starts from the defaults', () => {
    const { result } = renderHook(() => useHomeSetup());
    expect(result.current.setup).toEqual(DEFAULT_HOME_SETUP);
  });

  it('keeps each change across the setup screens, so going back keeps what you picked', () => {
    const first = renderHook(() => useHomeSetup());
    act(() => {
      first.result.current.change({ homeName: 'Our flat' });
    });
    act(() => {
      first.result.current.change({ features: ['dishwasher'] });
    });
    first.unmount();
    const next = renderHook(() => useHomeSetup());
    expect(next.result.current.setup).toMatchObject({
      homeName: 'Our flat',
      features: ['dishwasher'],
    });
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toContain('Our flat');
  });

  it('comes back after a reload in the same tab', () => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_HOME_SETUP, homeName: 'Saved earlier' }),
    );
    const { result } = renderHook(() => useHomeSetup());
    expect(result.current.setup.homeName).toBe('Saved earlier');
  });

  it('ignores a saved draft it does not recognise', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '{"homeName": 7}');
    const { result } = renderHook(() => useHomeSetup());
    expect(result.current.setup).toEqual(DEFAULT_HOME_SETUP);
  });

  it('still works in this tab when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const { result } = renderHook(() => useHomeSetup());
    act(() => {
      result.current.change({ homeName: 'Our flat' });
    });
    expect(result.current.setup.homeName).toBe('Our flat');
  });

  it('starts again from the defaults once forgotten', () => {
    const { result } = renderHook(() => useHomeSetup());
    act(() => {
      result.current.change({ homeName: 'Our flat' });
    });
    act(() => {
      forgetHomeSetup();
    });
    expect(result.current.setup).toEqual(DEFAULT_HOME_SETUP);
  });
});
