'use client';

import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  FIELD_LABEL_CLASSES,
  FieldMessages,
  describedByFor,
  fieldFrameClasses,
} from './field-messages';

const CODE_LENGTH = 6;
const EMPTY_CODE: readonly string[] = Array.from({ length: CODE_LENGTH }, () => '');
const DIGIT = /\d/g;
const ARROW_STEPS: Partial<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };
const BOX_POSITIONS: readonly number[] = Array.from({ length: CODE_LENGTH }, (_, index) => index);

function digitsIn(text: string): string[] {
  return text.match(DIGIT) ?? [];
}

function isComplete(code: readonly string[]): boolean {
  return code.every((digit) => digit !== '');
}

function withDigitsFrom(
  code: readonly string[],
  startIndex: number,
  digits: readonly string[],
): string[] {
  const nextCode = [...code];
  digits.slice(0, CODE_LENGTH - startIndex).forEach((digit, offset) => {
    nextCode[startIndex + offset] = digit;
  });
  return nextCode;
}

interface CodeDigits {
  code: readonly string[];
  registerBox: (index: number, box: HTMLInputElement | null) => void;
  enterText: (index: number, text: string) => void;
  handleKey: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
}

function useCodeDigits(
  onComplete: (code: string) => void,
  onChange: ((code: string) => void) | undefined,
): CodeDigits {
  const [code, setCode] = useState<readonly string[]>(EMPTY_CODE);
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusBox = (index: number): void => {
    boxRefs.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus();
  };
  const updateCode = (nextCode: readonly string[]): void => {
    setCode(nextCode);
    onChange?.(nextCode.join(''));
    if (!isComplete(code) && isComplete(nextCode)) onComplete(nextCode.join(''));
  };
  const enterText = (index: number, text: string): void => {
    const digits = digitsIn(text);
    if (text === '') updateCode(withDigitsFrom(code, index, ['']));
    if (digits.length === 0) return;
    updateCode(withDigitsFrom(code, index, digits));
    focusBox(index + digits.length);
  };
  const handleKey = (index: number, event: KeyboardEvent<HTMLInputElement>): void => {
    const isEmptyBackspace = event.key === 'Backspace' && code[index] === '' && index > 0;
    if (isEmptyBackspace) updateCode(withDigitsFrom(code, index - 1, ['']));
    const step = ARROW_STEPS[event.key] ?? (isEmptyBackspace ? -1 : 0);
    if (step === 0) return;
    event.preventDefault();
    focusBox(index + step);
  };
  const registerBox = (index: number, box: HTMLInputElement | null): void => {
    boxRefs.current[index] = box;
  };
  return { code, registerBox, enterText, handleKey };
}

interface CodeInputProps {
  label: string;
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  error?: string | undefined;
  className?: string;
}

export function CodeInput({
  label,
  onComplete,
  onChange,
  error,
  className,
}: CodeInputProps): ReactNode {
  const fieldId = useId();
  const digits = useCodeDigits(onComplete, onChange);
  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)}>
      <legend className={cn(FIELD_LABEL_CLASSES, 'mb-1.5')}>{label}</legend>
      <div className="grid max-w-sm grid-cols-6 gap-1 sm:gap-2">
        {BOX_POSITIONS.map((index) => (
          <DigitBox key={index} index={index} digits={digits} error={error} fieldId={fieldId} />
        ))}
      </div>
      <FieldMessages fieldId={fieldId} hint={undefined} error={error} />
    </fieldset>
  );
}

interface DigitBoxProps {
  index: number;
  digits: CodeDigits;
  error: string | undefined;
  fieldId: string;
}

function DigitBox({ index, digits, error, fieldId }: DigitBoxProps): ReactNode {
  const { code, registerBox, enterText, handleKey } = digits;
  return (
    <input
      ref={(box) => {
        registerBox(index, box);
      }}
      value={code[index]}
      inputMode="numeric"
      autoComplete={index === 0 ? 'one-time-code' : 'off'}
      aria-label={`Digit ${String(index + 1)} of ${String(CODE_LENGTH)}`}
      aria-describedby={describedByFor(fieldId, undefined, error)}
      aria-invalid={error === undefined ? undefined : true}
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onChange={(event) => {
        enterText(index, event.target.value);
      }}
      onKeyDown={(event) => {
        handleKey(index, event);
      }}
      onPaste={(event) => {
        event.preventDefault();
        enterText(index, event.clipboardData.getData('text'));
      }}
      className={fieldFrameClasses(
        error !== undefined,
        'min-h-14 min-w-0 text-center font-display text-2xl font-extrabold outline-hidden',
      )}
    />
  );
}
