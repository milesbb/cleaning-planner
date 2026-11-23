import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { SegmentedControl } from './segmented-control';
import { Stepper } from './stepper';
import { Switch } from './switch';

type Frequency = 'weekly' | 'fortnightly' | 'monthly';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Every 2 weeks', isRecommended: true },
  { value: 'monthly', label: 'Monthly' },
] as const;

function FrequencyPicker({ onChange }: { onChange?: (frequency: Frequency) => void }): ReactNode {
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  return (
    <SegmentedControl
      label="How often"
      options={FREQUENCY_OPTIONS}
      value={frequency}
      onValueChange={(nextFrequency) => {
        setFrequency(nextFrequency);
        onChange?.(nextFrequency);
      }}
    />
  );
}

function BedroomStepper(): ReactNode {
  const [bedrooms, setBedrooms] = useState(1);
  return (
    <Stepper
      label="Bedrooms"
      value={bedrooms}
      minimum={0}
      maximum={2}
      onValueChange={setBedrooms}
    />
  );
}

function MinutesStepper({ start }: { start: number }): ReactNode {
  const [minutes, setMinutes] = useState(start);
  return (
    <Stepper
      label="Minutes"
      value={minutes}
      minimum={1}
      maximum={480}
      step={5}
      onValueChange={setMinutes}
    />
  );
}

describe('SegmentedControl', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<FrequencyPicker />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is a labelled group of options with the chosen one checked', () => {
    render(<FrequencyPicker />);
    expect(screen.getByRole('radiogroup', { name: 'How often' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'false');
  });

  it('announces the recommended option', () => {
    render(<FrequencyPicker />);
    expect(screen.getByRole('radio', { name: 'Every 2 weeks Recommended' })).toBeInTheDocument();
  });

  it('moves the selection with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<FrequencyPicker onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Weekly' }));
    await userEvent.keyboard('{ArrowRight>}');
    await userEvent.keyboard('{/ArrowRight}');
    const recommended = screen.getByRole('radio', { name: 'Every 2 weeks Recommended' });
    expect(recommended).toHaveFocus();
    expect(recommended).toHaveAttribute('aria-checked', 'true');
    expect(onChange).toHaveBeenLastCalledWith('fortnightly');
  });

  it('selects an option when tapped', async () => {
    const onChange = vi.fn();
    render(<FrequencyPicker onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    expect(onChange).toHaveBeenCalledWith('monthly');
  });
});

describe('Switch', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <Switch
        label="Reminders"
        description="A nudge at 8am"
        checked={false}
        onCheckedChange={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is named by its label and described by its description', () => {
    render(
      <Switch label="Reminders" description="A nudge at 8am" checked onCheckedChange={vi.fn()} />,
    );
    const reminderSwitch = screen.getByRole('switch', { name: 'Reminders' });
    expect(reminderSwitch).toHaveAttribute('aria-checked', 'true');
    expect(reminderSwitch).toHaveAccessibleDescription('A nudge at 8am');
  });

  it('toggles when clicked', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Reminders" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Reminders' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles with Space', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Reminders" checked onCheckedChange={onCheckedChange} />);
    screen.getByRole('switch', { name: 'Reminders' }).focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('toggles when its label is tapped', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Reminders" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByText('Reminders'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe('Stepper', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<BedroomStepper />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows and announces its value', () => {
    render(<BedroomStepper />);
    const value = screen.getByRole('status');
    expect(value).toHaveTextContent('1');
    expect(value).toHaveAccessibleName('Bedrooms');
  });

  it('goes up and down with its buttons', async () => {
    render(<BedroomStepper />);
    await userEvent.click(screen.getByRole('button', { name: 'More bedrooms' }));
    expect(screen.getByRole('status')).toHaveTextContent('2');
    await userEvent.click(screen.getByRole('button', { name: 'Fewer bedrooms' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fewer bedrooms' }));
    expect(screen.getByRole('status')).toHaveTextContent('0');
  });

  it('stops at its limits and disables the button that would pass them', async () => {
    render(<BedroomStepper />);
    await userEvent.click(screen.getByRole('button', { name: 'Fewer bedrooms' }));
    expect(screen.getByRole('button', { name: 'Fewer bedrooms' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('0');
    await userEvent.click(screen.getByRole('button', { name: 'More bedrooms' }));
    await userEvent.click(screen.getByRole('button', { name: 'More bedrooms' }));
    expect(screen.getByRole('button', { name: 'More bedrooms' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('2');
  });

  it('moves in steps, landing on whole steps from an odd value', async () => {
    render(<MinutesStepper start={3} />);
    await userEvent.click(screen.getByRole('button', { name: 'More minutes' }));
    expect(screen.getByRole('status')).toHaveTextContent('5');
    await userEvent.click(screen.getByRole('button', { name: 'More minutes' }));
    expect(screen.getByRole('status')).toHaveTextContent('10');
    await userEvent.click(screen.getByRole('button', { name: 'Fewer minutes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fewer minutes' }));
    expect(screen.getByRole('status')).toHaveTextContent('1');
  });

  it('steps down from an odd value to the step below it', async () => {
    render(<MinutesStepper start={12} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fewer minutes' }));
    expect(screen.getByRole('status')).toHaveTextContent('10');
  });
});
