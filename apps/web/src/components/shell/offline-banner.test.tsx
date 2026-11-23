import { onlineManager } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { OfflineBanner } from './offline-banner';

afterEach(() => {
  act(() => {
    onlineManager.setOnline(true);
  });
});

describe('OfflineBanner', () => {
  it('has no accessibility violations', async () => {
    onlineManager.setOnline(false);
    const { container } = render(<OfflineBanner />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says calmly that the app is offline and showing what this device saved', () => {
    onlineManager.setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'You’re offline. This is what was saved on this device.',
    );
  });

  it('shows nothing while online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('appears and goes as the connection drops and returns', () => {
    render(<OfflineBanner />);
    act(() => {
      onlineManager.setOnline(false);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      onlineManager.setOnline(true);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
