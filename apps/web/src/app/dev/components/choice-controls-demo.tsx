'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Stepper } from '@/components/ui/stepper';
import { Switch } from '@/components/ui/switch';
import { DemoSection } from './demo-section';

type Frequency = 'weekly' | 'fortnightly' | 'monthly';
type Audience = 'everyone' | 'justMe';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Every 2 weeks', isRecommended: true },
  { value: 'monthly', label: 'Monthly' },
] as const;

const AUDIENCE_OPTIONS = [
  { value: 'everyone', label: 'Everyone · 5' },
  { value: 'justMe', label: 'Just me · 3' },
] as const;

const MAXIMUM_BEDROOMS = 6;

function SegmentedControlsDemo(): ReactNode {
  const [frequency, setFrequency] = useState<Frequency>('fortnightly');
  const [audience, setAudience] = useState<Audience>('everyone');
  return (
    <>
      <SegmentedControl
        label="How often"
        options={FREQUENCY_OPTIONS}
        value={frequency}
        onValueChange={setFrequency}
      />
      <SegmentedControl
        label="Show jobs for"
        options={AUDIENCE_OPTIONS}
        value={audience}
        onValueChange={setAudience}
      />
    </>
  );
}

function SwitchesAndStepperDemo(): ReactNode {
  const [hasReminders, setHasReminders] = useState(true);
  const [bedrooms, setBedrooms] = useState(2);
  return (
    <>
      <Switch
        label="Morning reminder"
        description="A nudge at 8am with what's due today"
        checked={hasReminders}
        onCheckedChange={setHasReminders}
      />
      <Switch
        label="Email summary (coming soon)"
        checked={false}
        onCheckedChange={setHasReminders}
        disabled
      />
      <Stepper
        label="Bedrooms"
        value={bedrooms}
        minimum={0}
        maximum={MAXIMUM_BEDROOMS}
        onValueChange={setBedrooms}
      />
    </>
  );
}

export function ChoiceControlsDemo(): ReactNode {
  return (
    <DemoSection title="Choice controls">
      <SegmentedControlsDemo />
      <SwitchesAndStepperDemo />
    </DemoSection>
  );
}
