'use client';

import { useSyncExternalStore } from 'react';
import { installGuideFor, readInstallSituation } from './install-guide';
import type { InstallGuide } from './install-guide';
import { useInstallPrompt } from './install-prompt';

const NEVER_CHANGES = (): (() => void) => () => undefined;
const HIDDEN_ON_THE_SERVER = (): InstallGuide => 'hidden';

interface InstallGuideState {
  guide: InstallGuide;
  install: () => Promise<boolean>;
}

export function useInstallGuide(): InstallGuideState {
  const { canPrompt, install } = useInstallPrompt();
  const guide = useSyncExternalStore(
    NEVER_CHANGES,
    () => installGuideFor(readInstallSituation(window, canPrompt)),
    HIDDEN_ON_THE_SERVER,
  );
  return { guide, install };
}
