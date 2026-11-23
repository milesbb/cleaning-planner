'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject, SubmitEvent } from 'react';
import { APP_NAME } from '@/lib/app-identity';
import { AppMarkIcon, InfoIcon } from '../icons/interface-icons';
import { BackLink } from '../shell/page-header';

// The frame shared by Welcome, Create account, Check your email, Log in and the
// password reset screens: one centred column, the actions at the bottom on phones.

interface AccountScreenProps {
  back?: { href: string; label: string };
  children: ReactNode;
}

export function AccountScreen({ back, children }: AccountScreenProps): ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-7 px-4 pt-5 pb-7 sm:px-6 sm:pt-12 lg:max-w-lg">
      {back !== undefined && <BackLink href={back.href} label={back.label} />}
      {children}
    </main>
  );
}

export function AppNameRow(): ReactNode {
  return (
    <p className="flex items-center gap-2.5 font-display text-xl font-extrabold">
      <span className="flex size-10 items-center justify-center rounded-[0.6875rem] border-2 border-ink bg-whole-home shadow-[2px_2px_0_var(--ink)]">
        <AppMarkIcon size={24} strokeWidth={2.4} />
      </span>
      {APP_NAME}
    </p>
  );
}

interface AccountHeadingProps {
  title: string;
  children: ReactNode;
}

export function AccountHeading({ title, children }: AccountHeadingProps): ReactNode {
  return (
    <div className="flex flex-col gap-2.5">
      <h1 className="font-display text-[2.375rem] leading-[2.625rem] font-extrabold tracking-tight">
        {title}
      </h1>
      <p className="text-[1.0625rem] leading-relaxed">{children}</p>
    </div>
  );
}

interface AccountFormProps {
  // Return false when a field is invalid: focus then moves to the first one.
  onSubmit: () => boolean;
  children: ReactNode;
  actions: ReactNode;
}

interface FocusOnInvalid {
  formRef: RefObject<HTMLFormElement | null>;
  refocus: () => void;
}

function useFocusOnInvalid(): FocusOnInvalid {
  const formRef = useRef<HTMLFormElement>(null);
  const [focusRequests, setFocusRequests] = useState(0);
  useEffect(() => {
    if (focusRequests === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequests]);
  return {
    formRef,
    refocus: (): void => {
      setFocusRequests((count) => count + 1);
    },
  };
}

export function AccountForm({ onSubmit, children, actions }: AccountFormProps): ReactNode {
  const { formRef, refocus } = useFocusOnInvalid();
  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!onSubmit()) refocus();
  };
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      className="flex flex-1 flex-col justify-between gap-7"
    >
      <div className="flex flex-col gap-5">{children}</div>
      <div className="flex flex-col gap-4">{actions}</div>
    </form>
  );
}

export function FormAlert({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-control border-2 border-ink bg-late-soft px-3.5 py-3"
    >
      <InfoIcon size={22} className="shrink-0" />
      <span className="text-[0.9375rem] leading-snug">{children}</span>
    </div>
  );
}

export function FormStatus({ children }: { children: ReactNode }): ReactNode {
  return (
    <p role="status" className="text-[0.9375rem] font-bold">
      {children}
    </p>
  );
}

// Standalone text actions ("Send a new code") still need a 44px touch target.
export const TEXT_ACTION_CLASSES =
  'inline-flex min-h-11 items-center px-1 font-bold underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';

interface TextButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function TextButton({ onClick, disabled = false, children }: TextButtonProps): ReactNode {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={TEXT_ACTION_CLASSES}>
      {children}
    </button>
  );
}

export function FootnoteLinks({ children }: { children: ReactNode }): ReactNode {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-[0.9375rem]">
      {children}
    </p>
  );
}
