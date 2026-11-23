'use client';

import { LAPTOP_MEDIA_QUERY } from '@/components/shell/use-is-laptop';
import { useMediaQuery } from '@/lib/use-media-query';

// Dragging is for a mouse or trackpad on a laptop or desktop; on touch, and
// with a keyboard, the Move to… sheet is the way.
const DRAG_QUERY = `${LAPTOP_MEDIA_QUERY} and (pointer: fine)`;

export function useCanDragJobs(): boolean {
  return useMediaQuery(DRAG_QUERY);
}
