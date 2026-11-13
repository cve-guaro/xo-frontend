// lib/rps/rpsTypes.ts
// ────────────────────────────────────────────────────────────────────────────
// TypeScript definitions for Rock Paper Scissors on XOET.
// ────────────────────────────────────────────────────────────────────────────

export type Choice = 'rock' | 'paper' | 'scissors';
export type Pose = 'fist' | 'rock' | 'paper' | 'scissors';

export type Phase =
  | 'idle'          // Lobby / choosing bet tier
  | 'searching'     // Matchmaking queue
  | 'countdown'     // Both matched, 3s pre-match countdown
  | 'choose'        // 10s decision timer
  | 'locked'        // Player has locked choice
  | 'reveal'        // 3s synchronized shake animation
  | 'roundResult'   // 2.5s round outcome banner
  | 'final';        // Match concluded, payout modal shown

export type RoundOutcome = 'win' | 'lose' | 'draw';

export interface RoundRecord {
  round: number;
  choiceP1: Choice;
  choiceP2: Choice;
  result: RoundOutcome;
  winner: string | null;
}

export interface RPSMatchState {
  roomId: string;
  stakeAmount: number;
  potAmount: number;
  feeAmount: number;
  feePercent: number;
  prizeAmount: number;
  bestOf: number;
  winsNeeded: number;
  youAre: 'p1' | 'p2';
  opponentId: string;
  opponentUsername: string;

  scoreYou: number;
  scoreOpponent: number;
  currentRound: number;

  yourChoice: Choice | null;
  yourLocked: boolean;
  opponentLocked: boolean;

  // Reveal data for current round
  lastRound?: {
    round: number;
    choiceYou: Choice;
    choiceOpponent: Choice;
    outcome: RoundOutcome;
  };

  // Final match result
  finalResult?: {
    winnerId: string;
    won: boolean;
    prizeAmount: number;
    feeAmount: number;
  };
}

export interface RPSConfig {
  betTiers: number[];
  feePercent: number;
  bestOf: number;
  timings: {
    countdown: number;
    choose: number;
    shake: number;
    roundResult: number;
  };
}
