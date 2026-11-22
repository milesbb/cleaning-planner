import type { ReactNode } from 'react';
import { ExampleTask } from './example-task';

export default function HomePage(): ReactNode {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <p className="text-sm font-semibold text-primary">Cleaning Planner</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Today</h1>
        <p className="mt-2 text-muted">What needs cleaning today, this week, and later.</p>
      </header>
      <section
        aria-labelledby="empty-state-heading"
        className="rounded-2xl border border-dashed border-border p-5 text-center sm:p-8"
      >
        <h2 id="empty-state-heading" className="text-lg font-semibold">
          Nothing due
        </h2>
        <p className="mt-1 text-muted">
          No cleaning tasks yet. Choosing your rooms and appliances is coming next.
        </p>
      </section>
      <ExampleTask />
    </main>
  );
}
