export const NOTHING_TO_CHANGE = 'Change at least one thing';

export function hasAChange(update: object): boolean {
  return Object.keys(update).some((field) => field !== 'version');
}

export function hasNoRepeats(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
