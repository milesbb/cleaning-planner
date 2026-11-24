import type { ReactNode } from 'react';
import { AppGuide } from '@/components/guide/app-guide';
import { DemoSection } from './demo-section';

export function GuideDemo(): ReactNode {
  return (
    <DemoSection title="How the app works">
      <AppGuide />
    </DemoSection>
  );
}
