import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listenForInstallPrompt, useInstallPrompt } from './install-prompt';

type Outcome = 'accepted' | 'dismissed';

function installPromptEvent(outcome: Outcome): Event {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  });
}

let stopListening: () => void = () => undefined;

afterEach(() => {
  stopListening();
  window.dispatchEvent(new Event('appinstalled'));
});

describe('install prompt', () => {
  it('cannot install until the browser offers it', () => {
    stopListening = listenForInstallPrompt(window);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canPrompt).toBe(false);
  });

  it('keeps the browser’s offer for later, instead of its own banner', () => {
    stopListening = listenForInstallPrompt(window);
    const { result } = renderHook(() => useInstallPrompt());
    const offer = installPromptEvent('accepted');
    act(() => {
      window.dispatchEvent(offer);
    });
    expect(offer.defaultPrevented).toBe(true);
    expect(result.current.canPrompt).toBe(true);
  });

  it('asks once, and forgets the offer when it is accepted', async () => {
    stopListening = listenForInstallPrompt(window);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(installPromptEvent('accepted'));
    });
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.install();
    });
    expect(outcome).toBe(true);
    expect(result.current.canPrompt).toBe(false);
  });

  it('can only be asked once, even when dismissed', async () => {
    stopListening = listenForInstallPrompt(window);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(installPromptEvent('dismissed'));
    });
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.install();
    });
    expect(outcome).toBe(false);
    expect(result.current.canPrompt).toBe(false);
  });

  it('forgets the offer once the app is installed some other way', () => {
    stopListening = listenForInstallPrompt(window);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(installPromptEvent('accepted'));
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.canPrompt).toBe(false);
  });

  it('ignores an event that is not a real offer', () => {
    stopListening = listenForInstallPrompt(window);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    expect(result.current.canPrompt).toBe(false);
  });

  it('answers no when there is nothing to ask', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    await expect(result.current.install()).resolves.toBe(false);
  });
});
