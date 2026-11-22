import Image from 'next/image';
import type { ReactNode } from 'react';
import { ROOM_APPEARANCE } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { JobIcon } from '../icons/job-icons';
import { ART_STAND_IN_ROOMS, COMMISSIONED_ART } from './art-images';
import type { ArtImages, ArtKey } from './art-images';

interface ArtFrameProps {
  artKey: ArtKey;
  alt: string;
  images?: ArtImages;
  className?: string;
}

const STAND_IN_ICON_SIZE = 72;

function StandIn({ artKey, alt }: { artKey: ArtKey; alt: string }): ReactNode {
  const appearance = ROOM_APPEARANCE[ART_STAND_IN_ROOMS[artKey]];
  const accessibility = alt === '' ? {} : { role: 'img', 'aria-label': alt };
  return (
    <span
      className={cn('flex size-full items-center justify-center text-ink', appearance.colourClass)}
      {...accessibility}
    >
      <JobIcon icon={appearance.icon} size={STAND_IN_ICON_SIZE} strokeWidth={1.5} />
    </span>
  );
}

export function ArtFrame({
  artKey,
  alt,
  images = COMMISSIONED_ART,
  className,
}: ArtFrameProps): ReactNode {
  const image = images[artKey];
  return (
    <div
      aria-hidden={alt === '' ? true : undefined}
      className={cn(
        'relative aspect-[338/276] w-full overflow-hidden rounded-[1.375rem] border-2 border-ink shadow-[4px_4px_0_var(--ink)]',
        className,
      )}
    >
      {image === undefined ? (
        <StandIn artKey={artKey} alt={alt} />
      ) : (
        <Image
          src={image}
          alt={alt}
          unoptimized
          sizes="(min-width: 768px) 40rem, 100vw"
          className="size-full object-cover"
        />
      )}
    </div>
  );
}
