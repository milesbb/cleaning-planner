import Link from 'next/link';
import type { ReactNode } from 'react';
import { APP_NAME } from '@/lib/app-identity';
import { cn } from '@/lib/utils';
import type { IconComponent } from '../icons/create-icon';
import {
  AppMarkIcon,
  HelpIcon,
  HomeIcon,
  SettingsIcon,
  TodayIcon,
  WeekIcon,
} from '../icons/interface-icons';

export type TabKey = 'today' | 'week' | 'home' | 'settings' | 'help';

interface Tab {
  key: TabKey;
  label: string;
  href: string;
  Icon: IconComponent;
}

const TABS: readonly Tab[] = [
  { key: 'today', label: 'Today', href: '/today', Icon: TodayIcon },
  { key: 'week', label: 'Week', href: '/week', Icon: WeekIcon },
  { key: 'home', label: 'Home', href: '/home', Icon: HomeIcon },
  { key: 'settings', label: 'Settings', href: '/settings', Icon: SettingsIcon },
  { key: 'help', label: 'Help', href: '/help', Icon: HelpIcon },
];

const NAVIGATION_CLASSES =
  'fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t-2 border-ink bg-card pt-2 pr-[max(0.75rem,env(safe-area-inset-right))] pb-[calc(0.875rem+env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:gap-2 lg:border-t-0 lg:border-r-2 lg:p-4';

const TAB_CLASSES =
  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[0.875rem] border-2 border-transparent text-[0.8125rem] font-bold text-ink no-underline transition-transform motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-95 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base';

export function TabBar({ activeTab }: { activeTab: TabKey }): ReactNode {
  return (
    <nav aria-label="Main" className={NAVIGATION_CLASSES}>
      <span className="hidden items-center gap-2 px-2 pb-4 font-display text-xl font-extrabold lg:flex">
        <AppMarkIcon size={32} />
        {APP_NAME}
      </span>
      {TABS.map(({ key, label, href, Icon }) => {
        const isActive = key === activeTab;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(TAB_CLASSES, { 'border-ink bg-kitchen': isActive })}
          >
            <Icon />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
