import type { ReactNode } from 'react';
import { APP_NAME } from '@/lib/app-identity';
import { cn } from '@/lib/utils';
import type { IconComponent } from '../icons/create-icon';
import {
  AppMarkIcon,
  CheckIcon,
  HomeIcon,
  MoreIcon,
  PencilIcon,
  PeopleIcon,
  SnoozeIcon,
  WeekIcon,
} from '../icons/interface-icons';

interface GuideTopic {
  title: string;
  text: string;
  Icon: IconComponent;
  colourClass: string;
}

const GUIDE_TOPICS: readonly GuideTopic[] = [
  {
    title: 'Today',
    text: 'What needs doing today, and anything that’s late. Tap the tick when a job’s done, and undo it straight away if you tapped the wrong one. Choose Just me to see only your jobs.',
    Icon: CheckIcon,
    colourClass: 'bg-kitchen',
  },
  {
    title: 'Not today?',
    text: 'Tap the three dots on a job to snooze it to a later day or skip it this time.',
    Icon: MoreIcon,
    colourClass: 'bg-laundry',
  },
  {
    title: 'This week',
    text: 'The week ahead, a day at a time. Move a job to another day when the week gets busy.',
    Icon: WeekIcon,
    colourClass: 'bg-bathroom',
  },
  {
    title: 'Home and rooms',
    text: 'Your rooms and how up to date each one is. Open a room to see its jobs, add a job or rename the room.',
    Icon: HomeIcon,
    colourClass: 'bg-living-room',
  },
  {
    title: 'Each job',
    text: 'Tap any job to see how to do it, change how often it comes round and who does it, or say you did it on another day.',
    Icon: PencilIcon,
    colourClass: 'bg-bedroom',
  },
  {
    title: 'When jobs come round',
    text: 'Most jobs come round again a set time after they were last done, so doing one late moves the next one along instead of piling up. Others happen on set days.',
    Icon: SnoozeIcon,
    colourClass: 'bg-whole-home',
  },
  {
    title: 'Share your home',
    text: 'Invite the people you live with from Settings, then Home settings, then Invite someone. Everyone sees the same jobs and who did what.',
    Icon: PeopleIcon,
    colourClass: 'bg-kitchen',
  },
  {
    title: 'Keep it on your phone',
    text: `Add ${APP_NAME} to your home screen from Settings to open it like an app.`,
    Icon: AppMarkIcon,
    colourClass: 'bg-laundry',
  },
];

function GuideTopicItem({ title, text, Icon, colourClass }: GuideTopic): ReactNode {
  return (
    <li className="flex items-start gap-3.5 rounded-card border-2 border-ink bg-card p-4 shadow-hard">
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-control border-2 border-ink',
          colourClass,
        )}
      >
        <Icon />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-display text-lg font-extrabold">{title}</h2>
        <p className="leading-relaxed">{text}</p>
      </div>
    </li>
  );
}

// How the app works, shown once setup is done and again under Help.
export function AppGuide(): ReactNode {
  return (
    <div className="@container">
      <ul className="grid gap-4 @2xl:grid-cols-2">
        {GUIDE_TOPICS.map((topic) => (
          <GuideTopicItem key={topic.title} {...topic} />
        ))}
      </ul>
    </div>
  );
}
