'use client';

import type { ReactNode } from 'react';
import { AddToHomeScreenIcon, ShareIcon } from '@/components/icons/install-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { APP_NAME } from '@/lib/app-identity';
import { useInstallGuide } from '@/lib/pwa/use-install-guide';
import { SettingsSection } from './settings-sections';

const INLINE_ICON_CLASSES = 'mx-1 inline-block align-text-bottom';

function HomeScreenSteps(): ReactNode {
  return (
    <>
      <p>
        Add {APP_NAME} to your Home Screen to open it like an app. On iPhone and iPad, that’s also
        how reminders reach you.
      </p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-6">
        <li>
          Tap Share
          <ShareIcon label="Share" size={20} className={INLINE_ICON_CLASSES} />
          in Safari’s toolbar.
        </li>
        <li>
          Choose Add to Home Screen
          <AddToHomeScreenIcon
            label="Add to Home Screen"
            size={20}
            className={INLINE_ICON_CLASSES}
          />
        </li>
        <li>Tap Add.</li>
      </ol>
    </>
  );
}

function InstallButton({ install }: { install: () => Promise<boolean> }): ReactNode {
  return (
    <>
      <p>Install {APP_NAME} to open it like an app, straight from your home screen or dock.</p>
      <Button
        variant="secondary"
        onClick={() => {
          void install();
        }}
      >
        Install
      </Button>
    </>
  );
}

export function InstallAppSection(): ReactNode {
  const { guide, install } = useInstallGuide();
  if (guide === 'hidden') return null;
  return (
    <SettingsSection title="Use it like an app">
      <Card raised={false} className="flex flex-col gap-3">
        {guide === 'homeScreenSteps' && <HomeScreenSteps />}
        {guide === 'installButton' && <InstallButton install={install} />}
        {guide === 'browserMenu' && (
          <p>
            To open {APP_NAME} like an app, look for Install or Add to Home Screen in your browser’s
            menu.
          </p>
        )}
      </Card>
    </SettingsSection>
  );
}
