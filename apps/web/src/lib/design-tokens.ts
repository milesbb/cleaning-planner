export type PaletteKey =
  | 'ink'
  | 'paper'
  | 'card'
  | 'kitchen'
  | 'laundry'
  | 'bathroom'
  | 'bedroom'
  | 'livingRoom'
  | 'wholeHome'
  | 'late'
  | 'lateSoft'
  | 'done'
  | 'doneSoft'
  | 'danger';

export type Palette = Record<PaletteKey, string>;

export const PALETTE_KEYS: readonly PaletteKey[] = [
  'ink',
  'paper',
  'card',
  'kitchen',
  'laundry',
  'bathroom',
  'bedroom',
  'livingRoom',
  'wholeHome',
  'late',
  'lateSoft',
  'done',
  'doneSoft',
  'danger',
];

export const SOFTENED_PALETTE: Palette = {
  ink: '#26302c',
  paper: '#f5f0e3',
  card: '#fffdf7',
  kitchen: '#f5cf62',
  laundry: '#93cde3',
  bathroom: '#86ccb8',
  bedroom: '#f2a9a8',
  livingRoom: '#a3d293',
  wholeHome: '#e6dcc6',
  late: '#f0915c',
  lateSoft: '#fbe3d2',
  done: '#a3d293',
  doneSoft: '#eef4e4',
  danger: '#ea7b70',
};

export const ORIGINAL_PALETTE: Palette = {
  ink: '#121212',
  paper: '#fafaf7',
  card: '#ffffff',
  kitchen: '#ffd23f',
  laundry: '#6cc4f0',
  bathroom: '#5fd3c4',
  bedroom: '#ff9eb1',
  livingRoom: '#8fd694',
  wholeHome: '#e6dcc6',
  late: '#ff8a4c',
  lateSoft: '#ffe0d0',
  done: '#8fd694',
  doneSoft: '#f1f9f1',
  danger: '#f25f5c',
};

const BACKGROUNDS_UNDER_INK: readonly PaletteKey[] = PALETTE_KEYS.filter((key) => key !== 'ink');

export const TEXT_ON_BACKGROUND_PAIRS: readonly [text: PaletteKey, background: PaletteKey][] = [
  ...BACKGROUNDS_UNDER_INK.map((background): [PaletteKey, PaletteKey] => ['ink', background]),
  ['card', 'ink'],
];

const HEX_COLOUR_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const SRGB_LINEAR_THRESHOLD = 0.040_45;
const CONTRAST_OFFSET = 0.05;

function channelLuminance(channelHex: string): number {
  const channel = Number.parseInt(channelHex, 16) / 255;
  return channel <= SRGB_LINEAR_THRESHOLD ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(colour: string): number {
  const match = HEX_COLOUR_PATTERN.exec(colour);
  if (match === null) throw new Error(`Expected a #rrggbb colour, got ${colour}`);
  const [, red = '00', green = '00', blue = '00'] = match;
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

export function contrastRatio(firstColour: string, secondColour: string): number {
  const luminances = [relativeLuminance(firstColour), relativeLuminance(secondColour)];
  const lighter = Math.max(...luminances);
  const darker = Math.min(...luminances);
  return (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET);
}

export function cssVariableName(key: PaletteKey): string {
  return `--${key.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)}`;
}
