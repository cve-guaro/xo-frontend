// lib/rps/rpsEngine.ts
// ────────────────────────────────────────────────────────────────────────────
// Client-side game helpers, payout calculation, and move descriptions.
// ────────────────────────────────────────────────────────────────────────────
import { Choice, RoundOutcome } from './rpsTypes';

export const BET_TIERS = [10, 25, 50, 100] as const;
export const FEE_PERCENT = 20;

export const TIMINGS = {
  COUNTDOWN_MS: 3000,
  CHOOSE_MS: 10000,
  LOW_TIME_THRESHOLD_S: 3,
  SHAKE_MS: 3000,
  ROUND_RESULT_MS: 2500,
  FINAL_HOLD_MS: 5000,
};

export function calculatePrize(stakeAmount: number) {
  const stake = Math.round(Number(stakeAmount));
  const pot = stake * 2;
  const fee = Math.floor((pot * FEE_PERCENT) / 100);
  const prize = pot - fee;
  return { pot, fee, prize, feePercent: FEE_PERCENT };
}

export function judge(you: Choice, opponent: Choice): RoundOutcome {
  if (you === opponent) return 'draw';
  if (
    (you === 'rock' && opponent === 'scissors') ||
    (you === 'scissors' && opponent === 'paper') ||
    (you === 'paper' && opponent === 'rock')
  ) {
    return 'win';
  }
  return 'lose';
}

export const MOVE_DESCRIPTIONS: Record<string, string> = {
  'rock-scissors': 'Rock smashes Scissors',
  'scissors-rock': 'Rock smashes Scissors',
  'paper-rock': 'Paper covers Rock',
  'rock-paper': 'Paper covers Rock',
  'scissors-paper': 'Scissors cut Paper',
  'paper-scissors': 'Scissors cut Paper',
  'rock-rock': 'Both chose Rock',
  'paper-paper': 'Both chose Paper',
  'scissors-scissors': 'Both chose Scissors',
};

export function getMoveDescription(c1: Choice, c2: Choice): string {
  const key = `${c1}-${c2}`;
  return MOVE_DESCRIPTIONS[key] || `${capitalize(c1)} vs ${capitalize(c2)}`;
}

export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
