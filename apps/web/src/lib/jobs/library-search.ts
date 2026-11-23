import type { LibraryJob, RoomType } from '@cleaning-planner/schedule/library/types';

// Searching the job library on Add a job: every word typed must appear in the
// job's name or in what it says about the job, ignoring case. Jobs whose name
// matches come first; otherwise the library's own order is kept.

function wordsOf(query: string): string[] {
  return query
    .toLocaleLowerCase('en-GB')
    .split(/\s+/)
    .filter((word) => word !== '');
}

function hasEveryWord(text: string, words: readonly string[]): boolean {
  const lowerText = text.toLocaleLowerCase('en-GB');
  return words.every((word) => lowerText.includes(word));
}

function aboutText(job: LibraryJob): string {
  return [job.name, job.why, ...job.howTo].join(' ');
}

export function searchLibrary(
  jobs: readonly LibraryJob[],
  query: string,
  roomType: RoomType | null,
): LibraryJob[] {
  const words = wordsOf(query);
  const inRoom = jobs.filter((job) => roomType === null || job.room === roomType);
  const byName = inRoom.filter((job) => hasEveryWord(job.name, words));
  const byAbout = inRoom.filter(
    (job) => !byName.includes(job) && hasEveryWord(aboutText(job), words),
  );
  return [...byName, ...byAbout];
}
