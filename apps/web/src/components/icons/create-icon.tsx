import type { ReactNode } from 'react';

export interface IconProps {
  size?: number;
  label?: string;
  strokeWidth?: number;
  className?: string;
}

export type IconComponent = (props: IconProps) => ReactNode;

const DEFAULT_ICON_SIZE = 24;
const DEFAULT_STROKE_WIDTH = 2;

export function createIcon(displayName: string, shapes: ReactNode): IconComponent {
  function Icon({
    size = DEFAULT_ICON_SIZE,
    label,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    className,
  }: IconProps): ReactNode {
    const accessibility =
      label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label };
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        className={className}
        {...accessibility}
      >
        {shapes}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
