import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listenForInstallPrompt, useInstallPrompt } from './install-prompt';
import { useInstallPromptCapture } from './use-install-prompt-capture';

function offerToInstall(): void {
  window.dispatchEvent(
    Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    }),
  );
}

afterEach(() => {
  const stopListening = listenForInstallPrompt(window);
  window.dispatchEvent(new Event('appinstalled'));
  stopListening();
});

describe('useInstallPromptCapture', () => {
  it('starts keeping the browser’s offer soon after the app starts', async () => {
    renderHook(() => {
      useInstallPromptCapture();
    });
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => {
      act(offerToInstall);
      expect(result.current.canPrompt).toBe(true);
    });
  });

  it('stops listening when the app goes', async () => {
    const capture = renderHook(() => {
      useInstallPromptCapture();
    });
    const { result } = renderHook(() => useInstallPrompt());
    await waitFor(() => {
      act(offerToInstall);
      expect(result.current.canPrompt).toBe(true);
    });
    capture.unmount();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.canPrompt).toBe(true);
  });

  it('never listens when the app has gone before the listener loads', async () => {
    const capture = renderHook(() => {
      useInstallPromptCapture();
    });
    capture.unmount();
    const { result } = renderHook(() => useInstallPrompt());
    await new Promise((resolve) => setTimeout(resolve, 0));
    act(offerToInstall);
    expect(result.current.canPrompt).toBe(false);
  });
});
