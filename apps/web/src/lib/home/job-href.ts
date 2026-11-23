// The Job detail screen's address for a job.
export function jobHref(jobId: string): string {
  return `/job?id=${encodeURIComponent(jobId)}`;
}
