'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { CodeInput } from '@/components/ui/code-input';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import { DemoSection } from './demo-section';

const MINIMUM_PASSWORD_LENGTH = 12;

function TextFieldsDemo(): ReactNode {
  const [newPassword, setNewPassword] = useState('');
  return (
    <>
      <TextField label="Your name" hint="Shown to people you share a home with." />
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        defaultValue="sam@example"
        error="Enter an email address like name@example.com"
      />
      <PasswordField
        label="Choose a password"
        autoComplete="new-password"
        minimumLength={MINIMUM_PASSWORD_LENGTH}
        value={newPassword}
        onChange={(event) => {
          setNewPassword(event.target.value);
        }}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        error="That email and password don't match."
      />
    </>
  );
}

function CodeInputsDemo(): ReactNode {
  const [enteredCode, setEnteredCode] = useState<string | null>(null);
  return (
    <>
      <CodeInput label="Code from your email" onComplete={setEnteredCode} />
      <p aria-live="polite">{enteredCode === null ? 'No code yet.' : `Got ${enteredCode}.`}</p>
      <CodeInput
        label="Code (expired)"
        onComplete={setEnteredCode}
        error="That code has expired."
      />
    </>
  );
}

export function FormFieldsDemo(): ReactNode {
  return (
    <DemoSection title="Form fields">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <TextFieldsDemo />
        <CodeInputsDemo />
      </form>
    </DemoSection>
  );
}
