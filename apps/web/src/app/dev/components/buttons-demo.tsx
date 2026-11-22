import type { ReactNode } from 'react';
import { CloseIcon, PlusIcon } from '@/components/icons/interface-icons';
import { Button, ButtonLink } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { DemoSection } from './demo-section';

export function ButtonsDemo(): ReactNode {
  return (
    <DemoSection title="Buttons">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button>Create an account</Button>
        <Button variant="secondary">Log in</Button>
        <Button variant="dashed">
          <PlusIcon />
          Add a room
        </Button>
        <Button variant="danger">Delete account</Button>
        <Button disabled>Saving…</Button>
        <ButtonLink href="/dev/components" variant="secondary">
          A link that looks like a button
        </ButtonLink>
      </div>
      <div className="flex gap-3">
        <IconButton label="Add a job" icon={<PlusIcon />} tone="solid" />
        <IconButton label="Close" icon={<CloseIcon />} />
        <IconButton label="Add a job (disabled)" icon={<PlusIcon />} disabled />
      </div>
    </DemoSection>
  );
}
