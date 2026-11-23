import { createIcon } from './create-icon';

// Safari's Share and Add to Home Screen icons, for the install steps in
// Settings. Kept apart from interface-icons, which every page loads.

export const ShareIcon = createIcon(
  'ShareIcon',
  <>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M8 10H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
  </>,
);

export const AddToHomeScreenIcon = createIcon(
  'AddToHomeScreenIcon',
  <>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </>,
);
