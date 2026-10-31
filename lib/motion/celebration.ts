/**
 * Gate win animations and sounds on a NET win.
 *
 * The UK Gambling Commission restricts celebratory effects when the return is at or below the stake,
 * because celebrating a net loss ("loss disguised as a win") misleads players about their position.
 * Use this as a benchmark even where local law is silent.
 *
 * Pass integers in the smallest currency unit (ETB santim) to avoid floating point errors.
 */
export type Celebration = "none" | "win";

export function celebrationFor(stakeMinor: number, payoutMinor: number): Celebration {
  return payoutMinor > stakeMinor ? "win" : "none";
}

/** Net result in minor units: positive = net win, 0 = break-even, negative = net loss. */
export function netResult(stakeMinor: number, payoutMinor: number): number {
  return payoutMinor - stakeMinor;
}
