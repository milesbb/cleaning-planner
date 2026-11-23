import { deviceValue } from '../storage/stored-value';

// The home this device last looked at, so someone in two homes comes back to
// the same one.
const rememberedHome = deviceValue('cleaning-planner.current-home');

export const rememberCurrentHome = rememberedHome.remember;
export const rememberedHomeId = rememberedHome.read;

export function chooseCurrentHome<Home extends { id: string }>(
  homes: readonly Home[],
  rememberedId: string | null,
): Home | null {
  return homes.find((home) => home.id === rememberedId) ?? homes[0] ?? null;
}
