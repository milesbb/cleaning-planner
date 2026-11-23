'use client';

import type { HomeFeature } from '@cleaning-planner/schedule/library/types';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AccountForm } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { applianceChoicesFor } from '@/lib/jobs/appliances';
import type { ApplianceChoice } from '@/lib/jobs/appliances';
import { useHomeSetup } from '@/lib/setup/home-setup-draft';

interface FeatureGroup {
  title: string;
  features: readonly ApplianceChoice[];
}

const FEATURE_GROUPS: readonly FeatureGroup[] = [
  { title: 'Kitchen', features: applianceChoicesFor('kitchen') },
  { title: 'Laundry', features: applianceChoicesFor('laundry') },
  { title: 'Floors', features: applianceChoicesFor('wholeHome') },
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
        {group.features.map(({ value: feature, label }) => (
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
