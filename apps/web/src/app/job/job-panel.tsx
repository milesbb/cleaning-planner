'use client';

import { useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { CloseIcon } from '@/components/icons/interface-icons';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { completionText, jobDetailsOf } from '@/lib/home/job-details';
import { useLibraryAdvice } from '@/lib/home/use-library-advice';
import { useRoomSources } from '@/lib/home/use-room-sources';
import type { RoomSourcesState } from '@/lib/home/use-room-sources';
import { JobAbout, JobDueCard, JobManagement } from './job-sections';

type ReadyHome = Extract<RoomSourcesState, { kind: 'ready' }>;

interface JobPanelProps {
  jobId: string;
  onClose: () => void;
}

interface PanelHeaderProps {
  jobId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

const HEADING_CLASSES =
  'font-display text-2xl font-extrabold break-words focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';

// Focus moves to the heading each time a job opens, so a screen reader hears
// which job it is; renaming the job doesn't move it.
function PanelHeader({ jobId, title, subtitle, onClose }: PanelHeaderProps): ReactNode {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [jobId]);
  return (
    <header className="flex items-start gap-3">
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <h2 ref={headingRef} tabIndex={-1} className={HEADING_CLASSES}>
          {title}
        </h2>
        {subtitle === undefined ? null : <p className="text-[0.9375rem]">{subtitle}</p>}
      </div>
      <IconButton label="Close" icon={<CloseIcon />} onClick={onClose} />
    </header>
  );
}

function PanelJob({ home, jobId, onClose }: JobPanelProps & { home: ReadyHome }): ReactNode {
  const basics = jobDetailsOf(home.sources, jobId);
  const advice = useLibraryAdvice(basics?.libraryId ?? null);
  if (basics === null) {
    return <PanelHeader jobId={jobId} title="This job isn’t here any more" onClose={onClose} />;
  }
  const details = { ...basics, ...advice };
  const address = { householdId: home.householdId, jobId };
  return (
    <>
      <PanelHeader
        jobId={jobId}
        title={details.name}
        subtitle={details.roomName}
        onClose={onClose}
      />
      <JobDueCard details={details} address={address} today={home.sources.today} />
      <JobAbout
        details={details}
        address={address}
        describeCompletion={(completion) =>
          completionText(home.sources.members, home.sources.myUserId, completion)
        }
      />
      <JobManagement details={details} address={address} onRemoved={onClose} />
    </>
  );
}

function PanelContent({ jobId, onClose }: JobPanelProps): ReactNode {
  const home = useRoomSources();
  if (home.kind === 'ready') return <PanelJob home={home} jobId={jobId} onClose={onClose} />;
  if (home.kind === 'failed') {
    return (
      <>
        <FormAlert>{home.message}</FormAlert>
        <Button variant="secondary" onClick={home.retry}>
          Try again
        </Button>
      </>
    );
  }
  return <p role="status">Getting the job…</p>;
}

// Job detail beside a list on a laptop (docs/LAYOUTS.md §3). Not a dialog: the
// list stays usable. Escape closes it, except from a sheet opened inside it,
// which is portalled out of the panel and closes itself.
export function JobPanel({ jobId, onClose }: JobPanelProps): ReactNode {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeOnEscape = (event: KeyboardEvent<HTMLDivElement>): void => {
    const isInsidePanel = event.target instanceof Node && panelRef.current?.contains(event.target);
    if (event.key === 'Escape' && isInsidePanel === true) onClose();
  };
  return (
    <div
      ref={panelRef}
      onKeyDown={closeOnEscape}
      className="flex flex-col gap-5 rounded-card border-2 border-ink bg-paper p-5 motion-safe:animate-fade-in"
    >
      <PanelContent jobId={jobId} onClose={onClose} />
    </div>
  );
}
