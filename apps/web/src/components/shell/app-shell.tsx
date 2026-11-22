import type { ReactNode } from 'react';
import { TabBar } from './tab-bar';
import type { TabKey } from './tab-bar';

interface AppShellProps {
  activeTab: TabKey;
  children: ReactNode;
}

export function AppShell({ activeTab, children }: AppShellProps): ReactNode {
  return (
    <div className="min-h-dvh lg:flex">
      <TabBar activeTab={activeTab} />
      <main className="min-w-0 flex-1 px-4 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">{children}</div>
      </main>
    </div>
  );
}
