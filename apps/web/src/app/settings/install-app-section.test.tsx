import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { listenForInstallPrompt } from '@/lib/pwa/install-prompt';
import { InstallAppSection } from './install-app-section';

const DESKTOP_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1';

function browserIs(userAgent: string, maxTouchPoints = 0): void {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => maxTouchPoints,
  });
}

function displayModeIs(isStandalone: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: isStandalone && query === '(display-mode: standalone)',
      media: query,
    }),
  });
}

function offerToInstall(outcome: 'accepted' | 'dismissed'): ReturnType<typeof vi.fn> {
  const prompt = vi.fn(() => Promise.resolve());
  act(() => {
    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt,
        userChoice: Promise.resolve({ outcome }),
      }),
    );
  });
  return prompt;
}

let stopListening: () => void = () => undefined;

afterEach(() => {
  stopListening();
  window.dispatchEvent(new Event('appinstalled'));
  displayModeIs(false);
  vi.restoreAllMocks();
});

describe('InstallAppSection', () => {
  it('has no accessibility violations', async () => {
    browserIs(IPHONE_SAFARI, 5);
    const { container } = render(<InstallAppSection />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('walks iPhone through Share and Add to Home Screen', () => {
    browserIs(IPHONE_SAFARI, 5);
    render(<InstallAppSection />);
    const steps = screen.getAllByRole('listitem').map((step) => step.textContent);
    expect(steps).toEqual([
      expect.stringContaining('Tap Share'),
      expect.stringContaining('Add to Home Screen'),
      expect.stringContaining('Tap Add'),
    ]);
    expect(screen.getByRole('img', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByText(/reminders/)).toBeInTheDocument();
  });

  it('installs with one tap when the browser offers it', async () => {
    browserIs(DESKTOP_CHROME);
    stopListening = listenForInstallPrompt(window);
    render(<InstallAppSection />);
    const prompt = offerToInstall('accepted');
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(prompt).toHaveBeenCalled();
  });

  it('points to the browser’s menu when there is no offer', () => {
    browserIs(DESKTOP_CHROME);
    render(<InstallAppSection />);
    expect(screen.getByText(/your browser’s/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
  });

  it('goes back to the browser’s menu once the offer is turned down', async () => {
    browserIs(DESKTOP_CHROME);
    stopListening = listenForInstallPrompt(window);
    render(<InstallAppSection />);
    offerToInstall('dismissed');
    await userEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(await screen.findByText(/your browser’s/)).toBeInTheDocument();
  });

  it('shows nothing once it runs as an installed app', () => {
    browserIs(IPHONE_SAFARI, 5);
    displayModeIs(true);
    const { container } = render(<InstallAppSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
