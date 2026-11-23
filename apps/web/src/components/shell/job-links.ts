import type { MouseEvent } from 'react';
import { readRecordId } from '@/lib/record-id';

const JOB_PATH = '/job';
const MAIN_BUTTON = 0;

// The job a link opens (`/job?id=…`, with or without the export's closing
// slash), or null for any other link.
function jobIdOfLink(link: HTMLAnchorElement): string | null {
  const address = new URL(link.href, window.location.href);
  const path = address.pathname.replace(/\/$/, '');
  if (address.origin !== window.location.origin || path !== JOB_PATH) return null;
  return readRecordId(address.searchParams);
}

function isPlainClick(event: MouseEvent): boolean {
  const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  return event.button === MAIN_BUTTON && !hasModifier && !event.defaultPrevented;
}

// The job a plain click on a job link would open; a click meant for a new tab
// or window is left to the browser.
export function jobIdOfPlainClick(event: MouseEvent): string | null {
  if (!isPlainClick(event) || !(event.target instanceof Element)) return null;
  const link = event.target.closest('a[href]');
  if (!(link instanceof HTMLAnchorElement) || link.target !== '') return null;
  return jobIdOfLink(link);
}

export function linkToJob(container: HTMLElement | null, jobId: string): HTMLAnchorElement | null {
  const links = container === null ? [] : [...container.querySelectorAll('a[href]')];
  return (
    links.find(
      (link): link is HTMLAnchorElement =>
        link instanceof HTMLAnchorElement && jobIdOfLink(link) === jobId,
    ) ?? null
  );
}
