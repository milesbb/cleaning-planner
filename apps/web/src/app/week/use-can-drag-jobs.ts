'use client';

import { useSyncExternalStore } from 'react';
import { LAPTOP_MEDIA_QUERY } from '@/components/shell/use-is-laptop';

// Dragging is for a mouse or trackpad on a laptop or desktop; on touch, and
// with a keyboard, the Move to… sheet is the way.
const DRAG_QUERY = `${LAPTOP_MEDIA_QUERY} and (pointer: fine)`;

function subscribe(onChange: () => void): () => void {
  const dragQuery = window.matchMedia(DRAG_QUERY);
  dragQuery.addEventListener('change', onChange);
  return () => {
    dragQuery.removeEventListener('change', onChange);
  };
}

export function useCanDragJobs(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DRAG_QUERY).matches,
    () => false,
  );
}
