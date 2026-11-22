import type { JobIconKey } from '@cleaning-planner/schedule/library/types';
import type { ReactNode } from 'react';
import { createIcon, type IconComponent, type IconProps } from './create-icon';

const DishwasherIcon = createIcon(
  'DishwasherIcon',
  <>
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <path d="M3 7h18" />
    <path d="M7 4.5h2" />
    <path d="M8 11v7M12 11v7M16 11v7" />
  </>,
);

const OvenIcon = createIcon(
  'OvenIcon',
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 8h18" />
    <rect x="7" y="11" width="10" height="6" rx="1" />
    <path d="M7 5.5h.01M11 5.5h.01" />
  </>,
);

const FridgeIcon = createIcon(
  'FridgeIcon',
  <>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M5 10h14" />
    <path d="M8 5v2M8 13v3" />
  </>,
);

const KettleIcon = createIcon(
  'KettleIcon',
  <>
    <path d="M6 10h11l-1 10H7z" />
    <path d="M8 10a4 4 0 0 1 8 0" />
    <path d="M17 12l3-2" />
    <path d="M12 5v1" />
  </>,
);

const MicrowaveIcon = createIcon(
  'MicrowaveIcon',
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <rect x="5" y="8" width="10" height="8" rx="1" />
    <path d="M18 9v.01M18 12v.01M18 15v.01" />
  </>,
);

const WasherIcon = createIcon(
  'WasherIcon',
  <>
    <rect x="3" y="2" width="18" height="20" rx="2" />
    <path d="M3 7h18" />
    <path d="M6.5 4.5h1" />
    <circle cx="12" cy="14" r="5" />
    <path d="M9.5 15a2.5 2.5 0 0 0 5 0" />
  </>,
);

const ToiletIcon = createIcon(
  'ToiletIcon',
  <>
    <path d="M7 3h5v8H7z" />
    <path d="M4 11h16a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" />
    <path d="M9 17l-1 4h8l-1-4" />
  </>,
);

const ShowerIcon = createIcon(
  'ShowerIcon',
  <>
    <path d="M4 21V7a4 4 0 0 1 8 0" />
    <path d="M9 9h6" />
    <path d="M10 13v1M12 13v1M14 13v1M11 16.5v1M13 16.5v1" />
  </>,
);

const BedIcon = createIcon(
  'BedIcon',
  <>
    <path d="M3 19V6" />
    <path d="M3 15h18v4" />
    <path d="M21 15v-3a3 3 0 0 0-3-3h-7v6" />
    <circle cx="7" cy="12" r="1.5" />
  </>,
);

const VacuumIcon = createIcon(
  'VacuumIcon',
  <>
    <path d="M15 3l-3 12" />
    <path d="M13 3h4" />
    <rect x="4" y="15" width="12" height="4" rx="1.5" />
    <circle cx="6.5" cy="21" r="1" />
    <circle cx="13.5" cy="21" r="1" />
  </>,
);

const SofaIcon = createIcon(
  'SofaIcon',
  <>
    <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
    <path d="M3 11h4v3h10v-3h4v6H3z" />
    <path d="M5 17v2M19 17v2" />
  </>,
);

const MopIcon = createIcon(
  'MopIcon',
  <>
    <path d="M4 11h12l-1.5 9h-9z" />
    <path d="M6 11a4 3 0 0 1 8 0" />
    <path d="M19 3l-3 15" />
    <path d="M14.5 18h4" />
  </>,
);

const DusterIcon = createIcon(
  'DusterIcon',
  <>
    <path d="M6 21l6-9" />
    <path d="M12 12c-2-4 0-9 6-9 0 6-4 9-6 9z" />
  </>,
);

const WindowsIcon = createIcon(
  'WindowsIcon',
  <>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M12 3v18M4 12h16" />
  </>,
);

const BinsIcon = createIcon(
  'BinsIcon',
  <>
    <path d="M4 7h16" />
    <path d="M10 7V4h4v3" />
    <path d="M6 7l1 14h10l1-14" />
  </>,
);

const SprayIcon = createIcon(
  'SprayIcon',
  <>
    <path d="M9 9h6l1 3v9H8v-9z" />
    <path d="M10 9V5h5l2 2" />
    <path d="M19 4v.01M20 7v.01" />
  </>,
);

const SmokeAlarmIcon = createIcon(
  'SmokeAlarmIcon',
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const JOB_ICONS: Record<JobIconKey, IconComponent> = {
  dishwasher: DishwasherIcon,
  oven: OvenIcon,
  fridge: FridgeIcon,
  kettle: KettleIcon,
  microwave: MicrowaveIcon,
  washer: WasherIcon,
  toilet: ToiletIcon,
  shower: ShowerIcon,
  bed: BedIcon,
  vacuum: VacuumIcon,
  sofa: SofaIcon,
  mop: MopIcon,
  duster: DusterIcon,
  windows: WindowsIcon,
  bins: BinsIcon,
  spray: SprayIcon,
  smokeAlarm: SmokeAlarmIcon,
};

interface JobIconProps extends IconProps {
  icon: JobIconKey;
}

export function JobIcon({ icon, ...iconProps }: JobIconProps): ReactNode {
  const Icon = JOB_ICONS[icon];
  return <Icon {...iconProps} />;
}
