import type { JobIconKey } from '@cleaning-planner/schedule/library/types';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { JobIcon } from '../icons/job-icons';

type IconTileSize = 'small' | 'regular';

const SIZE_CLASSES: Record<IconTileSize, string> = {
  small: 'size-8.5 rounded-[0.5625rem]',
  regular: 'size-12.5 rounded-control',
};

const ICON_SIZES: Record<IconTileSize, number> = {
  small: 20,
  regular: 28,
};

interface IconTileProps {
  icon: JobIconKey;
  colourClass: string;
  size?: IconTileSize;
  children?: ReactNode;
  className?: string;
}

export function IconTile({
  icon,
  colourClass,
  size = 'regular',
  children,
  className,
}: IconTileProps): ReactNode {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center border-2 border-ink text-ink',
        SIZE_CLASSES[size],
        colourClass,
        className,
      )}
    >
      <JobIcon icon={icon} size={ICON_SIZES[size]} />
      {children}
    </span>
  );
}
