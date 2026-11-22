import type { ReactNode } from 'react';
import { ExampleTask } from './example-task';

export default function HomePage(): ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <p className="font-display text-sm font-extrabold">Cleaning Planner</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Today
        </h1>
        <p className="mt-2">What needs cleaning today, this week, and later.</p>
      </header>
      <section
        aria-labelledby="empty-state-heading"
        className="rounded-card border-2 border-dashed border-ink bg-card p-5 text-center sm:p-8"
      >
        <h2 id="empty-state-heading" className="font-display text-lg font-extrabold">
          Nothing due
        </h2>
        <p className="mt-1">
          No cleaning tasks yet. Choosing your rooms and appliances is coming next.
        </p>
      </section>
      <ExampleTask />
    </main>
  );
}
