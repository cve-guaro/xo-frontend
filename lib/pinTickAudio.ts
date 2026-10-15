// lib/pinTickAudio.ts
// ────────────────────────────────────────────────────────────────────────────
// Realistic Wheel Pin Ticker Audio Subsystem
// Plays one crisp mechanical tick sound (spin-sound-1.wav) every time one of
// the 20 rim pins touches the top flapper/needle.
// ────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let webAudioCtx: AudioContext | null = null;
let tickAudioBuffer: AudioBuffer | null = null;
let isAudioLoading = false;
let lastTickTime = 0;

/**
 * Initializes the Web Audio buffer ahead of time so the first tick plays with 0ms latency.
 */
export async function initPinTickAudio(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if (tickAudioBuffer || isAudioLoading) return;

  try {
    isAudioLoading = true;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!webAudioCtx) {
      webAudioCtx = new AudioContextClass();
    }
    if (webAudioCtx.state === 'suspended') {
      await webAudioCtx.resume().catch(() => {});
    }

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

    if (arrayBuffer && webAudioCtx) {
      tickAudioBuffer = await webAudioCtx.decodeAudioData(arrayBuffer);
    }
  } catch (err) {
    console.warn('[pinTickAudio] init error:', err);
  } finally {
    isAudioLoading = false;
  }
}

/**
 * Triggered precisely when one of the 20 wheel pins passes the flapper.
 * @param volume Optional volume level between 0 and 1 (default 0.75)
 */
export function playPinTick(volume = 0.75): void {
  // 1. Web Audio API (Zero latency, polyphonic, handles 60+ clicks/sec)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!webAudioCtx) {
        webAudioCtx = new AudioContextClass();
      }
      if (webAudioCtx.state === 'suspended') {
        webAudioCtx.resume().catch(() => {});
      }

      if (tickAudioBuffer) {
        const now = webAudioCtx.currentTime;
        // Limit minimum gap to 14ms so audio doesn't stack unnaturally at extreme speeds
        if (now - lastTickTime < 0.014) return;
        lastTickTime = now;

        const source = webAudioCtx.createBufferSource();
        source.buffer = tickAudioBuffer;

        // Subtle pitch variance (0.97 - 1.03) for organic physical roulette feel
        source.playbackRate.value = 0.97 + Math.random() * 0.06;

        const gainNode = webAudioCtx.createGain();
        gainNode.gain.value = Math.min(1, Math.max(0, volume));

        source.connect(gainNode);
        gainNode.connect(webAudioCtx.destination);
        source.start(0);
        return;
      } else {
        // Trigger lazy init if not already loaded
        initPinTickAudio();
      }
    } catch (e) {
      console.warn('[pinTickAudio] Web playback error:', e);
    }
  }

  // 2. Mobile Haptic feedback per pin
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
  }
}

/**
 * Cleanup audio context
 */
export function stopPinTickAudio(): void {
  // Web Audio buffer sources automatically terminate when buffer finishes,
  // no continuous background loop to pause.
}
