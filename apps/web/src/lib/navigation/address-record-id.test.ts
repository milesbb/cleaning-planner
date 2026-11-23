import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { changeAddressRecordId, useAddressRecordId } from './address-record-id';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useAddressRecordId', () => {
  it('reads a record id from the address', () => {
    window.history.replaceState(null, '', '/today?job=job-oven');
    expect(renderHook(() => useAddressRecordId('job')).result.current).toBe('job-oven');
  });

  it('is null when the id is missing or malformed', () => {
    window.history.replaceState(null, '', '/today?job=not%20an%20id');
    expect(renderHook(() => useAddressRecordId('job')).result.current).toBeNull();
    window.history.replaceState(null, '', '/today');
    expect(renderHook(() => useAddressRecordId('job')).result.current).toBeNull();
  });

  it('follows changes made here and with Back and Forward', () => {
    window.history.replaceState(null, '', '/today');
    const { result } = renderHook(() => useAddressRecordId('job'));
    act(() => {
      changeAddressRecordId('job', 'job-oven', 'push');
    });
    expect(result.current).toBe('job-oven');
    act(() => {
      window.history.replaceState(null, '', '/today');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current).toBeNull();
  });
});

describe('changeAddressRecordId', () => {
  it('keeps the rest of the address', () => {
    window.history.replaceState(null, '', '/room?id=room-1');
    changeAddressRecordId('job', 'job-oven', 'push');
    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/room?id=room-1&job=job-oven',
    );
    changeAddressRecordId('job', null, 'replace');
    expect(`${window.location.pathname}${window.location.search}`).toBe('/room?id=room-1');
  });

  it('adds a history entry only when pushing', () => {
    window.history.replaceState(null, '', '/today');
    const entries = window.history.length;
    changeAddressRecordId('job', 'job-oven', 'push');
    expect(window.history.length).toBe(entries + 1);
    changeAddressRecordId('job', 'job-hob', 'replace');
    expect(window.history.length).toBe(entries + 1);
  });
});
