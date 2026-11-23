import type { RoomType } from '@cleaning-planner/schedule/library/types';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ROOM_APPEARANCE, countOf } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { IconTile } from './icon-tile';
import { UpToDateRing } from './up-to-date-ring';

interface RoomTileProps {
  room: RoomType;
  name: string;
  jobCount: number;
  lateCount: number;
  href: string;
}

export function RoomTile({ room, name, jobCount, lateCount, href }: RoomTileProps): ReactNode {
  const appearance = ROOM_APPEARANCE[room];
  const upToDate = jobCount - lateCount;
  return (
    <Link
      href={href}
      className={cn(
        'relative flex flex-col gap-2.5 rounded-[1.125rem] border-2 border-ink p-3.5 text-ink no-underline shadow-hard transition-transform motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        appearance.colourClass,
      )}
    >
      <IconTile icon={appearance.icon} colourClass="bg-card" />
      <span className="flex flex-col gap-0.5">
        <span className="font-display text-lg font-extrabold break-words min-[400px]:text-[1.375rem]">
          {name}
        </span>{' '}
        <span className="flex items-end justify-between gap-2">
          <span className="text-sm">
            {countOf(jobCount, 'job')}
            {jobCount === 0 ? null : (
              <>
                {' '}
                <span className="sr-only">{`${String(upToDate)} of ${String(jobCount)} up to date`}</span>
              </>
            )}
          </span>
          <UpToDateRing room={room} share={jobCount === 0 ? 0 : upToDate / jobCount} />
        </span>
      </span>
      {lateCount > 0 ? (
        <>
          {' '}
          <Badge tone="late" className="absolute top-3 right-3 text-xs">
            {`${String(lateCount)} late`}
          </Badge>
        </>
      ) : null}
    </Link>
  );
}
