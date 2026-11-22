import type { ReactNode } from 'react';
import { CheckIcon } from '@/components/icons/interface-icons';
import { Avatar } from '@/components/ui/avatar';
import type { PersonColour } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DemoSection } from './demo-section';

const BADGE_TONES: readonly BadgeTone[] = ['neutral', 'late', 'done', 'recommended', 'owner'];

const PEOPLE: readonly { name: string; colour: PersonColour }[] = [
  { name: 'Alex', colour: 'pink' },
  { name: 'Sam', colour: 'blue' },
  { name: 'Jo', colour: 'green' },
  { name: 'Kit', colour: 'yellow' },
  { name: 'Rae', colour: 'teal' },
];

export function DisplayDemo(): ReactNode {
  return (
    <DemoSection title="Cards, badges and avatars">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>A raised card with a hard shadow.</Card>
        <Card raised={false}>A flat card for quieter content.</Card>
      </div>
      <div className="flex flex-wrap gap-2">
        {BADGE_TONES.map((tone) => (
          <Badge
            key={tone}
            tone={tone}
            {...(tone === 'done' ? { icon: <CheckIcon size={14} /> } : {})}
          >
            {tone}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {PEOPLE.map((person) => (
          <Avatar key={person.name} name={person.name} colour={person.colour} announced />
        ))}
        <Avatar name="Alex" colour="pink" size="small" />
        <Avatar name="Sam" colour="blue" size="large" />
      </div>
    </DemoSection>
  );
}
