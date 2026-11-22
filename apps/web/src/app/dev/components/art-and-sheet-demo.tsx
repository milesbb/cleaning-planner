'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArtFrame } from '@/components/art/art-frame';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { HomeSwitcher } from '@/components/shell/home-switcher';
import { Button } from '@/components/ui/button';
import { DemoSection } from './demo-section';

const HOMES = [
  { id: 'home-1', name: 'Our flat' },
  { id: 'home-2', name: "Mum's house" },
];

export function ArtDemo(): ReactNode {
  return (
    <DemoSection title="Art frames">
      <div className="grid gap-4 sm:grid-cols-2">
        <ArtFrame artKey="welcomeHero" alt="Stand-in for the welcome illustration" />
        <ArtFrame artKey="bathroomScene" alt="Stand-in for the bathroom scene" />
      </div>
    </DemoSection>
  );
}

export function SheetDemo(): ReactNode {
  const [currentHomeId, setCurrentHomeId] = useState('home-1');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  return (
    <DemoSection title="Sheets and the home switcher">
      <div className="flex flex-wrap items-center gap-3">
        <HomeSwitcher homes={HOMES} currentHomeId={currentHomeId} onSwitch={setCurrentHomeId} />
      </div>
      <BottomSheet
        title="Snooze this job?"
        description="It comes back on the day you pick."
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        trigger={<Button variant="secondary">Open a sheet</Button>}
      >
        <Button
          onClick={() => {
            setIsSheetOpen(false);
          }}
        >
          Snooze until tomorrow
        </Button>
      </BottomSheet>
    </DemoSection>
  );
}
