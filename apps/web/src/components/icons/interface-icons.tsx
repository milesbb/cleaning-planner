import { createIcon } from './create-icon';

export const CheckIcon = createIcon('CheckIcon', <path d="M5 12.5l4.5 4.5L19 7" />);

export const SnoozeIcon = createIcon(
  'SnoozeIcon',
  <path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z" />,
);

export const SkipIcon = createIcon(
  'SkipIcon',
  <>
    <path d="M5 5l8 7-8 7z" />
    <path d="M18 5v14" />
  </>,
);

export const PlusIcon = createIcon('PlusIcon', <path d="M12 5v14M5 12h14" />);

export const CloseIcon = createIcon('CloseIcon', <path d="M6 6l12 12M18 6L6 18" />);

export const TodayIcon = createIcon(
  'TodayIcon',
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 12.5l3 3 5-6" />
  </>,
);

export const WeekIcon = createIcon(
  'WeekIcon',
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
);

export const HomeIcon = createIcon(
  'HomeIcon',
  <>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </>,
);

export const AppMarkIcon = createIcon(
  'AppMarkIcon',
  <>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M9 14.5l2.5 2.5 4-5" />
  </>,
);

export const SettingsIcon = createIcon(
  'SettingsIcon',
  <>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </>,
);

export const BellIcon = createIcon(
  'BellIcon',
  <>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </>,
);

export const PeopleIcon = createIcon(
  'PeopleIcon',
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20a7 7 0 0 1 14 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    <path d="M18 13.5a6 6 0 0 1 4 6.5" />
  </>,
);

export const LinkIcon = createIcon(
  'LinkIcon',
  <>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </>,
);

export const PencilIcon = createIcon(
  'PencilIcon',
  <>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13 7l4 4" />
  </>,
);

export const SignOutIcon = createIcon(
  'SignOutIcon',
  <>
    <path d="M15 4h4v16h-4" />
    <path d="M10 8l-4 4 4 4" />
    <path d="M6 12h10" />
  </>,
);

export const TrashIcon = createIcon(
  'TrashIcon',
  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
);

export const ChevronRightIcon = createIcon('ChevronRightIcon', <path d="M9 6l6 6-6 6" />);

export const ChevronLeftIcon = createIcon('ChevronLeftIcon', <path d="M15 6l-6 6 6 6" />);

export const ChevronDownIcon = createIcon('ChevronDownIcon', <path d="M6 9l6 6 6-6" />);

export const EyeIcon = createIcon(
  'EyeIcon',
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

export const EyeOffIcon = createIcon(
  'EyeOffIcon',
  <>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2" />
    <path d="M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
);

export const MailIcon = createIcon(
  'MailIcon',
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </>,
);

export const CopyIcon = createIcon(
  'CopyIcon',
  <>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </>,
);

export const SearchIcon = createIcon(
  'SearchIcon',
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </>,
);

export const InfoIcon = createIcon(
  'InfoIcon',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6" />
    <path d="M12 7.5v.5" />
  </>,
);
