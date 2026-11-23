import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { DayRow } from './day-row';
import { JobRow } from './job-row';
import { RoomTile } from './room-tile';

const DISHWASHER_FILTER = {
  name: 'Clean dishwasher filter',
  room: 'kitchen',
  icon: 'dishwasher',
  meta: 'Kitchen · Alex · 15 min',
  href: '/job?id=job-1',
} as const;

describe('JobRow', () => {
  it('has no accessibility violations in every state', async () => {
    const { container } = render(
      <ul>
        <li>
          <JobRow
            {...DISHWASHER_FILTER}
            assignee={{ name: 'Alex', colour: 'pink' }}
            status={{ kind: 'due', lateBy: '2 days late', onDone: vi.fn() }}
          />
        </li>
        <li>
          <JobRow
            {...DISHWASHER_FILTER}
            status={{
              kind: 'done',
              doneBy: 'you',
              doneAt: '08:40',
              nextDue: '29 Nov',
              onUndo: vi.fn(),
            }}
          />
        </li>
        <li>
          <JobRow {...DISHWASHER_FILTER} status={{ kind: 'upcoming' }} />
        </li>
      </ul>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('links to the job and shows its details', () => {
    render(<JobRow {...DISHWASHER_FILTER} status={{ kind: 'due', onDone: vi.fn() }} />);
    const link = screen.getByRole('link', { name: /Clean dishwasher filter/ });
    expect(link).toHaveAttribute('href', '/job?id=job-1');
    expect(screen.getByText('Kitchen · Alex · 15 min')).toBeInTheDocument();
  });

  it('has a done button named after the job that calls onDone', async () => {
    const onDone = vi.fn();
    render(<JobRow {...DISHWASHER_FILTER} status={{ kind: 'due', onDone }} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark Clean dishwasher filter as done' }),
    );
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('shows a late badge when the job is late', () => {
    render(
      <JobRow
        {...DISHWASHER_FILTER}
        status={{ kind: 'due', lateBy: '2 days late', onDone: vi.fn() }}
      />,
    );
    expect(screen.getByText('2 days late')).toBeInTheDocument();
  });

  it('shows the assignee initial on the icon', () => {
    render(
      <JobRow
        {...DISHWASHER_FILTER}
        assignee={{ name: 'Alex', colour: 'pink' }}
        status={{ kind: 'due', onDone: vi.fn() }}
      />,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows who did it and when, and offers undo', async () => {
    const onUndo = vi.fn();
    render(
      <JobRow
        {...DISHWASHER_FILTER}
        status={{ kind: 'done', doneBy: 'you', doneAt: '08:40', nextDue: '29 Nov', onUndo }}
      />,
    );
    expect(screen.getByText('Done by you at 08:40 · next 29 Nov')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /as done/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Undo Clean dishwasher filter' }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('is not a link when there is nowhere to go yet', () => {
    render(
      <JobRow
        name="Clean dishwasher filter"
        room="kitchen"
        icon="dishwasher"
        meta="Kitchen · Alex · 15 min"
        status={{ kind: 'due', onDone: vi.fn() }}
      />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mark Clean dishwasher filter as done' }),
    ).toBeEnabled();
  });

  it('says who did a job even when the time is not known', () => {
    render(
      <JobRow
        name="Wipe the hob"
        room="kitchen"
        icon="spray"
        meta="Kitchen · 5 min"
        href="/job?id=job-1"
        status={{ kind: 'done', doneBy: 'Sam', onUndo: vi.fn() }}
      />,
    );
    expect(screen.getByText('Done by Sam')).toBeInTheDocument();
  });

  it('can show a job’s schedule without any action, late or not', () => {
    render(<JobRow {...DISHWASHER_FILTER} status={{ kind: 'scheduled', lateBy: '3 days late' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('3 days late')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Clean dishwasher filter/ })).toHaveAttribute(
      'href',
      '/job?id=job-1',
    );
  });

  it('has no done button for a job that is not due yet', () => {
    render(<JobRow {...DISHWASHER_FILTER} status={{ kind: 'upcoming' }} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Clean dishwasher filter/ })).toBeInTheDocument();
  });
});

describe('RoomTile', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <RoomTile room="kitchen" name="Kitchen" jobCount={8} lateCount={1} href="/room?id=room-1" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('links to the room and reads out its jobs and late jobs', () => {
    render(
      <RoomTile room="kitchen" name="Kitchen" jobCount={8} lateCount={1} href="/room?id=room-1" />,
    );
    const link = screen.getByRole('link', { name: 'Kitchen 8 jobs 7 of 8 up to date 1 late' });
    expect(link).toHaveAttribute('href', '/room?id=room-1');
  });

  it('says "1 job" and leaves out the late badge when nothing is late', () => {
    render(
      <RoomTile room="laundry" name="Laundry" jobCount={1} lateCount={0} href="/room?id=room-2" />,
    );
    expect(
      screen.getByRole('link', { name: 'Laundry 1 job 1 of 1 up to date' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/late/)).not.toBeInTheDocument();
  });
});

describe('RoomTile up to date', () => {
  it('draws the share of jobs that are not late in the room’s colour', () => {
    render(
      <RoomTile room="kitchen" name="Kitchen" jobCount={8} lateCount={2} href="/room?id=room-1" />,
    );
    const ring = screen.getByTestId('up-to-date-ring');
    expect(ring).toHaveAttribute('data-share', '0.75');
    expect(ring.querySelector('.stroke-kitchen')).not.toBeNull();
  });

  it('keeps the ring’s space for a room with no jobs, without saying anything about it', () => {
    render(
      <RoomTile room="bedroom" name="Bedroom" jobCount={0} lateCount={0} href="/room?id=room-3" />,
    );
    expect(screen.getByRole('link', { name: 'Bedroom 0 jobs' })).toBeInTheDocument();
    expect(screen.getByTestId('up-to-date-ring')).toHaveAttribute('data-share', '0');
  });
});

describe('DayRow', () => {
  const FRIDAY_JOBS = [
    { name: 'Clean dishwasher filter', icon: 'dishwasher', state: 'late', effortMinutes: 20 },
    { name: 'Fridge shelves', icon: 'fridge', state: 'done', effortMinutes: 10 },
    { name: 'Clean the hob', icon: 'oven', state: 'toDo', effortMinutes: 15 },
  ] as const;

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div>
        <DayRow weekday="Fri" dayOfMonth={20} jobs={FRIDAY_JOBS} />
        <DayRow weekday="Sat" dayOfMonth={21} jobs={[]} />
        <DayRow weekday="Sun" dayOfMonth={22} jobs={FRIDAY_JOBS} isToday href="/today" />
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('names each job tile with its state', () => {
    render(<DayRow weekday="Fri" dayOfMonth={20} jobs={FRIDAY_JOBS} />);
    expect(screen.getByRole('img', { name: 'Clean dishwasher filter, late' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Fridge shelves, done' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Clean the hob, to do' })).toBeInTheDocument();
  });

  it('counts the late jobs when any are late', () => {
    render(<DayRow weekday="Fri" dayOfMonth={20} jobs={FRIDAY_JOBS} />);
    expect(screen.getByText('1 late')).toBeInTheDocument();
  });

  it('counts done jobs out of all jobs when none are late', () => {
    render(
      <DayRow
        weekday="Mon"
        dayOfMonth={16}
        jobs={[
          { name: 'Kitchen worktops', icon: 'spray', state: 'done', effortMinutes: 10 },
          { name: 'Bins out', icon: 'bins', state: 'toDo', effortMinutes: 5 },
        ]}
      />,
    );
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('says roughly how long the jobs still to do will take', () => {
    render(<DayRow weekday="Fri" dayOfMonth={20} jobs={FRIDAY_JOBS} />);
    expect(screen.getByText('about 35 min')).toBeInTheDocument();
  });

  it.each([
    [60, 'about 1 hr'],
    [90, 'about 1 hr 30 min'],
    [125, 'about 2 hr 5 min'],
  ])('says %i minutes as "%s"', (effortMinutes, expected) => {
    render(
      <DayRow
        weekday="Sat"
        dayOfMonth={21}
        jobs={[{ name: 'Deep clean', icon: 'spray', state: 'toDo', effortMinutes }]}
      />,
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('says nothing about time once every job is done', () => {
    render(
      <DayRow
        weekday="Mon"
        dayOfMonth={16}
        jobs={[{ name: 'Kitchen worktops', icon: 'spray', state: 'done', effortMinutes: 10 }]}
      />,
    );
    expect(screen.queryByText(/about/)).not.toBeInTheDocument();
  });

  it('lets a job that can move be tapped, at a full-size target', async () => {
    const onMove = vi.fn();
    render(
      <DayRow
        weekday="Fri"
        dayOfMonth={20}
        jobs={[{ name: 'Clean the hob', icon: 'oven', state: 'toDo', effortMinutes: 15, onMove }]}
      />,
    );
    const job = screen.getByRole('button', { name: 'Move Clean the hob, to do' });
    expect(job).toHaveClass('size-11');
    await userEvent.click(job);
    expect(onMove).toHaveBeenCalled();
  });

  it('never puts a job button inside a row that is a link', () => {
    render(
      <DayRow
        weekday="Sun"
        dayOfMonth={22}
        isToday
        href="/today"
        jobs={[
          {
            name: 'Clean the hob',
            icon: 'oven',
            state: 'toDo',
            effortMinutes: 15,
            onMove: vi.fn(),
          },
        ]}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Clean the hob, to do' })).toBeInTheDocument();
  });

  it('says when nothing is planned', () => {
    render(<DayRow weekday="Sat" dayOfMonth={21} jobs={[]} />);
    expect(screen.getByText('Nothing planned')).toBeInTheDocument();
  });

  it('highlights today and links to it', () => {
    render(<DayRow weekday="Sun" dayOfMonth={22} jobs={FRIDAY_JOBS} isToday href="/today" />);
    const link = screen.getByRole('link', { name: /Today 22/ });
    expect(link).toHaveAttribute('href', '/today');
    expect(link).toHaveAttribute('aria-current', 'date');
  });
});
