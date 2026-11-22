import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PersonColour = 'blue' | 'pink' | 'green' | 'yellow' | 'teal';
type AvatarSize = 'small' | 'regular' | 'large';

const COLOUR_CLASSES: Record<PersonColour, string> = {
  blue: 'bg-laundry',
  pink: 'bg-bedroom',
  green: 'bg-living-room',
  yellow: 'bg-kitchen',
  teal: 'bg-bathroom',
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  small: 'size-7 text-xs',
  regular: 'size-10 text-base',
  large: 'size-16 font-display text-2xl font-extrabold',
};

interface AvatarProps {
  name: string;
  colour: PersonColour;
  size?: AvatarSize;
  announced?: boolean;
  className?: string;
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toLocaleUpperCase('en-GB');
}

export function Avatar({
  name,
  colour,
  size = 'regular',
  announced = false,
  className,
}: AvatarProps): ReactNode {
  const accessibility = announced ? { role: 'img', 'aria-label': name } : { 'aria-hidden': true };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-bold text-ink',
        COLOUR_CLASSES[colour],
        SIZE_CLASSES[size],
        className,
      )}
      {...accessibility}
    >
      {initialOf(name)}
    </span>
  );
}
