import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { CodeInput } from './code-input';

function digitBoxes(): HTMLElement[] {
  return screen.getAllByRole('textbox');
}

describe('CodeInput', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<CodeInput label="Code" onComplete={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows six numeric boxes, the first offering the code from messages', () => {
    render(<CodeInput label="Code" onComplete={vi.fn()} />);
    const boxes = digitBoxes();
    expect(boxes).toHaveLength(6);
    expect(boxes[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(boxes[0]).toHaveAttribute('inputmode', 'numeric');
    expect(boxes[0]).toHaveAccessibleName('Digit 1 of 6');
    expect(screen.getByRole('group', { name: 'Code' })).toBeInTheDocument();
  });

  it('moves along as digits are typed and reports the code once', async () => {
    const onComplete = vi.fn();
    render(<CodeInput label="Code" onComplete={onComplete} />);
    await userEvent.click(digitBoxes()[0] ?? document.body);
    await userEvent.keyboard('482019');
    ['4', '8', '2', '0', '1', '9'].forEach((digit, index) => {
      expect(digitBoxes()[index]).toHaveValue(digit);
    });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('482019');
  });

  it('fills every box when a whole code is pasted, ignoring anything that is not a digit', async () => {
    const onComplete = vi.fn();
    render(<CodeInput label="Code" onComplete={onComplete} />);
    await userEvent.click(digitBoxes()[0] ?? document.body);
    await userEvent.paste('Your code: 719 042');
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('719042');
  });

  it('ignores letters', async () => {
    render(<CodeInput label="Code" onComplete={vi.fn()} />);
    await userEvent.click(digitBoxes()[0] ?? document.body);
    await userEvent.keyboard('a');
    expect(digitBoxes()[0]).toHaveValue('');
    expect(digitBoxes()[0]).toHaveFocus();
  });

  it('clears the box before with Backspace on an empty box, and moves back to it', async () => {
    render(<CodeInput label="Code" onComplete={vi.fn()} />);
    await userEvent.click(digitBoxes()[0] ?? document.body);
    await userEvent.keyboard('48');
    await userEvent.keyboard('{Backspace}');
    expect(digitBoxes()[1]).toHaveFocus();
    expect(digitBoxes()[1]).toHaveValue('');
    expect(digitBoxes()[0]).toHaveValue('4');
    await userEvent.keyboard('{Backspace}');
    expect(digitBoxes()[0]).toHaveFocus();
    expect(digitBoxes()[0]).toHaveValue('');
  });

  it('replaces a digit when a filled box is typed over', async () => {
    const onComplete = vi.fn();
    render(<CodeInput label="Code" onComplete={onComplete} />);
    await userEvent.click(digitBoxes()[0] ?? document.body);
    await userEvent.keyboard('482019');
    await userEvent.click(digitBoxes()[2] ?? document.body);
    await userEvent.keyboard('7');
    expect(digitBoxes()[2]).toHaveValue('7');
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('moves between boxes with the arrow keys', async () => {
    render(<CodeInput label="Code" onComplete={vi.fn()} />);
    await userEvent.click(digitBoxes()[2] ?? document.body);
    await userEvent.keyboard('{ArrowLeft}');
    expect(digitBoxes()[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(digitBoxes()[3]).toHaveFocus();
  });

  it('reports the code so far as it changes', async () => {
    const onChange = vi.fn();
    render(<CodeInput label="Code" onComplete={vi.fn()} onChange={onChange} />);
    await userEvent.click(digitBoxes()[0] ?? document.body);
    await userEvent.keyboard('12');
    expect(onChange).toHaveBeenLastCalledWith('12');
    await userEvent.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith('1');
  });

  it('reads out an error for the whole code', () => {
    render(<CodeInput label="Code" onComplete={vi.fn()} error="That code has expired." />);
    expect(digitBoxes()[0]).toHaveAttribute('aria-invalid', 'true');
    expect(digitBoxes()[0]).toHaveAccessibleDescription('That code has expired.');
  });
});
