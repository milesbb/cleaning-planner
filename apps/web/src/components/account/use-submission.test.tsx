import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AccountAuthError } from '@/lib/auth/account-auth';
import { useSubmission } from './use-submission';

describe('useSubmission', () => {
  it('is busy while the action runs and only runs one at a time', async () => {
    let finish: () => void = () => undefined;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => useSubmission());
    act(() => {
      result.current.run(action, vi.fn());
      result.current.run(action, vi.fn());
    });
    expect(result.current.isSubmitting).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
      await Promise.resolve();
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('hands account errors to the form', async () => {
    const onFailure = vi.fn();
    const { result } = renderHook(() => useSubmission());
    await act(async () => {
      result.current.run(() => Promise.reject(new AccountAuthError('wrongCode')), onFailure);
      await Promise.resolve();
    });
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ kind: 'wrongCode' }));
  });

  it('shows a general alert for anything else', async () => {
    const { result } = renderHook(() => useSubmission());
    await act(async () => {
      result.current.run(() => Promise.reject(new Error('boom')), vi.fn());
      await Promise.resolve();
    });
    expect(result.current.alert).toBe('Something went wrong. Try again.');
  });

  it('lets the form show and clear its own alert', () => {
    const { result } = renderHook(() => useSubmission());
    act(() => {
      result.current.showAlert('Too many tries for now.');
    });
    expect(result.current.alert).toBe('Too many tries for now.');
    act(() => {
      result.current.run(() => new Promise(() => undefined), vi.fn());
    });
    expect(result.current.alert).toBeNull();
  });
});
