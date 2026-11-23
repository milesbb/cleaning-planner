import type { ReactNode } from 'react';
import { ArtFrame } from '../art/art-frame';
import { Card } from '../ui/card';

export function ChooseAJobHint(): ReactNode {
  return (
    <Card raised={false} className="flex flex-col items-center gap-4 text-center">
      <ArtFrame artKey="wholeHomeScene" alt="" className="max-w-48" />
      <p className="text-[1.0625rem]">
        Choose a job to see when it&apos;s due, who does it and how.
      </p>
    </Card>
  );
}
