import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './authContext';
import { API_URL } from '../config';

type BackgroundMusicContextType = {
  isPlaying: boolean;
  toggleMusic: () => Promise<void>;
  muteMusic: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  unlockAudio: () => Promise<void>;
};

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

// Window-level singleton to guarantee NEVER duplicate audio instances
declare global {
  interface Window {
    __XOET_BG_AUDIO__?: HTMLAudioElement | null;
  }
}

function getOrCreateGlobalAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  
  if (!window.__XOET_BG_AUDIO__) {
    try {
      const audio = new Audio('/sounds/background.mp3');
      audio.loop = true;
      audio.volume = 0.25;
      window.__XOET_BG_AUDIO__ = audio;
    } catch (e) {
      console.warn("Failed to initialize background music on web:", e);
    }
  }
  return window.__XOET_BG_AUDIO__ || null;
}

function safePlayGlobalAudio(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  // If already playing, do NOT call play() again to prevent overlap / stutter / restart
  if (!audio.paused && audio.currentTime > 0) {
    return;
  }
  try {
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Pending user interaction gesture
      });
    }
  } catch {}
}

export const BackgroundMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);
  isPlayingRef.current = isPlaying;

  // Initial preference check + auto-unlock on user interaction
  useEffect(() => {
    let unmounted = false;

    const checkPref = async () => {
      try {
        const isMutedLocal = await AsyncStorage.getItem('xoet_music_muted');
        if (isMutedLocal === 'true') {
          if (!unmounted) setIsPlaying(false);
          const audio = getOrCreateGlobalAudio();
          if (audio) audio.pause();
          return;
        }
      } catch {}

      // If allowed to play, attempt immediate play and bind persistent unlock listeners
      const unlockAndPlay = () => {
        if (!isPlayingRef.current) return;
        const audio = getOrCreateGlobalAudio();
        if (audio && audio.paused) {
          audio.play().then(() => {
            if (!unmounted) setIsPlaying(true);
            window.removeEventListener('click', unlockAndPlay);
            window.removeEventListener('keydown', unlockAndPlay);
            window.removeEventListener('touchstart', unlockAndPlay);
            window.removeEventListener('pointerdown', unlockAndPlay);
          }).catch(() => {
            // Pending user interaction gesture
          });
        }
      };

      unlockAndPlay();

      window.addEventListener('click', unlockAndPlay);
      window.addEventListener('keydown', unlockAndPlay);
      window.addEventListener('touchstart', unlockAndPlay);
      window.addEventListener('pointerdown', unlockAndPlay);
    };

    checkPref();

    return () => {
      unmounted = true;
      // Do NOT pause the global audio on unmount if it's supposed to keep playing across routes
    };
  }, []);

  // Sync with User DB preference if it explicitly differs
  useEffect(() => {
    if (user?.sound_muted !== undefined) {
      const dbShouldPlay = !user.sound_muted;
      if (dbShouldPlay !== isPlayingRef.current) {
        setIsPlaying(dbShouldPlay);
        isPlayingRef.current = dbShouldPlay;
        const audio = getOrCreateGlobalAudio();
        if (audio) {
          if (dbShouldPlay) {
            safePlayGlobalAudio(audio);
          } else {
            audio.pause();
          }
        }
      }
    }
  }, [user?.sound_muted]);

  const muteMusic = async () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    AsyncStorage.setItem('xoet_music_muted', 'true').catch(() => {});
    const audio = getOrCreateGlobalAudio();
    if (audio) {
      audio.pause();
    }
    if (token) {
      fetch(`${API_URL}/account/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ soundMuted: true })
      }).catch(() => {});
    }
  };

  const toggleMusic = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    isPlayingRef.current = nextState;
    AsyncStorage.setItem('xoet_music_muted', nextState ? 'false' : 'true').catch(() => {});
    
    const audio = getOrCreateGlobalAudio();
    if (audio) {
      if (nextState) {
        safePlayGlobalAudio(audio);
      } else {
        audio.pause();
      }
    }

    if (token) {
      fetch(`${API_URL}/account/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ soundMuted: !nextState })
      }).catch(() => {});
    }
  };

  const unlockAudio = async () => {
    if (!isPlayingRef.current) return;
    const audio = getOrCreateGlobalAudio();
    if (audio && audio.paused) {
      safePlayGlobalAudio(audio);
    }
  };

  const setVolume = async (volume: number) => {
    const audio = getOrCreateGlobalAudio();
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  };

  return (
    <BackgroundMusicContext.Provider value={{ isPlaying, toggleMusic, muteMusic, setVolume, unlockAudio }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};

export const useBackgroundMusic = () => {
  const context = useContext(BackgroundMusicContext);
  if (!context) throw new Error('useBackgroundMusic must be used within a BackgroundMusicProvider');
  return context;
};
