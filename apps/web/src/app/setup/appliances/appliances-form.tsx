'use client';

import type { HomeFeature } from '@cleaning-planner/schedule/library/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountForm } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useHomeSetup } from '@/lib/setup/home-setup-draft';

interface FeatureGroup {
  title: string;
  features: readonly { feature: HomeFeature; label: string }[];
}

const FEATURE_GROUPS: readonly FeatureGroup[] = [
  {
    title: 'Kitchen',
    features: [
      { feature: 'dishwasher', label: 'Dishwasher' },
      { feature: 'oven', label: 'Oven' },
      { feature: 'extractorHood', label: 'Extractor hood' },
      { feature: 'microwave', label: 'Microwave' },
      { feature: 'kettle', label: 'Kettle' },
    ],
  },
  {
    title: 'Laundry',
    features: [
      { feature: 'washingMachine', label: 'Washing machine' },
      { feature: 'tumbleDryer', label: 'Tumble dryer' },
    ],
  },
  {
    title: 'Floors',
    features: [
      { feature: 'carpet', label: 'Carpet' },
      { feature: 'hardFloor', label: 'Hard floors' },
    ],
  },
];

interface FeatureSwitchesProps {
  group: FeatureGroup;
  chosen: readonly HomeFeature[];
  onToggle: (feature: HomeFeature, isChosen: boolean) => void;
}

function FeatureSwitches({ group, chosen, onToggle }: FeatureSwitchesProps): ReactNode {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-display text-xl font-extrabold">{group.title}</legend>
      <Card raised={false} className="flex flex-col gap-3 py-3">
        {group.features.map(({ feature, label }) => (
          <Switch
            key={feature}
            label={label}
            checked={chosen.includes(feature)}
            onCheckedChange={(isChosen) => {
              onToggle(feature, isChosen);
            }}
          />
        ))}
      </Card>
    </fieldset>
  );
}

export function AppliancesForm(): ReactNode {
  const router = useRouter();
  const { setup, change } = useHomeSetup();
  const toggle = (feature: HomeFeature, isChosen: boolean): void => {
    const others = setup.features.filter((chosenFeature) => chosenFeature !== feature);
    change({ features: isChosen ? [...others, feature] : others });
  };
  return (
    <AccountForm
      onSubmit={() => {
        router.push('/setup/reminders');
        return true;
      }}
      actions={<Button type="submit">Continue</Button>}
    >
      <div className="flex flex-col gap-5">
        {FEATURE_GROUPS.map((group) => (
          <FeatureSwitches
            key={group.title}
            group={group}
            chosen={setup.features}
            onToggle={toggle}
          />
        ))}
      </div>
    </AccountForm>
  );
}
