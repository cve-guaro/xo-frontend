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
let loseAudioBuffer: AudioBuffer | null = null;
let winAudioBuffer: AudioBuffer | null = null;
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
 * Initializes Web Audio buffers ahead of time so ticks, win fanfare, and loss sounds play with 0ms latency.
 */
export async function initPinTickAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx || isAudioLoading) return;

  try {
    isAudioLoading = true;

    // Helper to decode from public URL or local asset
    const loadBuffer = async (path: string, fallbackAsset: any): Promise<AudioBuffer | null> => {
      try {
        let buf: ArrayBuffer | null = null;
        try {
          const res = await fetch(path);
          if (res.ok) buf = await res.arrayBuffer();
        } catch {}

        if (!buf && fallbackAsset) {
          const uri = typeof fallbackAsset === 'string' ? fallbackAsset : (fallbackAsset?.default || fallbackAsset?.uri || fallbackAsset);
          if (uri) {
            const res = await fetch(uri);
            buf = await res.arrayBuffer();
          }
        }
        if (buf && ctx) {
          return await ctx.decodeAudioData(buf);
        }
      } catch (e) {
        // Ignored, will fall back cleanly
      }
      return null;
    };

    if (!tickAudioBuffer) {
      tickAudioBuffer = await loadBuffer('/sounds/spin-sound-1.wav', require('../assets/sounds/spin-sound-1.wav'));
    }
    if (!loseAudioBuffer) {
      loseAudioBuffer = await loadBuffer('/sounds/lose.wav', require('../assets/sounds/lose.wav'));
    }
    if (!winAudioBuffer) {
      winAudioBuffer = await loadBuffer('/sounds/win.mp3', require('../assets/sounds/win.mp3'));
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
      const now = ctx.currentTime;
      // Stricter rate-limiting (35ms = ~28 ticks/sec max) to prevent JS/audio thread congestion
      if (now - lastTickTime < 0.035) return;
      lastTickTime = now;

      if (tickAudioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = tickAudioBuffer;
        source.playbackRate.value = 0.97 + Math.random() * 0.06;

        const gainNode = ctx.createGain();
        gainNode.gain.value = Math.min(1, Math.max(0, volume));

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
        return;
      } else {
        // Fallback: synthesized crisp click
        playTickSound(620);
        initPinTickAudio();
      }
    } catch (e) {
      console.warn('[pinTickAudio] Web playback error:', e);
    }
  }

  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  }
}

/**
 * Direct synthesis modern tactile click sound (crisp mechanical pop)
 */
export function playTickSound(freq = 840): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
  }
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    // Primary tactile pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.028);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);

    // Subtle acoustic click transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1400, t);
    clickOsc.frequency.exponentialRampToValueAtTime(320, t + 0.012);

    clickGain.gain.setValueAtTime(0.12, t);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(t);
    clickOsc.stop(t + 0.02);
  } catch {}
}

/**
 * Premium crystal notification chime (Harmonic high-fidelity bell alert)
 */
export function playNotificationChime(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
  }
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Modern 3-note harmonic bell triad: F#5 (739.99Hz), A#5 (932.33Hz), C#6 (1108.73Hz)
    // Upgraded sleek modern iOS/Fintech double-tone crystal ping: C6 (1046.5Hz) -> E6 (1318.5Hz)
    const chimeNotes = [
      { freq: 1046.5, time: 0.00, dur: 0.18, vol: 0.28 },
      { freq: 1318.5, time: 0.05, dur: 0.28, vol: 0.30 },
    ];

    chimeNotes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + n.time;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(n.vol, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.dur + 0.05);
    });
  } catch (e) {
    console.warn('[pinTickAudio] playNotificationChime error:', e);
  }
}
export const playNotificationSound = playNotificationChime;

/**
 * Modern tactile click feedback for UI buttons and chips.
 */
export function playClickSound(): void {
  playTickSound(780);
}

/**
 * Harmonic 2-tone uplifting fintech success chime.
 */
export function playSuccessSound(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
  }
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    playNote(523.25, t, 0.12, 0.22, 'triangle');
    playNote(659.25, t + 0.08, 0.18, 0.24, 'triangle');
  } catch {}
}

/**
 * Synthesized Win Fanfare (Exact Prototype 6-Note Major Arpeggio + Triumph)
 */
export function playWinFanfare(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
  }

  // 1. Try playing real win audio file
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      if (ctx && winAudioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = winAudioBuffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.85;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      }
      const audio = new Audio('/sounds/win.mp3');
      audio.volume = 0.85;
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => synthesizeWinFanfare(ctx));
      }
      return;
    } catch (e) {
      // Fallback to synthesis
    }
  }

  synthesizeWinFanfare(ctx);
}
export const playWinSound = playWinFanfare;

function synthesizeWinFanfare(ctx: AudioContext | null): void {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const melody = [
      { freq: 523.25, time: 0.00, dur: 0.14 }, // C5
      { freq: 659.25, time: 0.10, dur: 0.14 }, // E5
      { freq: 783.99, time: 0.20, dur: 0.14 }, // G5
      { freq: 1046.50, time: 0.30, dur: 0.45 }, // C6
      { freq: 783.99, time: 0.50, dur: 0.15 }, // G5
      { freq: 1046.50, time: 0.64, dur: 0.65 }, // C6 Hold
    ];
    melody.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + n.time;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, start);
      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.dur + 0.02);
    });
  } catch (e) {
    console.warn('[pinTickAudio] synthesizeWinFanfare error:', e);
  }
}

/**
 * Plays the authentic loser sound (lose.wav) with rich descending tone synthesis fallback.
 */
export function playLoseSound(): void {
  const ctx = getAudioContext();
  if (Platform.OS !== 'web') {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch {}
  }

  // 1. Try playing real lose.wav audio file
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      if (ctx && loseAudioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = loseAudioBuffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.9;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      }
      const audio = new Audio('/sounds/lose.wav');
      audio.volume = 0.9;
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => synthesizeLoserSound(ctx));
      }
      return;
    } catch (e) {
      // Fallback to synthesis
    }
  }

  synthesizeLoserSound(ctx);
}
export const playLossSound = playLoseSound;

function synthesizeLoserSound(ctx: AudioContext | null): void {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Sad trombone / wah-wah-wah-waaaah cadence
    const notes = [
      { freq: 466.16, time: 0.00, dur: 0.32 }, // Bb4
      { freq: 440.00, time: 0.30, dur: 0.32 }, // A4
      { freq: 415.30, time: 0.60, dur: 0.34 }, // Ab4
      { freq: 392.00, time: 0.92, dur: 0.75 }, // G4 (drawn out slide)
    ];
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + n.time;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.freq, start);
      if (idx === notes.length - 1) {
        osc.frequency.exponentialRampToValueAtTime(329.63, start + n.dur); // Slide down to E4
      }
      gain.gain.setValueAtTime(0.28, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.dur + 0.03);
    });
  } catch (e) {
    console.warn('[pinTickAudio] synthesizeLoserSound error:', e);
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
 * Synthesized Coin Chime (Exact Prototype B5 -> E6 Sine Chime)
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
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
}

/**
 * Continuous smooth mechanical spinning sound loop
 */
let spinWhirOsc: OscillatorNode | null = null;
let spinWhirGain: GainNode | null = null;

export function startSpinSoundLoop(): void {
  // Disabled: Clean physical wheel pin ticks are used exclusively to avoid overlapping oscillator noise
}

export function stopSpinSoundLoop(): void {
  if (spinWhirGain && spinWhirOsc) {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        spinWhirGain.gain.setValueAtTime(spinWhirGain.gain.value, ctx.currentTime);
        spinWhirGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        const oscToStop = spinWhirOsc;
        setTimeout(() => {
          try { oscToStop.stop(); oscToStop.disconnect(); } catch {}
        }, 280);
      } else {
        spinWhirOsc.stop();
      }
    } catch {}
    spinWhirOsc = null;
    spinWhirGain = null;
  }
}

/**
 * Stake addition audio feedback
 */
export function playAddStakeSound(): void {
  playCoinSound();
}

/**
 * Popup open audio feedback
 */
export function playPopupSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    playNote(587.33, t, 0.08, 0.12, 'sine'); // D5
    playNote(880.00, t + 0.05, 0.12, 0.14, 'sine'); // A5
  } catch {}
}

/**
 * Cleanup audio context
 */
export function stopPinTickAudio(): void {
  stopSpinSoundLoop();
}
