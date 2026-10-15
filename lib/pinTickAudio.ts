// lib/pinTickAudio.ts
// ────────────────────────────────────────────────────────────────────────────
// Realistic Wheel Pin Ticker & Synthesized Game Sound Subsystem
// Zero-dependency Web Audio API synthesis for wheel ticks, win fanfare,
// loss thud, lockout warning, countdown beeps, and coins.
// ────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let webAudioCtx: AudioContext | null = null;
let tickAudioBuffer: AudioBuffer | null = null;
let isAudioLoading = false;
let lastTickTime = 0;

/**
 * Returns or initializes the active Web AudioContext with automatic resumption.
 */
function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!webAudioCtx) {
      webAudioCtx = new AudioContextClass();
    }
    if (webAudioCtx.state === 'suspended') {
      webAudioCtx.resume().catch(() => {});
    }
    return webAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Initializes the Web Audio buffer ahead of time so the first tick plays with 0ms latency.
 */
export async function initPinTickAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx || tickAudioBuffer || isAudioLoading) return;

  try {
    isAudioLoading = true;

    // Try fetching from public/sounds/ first, fallback to asset URI
    let arrayBuffer: ArrayBuffer | null = null;
    try {
      const res = await fetch('/sounds/spin-sound-1.wav');
      if (res.ok) {
        arrayBuffer = await res.arrayBuffer();
      }
    } catch {}

    if (!arrayBuffer) {
      const asset = require('../assets/sounds/spin-sound-1.wav');
      const uri = typeof asset === 'string' ? asset : (asset?.default || asset?.uri || asset);
      if (uri) {
        const res = await fetch(uri);
        arrayBuffer = await res.arrayBuffer();
      }
    }

    if (arrayBuffer && ctx) {
      tickAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
    }
  } catch (err) {
    console.warn('[pinTickAudio] init error:', err);
  } finally {
    isAudioLoading = false;
  }
}

/**
 * Helper to play a synthesized oscillator tone with envelope shaping.
 */
export function playNote(
  f: number,
  t: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'triangle'
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {}
}

/**
 * Triggered precisely when one of the 20 wheel pins passes the flapper.
 * @param volume Optional volume level between 0 and 1 (default 0.75)
 */
export function playPinTick(volume = 0.75): void {
  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (tickAudioBuffer) {
        const now = ctx.currentTime;
        // Limit minimum gap to 14ms so audio doesn't stack unnaturally at extreme speeds
        if (now - lastTickTime < 0.014) return;
        lastTickTime = now;

        const source = ctx.createBufferSource();
        source.buffer = tickAudioBuffer;

        // Subtle pitch variance (0.97 - 1.03) for organic physical roulette feel
        source.playbackRate.value = 0.97 + Math.random() * 0.06;

        const gainNode = ctx.createGain();
        gainNode.gain.value = Math.min(1, Math.max(0, volume));

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } else {
        // Fallback: synthesized crisp click if buffer is still loading
        const t = ctx.currentTime;
        playNote(1800 + Math.random() * 400, t, 0.035, volume * 0.4, 'square');
        initPinTickAudio();
      }
    } catch (e) {
      console.warn('[pinTickAudio] Web playback error:', e);
    }
  }

  // Mobile Haptic feedback per pin
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  }
}

/**
 * Synthesized Win Fanfare + Celebratory Coin Chimes
 */
export function playWinSound(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
  }
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    // Ascending celebratory fanfare arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      playNote(f, t + i * 0.085, 0.4, 0.22, 'triangle');
      playNote(f * 2, t + i * 0.085, 0.2, 0.06, 'square');
    });
    // High triumph chords
    [1046.5, 1318.5, 1567.98].forEach(f => playNote(f, t + 0.36, 0.8, 0.15, 'triangle'));
    // Rich warm sub-bass
    playNote(130.81, t, 0.5, 0.25, 'sine');

    // Dual sequenced coin chimes
    setTimeout(() => playCoinSound(), 350);
    setTimeout(() => playCoinSound(), 550);
  } catch (e) {
    console.warn('[pinTickAudio] playWinSound error:', e);
  }
}

/**
 * Synthesized Loss Thud Sound
 */
export function playLossSound(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch {}
  }
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.32);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.36);
  } catch (e) {
    console.warn('[pinTickAudio] playLossSound error:', e);
  }
}

/**
 * Synthesized Lockout Sound (Room Locked for Spin)
 */
export function playLockoutSound(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } catch {}
  }
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    [660, 494, 392].forEach((f, i) => playNote(f, t + i * 0.085, 0.14, 0.2, 'square'));
    playNote(98, t + 0.26, 0.38, 0.24, 'sine');
  } catch (e) {}
}

/**
 * Synthesized Urgent Countdown Beep (3, 2, 1)
 */
export function playCountdownBeep(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  }
  if (!ctx) return;
  try {
    playNote(1318, ctx.currentTime, 0.08, 0.18, 'sine');
  } catch (e) {}
}

/**
 * Synthesized Whoosh Sound (Wheel Launch)
 */
export function playWhooshSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.26);
  } catch (e) {}
}

/**
 * Synthesized Coin Chime (Bet Placed / Added)
 */
export function playCoinSound(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
  }
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    playNote(1567, t, 0.09, 0.16, 'square');
    playNote(2093, t + 0.06, 0.16, 0.12, 'square');
  } catch (e) {}
}

/**
 * Cleanup audio context
 */
export function stopPinTickAudio(): void {
  // Web Audio buffer sources and oscillators automatically terminate when finished.
}
