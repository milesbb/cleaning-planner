import { every, months, weeks } from './intervals';
import type { LibraryJob } from './types';

export const BATHROOM_JOBS: readonly LibraryJob[] = [
  {
    id: 'bathroom.weekly-clean',
    name: 'Clean the toilet, sink and shower',
    room: 'bathroom',
    icon: 'toilet',
    defaultSchedule: every(weeks(1)),
    recommendedRange: { shortest: weeks(1), longest: weeks(1) },
    effortMinutes: 25,
    howTo: [
      'Squirt toilet cleaner under the rim and leave it while you do the rest.',
      'Spray and wipe the sink, taps and shower, then rinse.',
      'Scrub the toilet bowl, flush, and wipe the seat and outside.',
    ],
    why: 'Bathrooms stay damp, so bacteria and mould grow quickly.',
    sources: [],
  },
  {
    id: 'bathroom.shower-head',
    name: 'Descale the shower head',
    room: 'bathroom',
    icon: 'shower',
    defaultSchedule: every(months(3)),
    recommendedRange: { shortest: months(1), longest: months(3) },
    effortMinutes: 10,
    howTo: [
      'Tie a bag of white vinegar round the shower head so it sits in it.',
      'Leave it for an hour, then run hot water through it.',
    ],
    why: 'Limescale blocks the holes and makes the water spray sideways.',
    sources: [],
  },
  {
    id: 'bathroom.mats-curtain',
    name: 'Wash the bath mats and shower curtain',
    room: 'bathroom',
    icon: 'shower',
    defaultSchedule: every(months(1)),
    recommendedRange: { shortest: weeks(2), longest: weeks(6) },
    effortMinutes: 10,
    howTo: [
      'Put the mats and curtain in the washing machine on a warm wash.',
      'Hang them up to dry fully.',
    ],
    why: 'They stay damp and are where bathroom mould usually starts.',
    sources: [],
  },
];

export const BEDROOM_JOBS: readonly LibraryJob[] = [
  {
    id: 'bedroom.sheets',
    name: 'Change the bed sheets',
    room: 'bedroom',
    icon: 'bed',
    defaultSchedule: every(weeks(1)),
    recommendedRange: { shortest: weeks(1), longest: weeks(2) },
    effortMinutes: 15,
    howTo: [
      'Strip the bed and put the sheets and pillowcases on a warm wash.',
      'Put on a fresh set.',
    ],
    why: 'Sheets collect sweat, skin and dust mites within a week or two.',
    sources: [],
  },
  {
    id: 'bedroom.pillows-duvet',
    name: 'Wash the pillows and duvet',
    room: 'bedroom',
    icon: 'bed',
    defaultSchedule: every(months(6)),
    recommendedRange: { shortest: months(3), longest: months(6) },
    effortMinutes: 20,
    howTo: [
      'Check the labels; most can go in a large machine on a warm wash.',
      "Dry them completely, ideally with tumble dryer balls, so they don't go lumpy.",
    ],
    why: "Pillows and duvets soak up sweat and dust mites that a cover doesn't stop.",
    sources: [],
  },
  {
    id: 'bedroom.mattress',
    name: 'Turn and vacuum the mattress',
    room: 'bedroom',
    icon: 'bed',
    defaultSchedule: every(months(3)),
    recommendedRange: { shortest: months(3), longest: months(6) },
    effortMinutes: 15,
    howTo: [
      'Vacuum the top of the mattress with the upholstery tool.',
      "Rotate it head to foot (and flip it if it's two-sided).",
    ],
    why: 'Turning it stops dips forming, and vacuuming clears dust and skin.',
    sources: [],
  },
];

export const LIVING_ROOM_JOBS: readonly LibraryJob[] = [
  {
    id: 'livingRoom.sofa',
    name: 'Vacuum the sofa',
    room: 'livingRoom',
    icon: 'sofa',
    defaultSchedule: every(weeks(2)),
    recommendedRange: { shortest: weeks(1), longest: months(1) },
    effortMinutes: 10,
    howTo: [
      'Take the cushions off and vacuum underneath and in the gaps.',
      'Vacuum the cushions and put them back.',
    ],
    why: 'Crumbs and dust collect in the gaps and wear the fabric.',
    sources: [],
  },
];

export const HALLWAY_JOBS: readonly LibraryJob[] = [
  {
    id: 'hallway.doormat',
    name: 'Shake out the doormat and tidy the shoes',
    room: 'hallway',
    icon: 'mop',
    defaultSchedule: every(weeks(1)),
    recommendedRange: { shortest: weeks(1), longest: weeks(2) },
    effortMinutes: 5,
    howTo: ['Shake the mat outside.', 'Put shoes away and wipe up any mud.'],
    why: 'Most of the dirt in a home comes in on shoes.',
    sources: [],
  },
];

export const OFFICE_JOBS: readonly LibraryJob[] = [
  {
    id: 'office.desk',
    name: 'Dust the desk and screens',
    room: 'office',
    icon: 'duster',
    defaultSchedule: every(weeks(1)),
    recommendedRange: { shortest: weeks(1), longest: weeks(2) },
    effortMinutes: 10,
    howTo: [
      'Clear the desk and wipe it down.',
      'Wipe screens with a dry microfibre cloth and the keyboard with a damp one.',
    ],
    why: 'Keyboards and desks collect more germs than most surfaces at home.',
    sources: [],
  },
];

export const OUTDOOR_JOBS: readonly LibraryJob[] = [
  {
    id: 'outdoor.sweep',
    name: 'Sweep the balcony or patio',
    room: 'outdoor',
    icon: 'mop',
    defaultSchedule: every(months(1)),
    recommendedRange: { shortest: weeks(2), longest: months(2) },
    effortMinutes: 15,
    howTo: ['Clear leaves and sweep the floor.', 'Wipe down any outdoor furniture.'],
    why: 'Leaves and dirt block drains and get walked inside.',
    sources: [],
  },
];
