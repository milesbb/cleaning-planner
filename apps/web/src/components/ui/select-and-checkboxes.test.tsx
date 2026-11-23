import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { CheckboxGroup } from './checkbox-group';
import { SelectField } from './select-field';

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
];

describe('SelectField', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <SelectField label="Day of the month" value="1" onValueChange={vi.fn()}>
        <option value="1">1</option>
        <option value="last">Last day</option>
      </SelectField>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is labelled and reports the value chosen', async () => {
    const onValueChange = vi.fn();
    render(
      <SelectField label="Day of the month" value="1" onValueChange={onValueChange}>
        <option value="1">1</option>
        <option value="last">Last day</option>
      </SelectField>,
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Day of the month' }),
      'Last day',
    );
    expect(onValueChange).toHaveBeenCalledWith('last');
  });
});

describe('CheckboxGroup', () => {
  it('has no accessibility violations, with an error', async () => {
    const { container } = render(
      <CheckboxGroup
        label="Days"
        options={DAYS}
        values={[]}
        onValuesChange={vi.fn()}
        error="Pick at least one day"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ticks the chosen values and keeps them in the options’ order', async () => {
    const onValuesChange = vi.fn();
    render(
      <CheckboxGroup
        label="Days"
        options={DAYS}
        values={['wednesday']}
        onValuesChange={onValuesChange}
      />,
    );
    expect(screen.getByRole('group', { name: 'Days' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Wednesday' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Monday' }));
    expect(onValuesChange).toHaveBeenCalledWith(['monday', 'wednesday']);
  });

  it('unticks a value', async () => {
    const onValuesChange = vi.fn();
    render(
      <CheckboxGroup
        label="Days"
        options={DAYS}
        values={['monday', 'tuesday']}
        onValuesChange={onValuesChange}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Monday' }));
    expect(onValuesChange).toHaveBeenCalledWith(['tuesday']);
  });

  it('describes the group with its error', () => {
    render(
      <CheckboxGroup
        label="Days"
        options={DAYS}
        values={[]}
        onValuesChange={vi.fn()}
        error="Pick at least one day"
      />,
    );
    expect(screen.getByRole('group', { name: 'Days' })).toHaveAccessibleDescription(
      'Pick at least one day',
    );
  });
});
