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

export const BackgroundMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(true);
  isPlayingRef.current = isPlaying;

  // Lazy audio loader: Only instantiate Audio when actually unmuted/played to save ~2.9MB on initial load
  const getOrCreateAudio = () => {
    if (!audioRef.current && typeof window !== 'undefined') {
      try {
        const audio = new Audio('/sounds/background.mp3');
        audio.loop = true;
        audio.volume = 0.25;
        audioRef.current = audio;
      } catch (e) {
        console.warn("Failed to initialize background music on web:", e);
      }
    }
    return audioRef.current;
  };

  // Initial preference check + auto-unlock on user interaction
  useEffect(() => {
    let unmounted = false;

    const checkPref = async () => {
      try {
        const isMutedLocal = await AsyncStorage.getItem('xoet_music_muted');
        // Only mute if explicitly stored as 'true' by a manual toggle
        if (isMutedLocal === 'true') {
          if (!unmounted) setIsPlaying(false);
          return;
        }
      } catch {}

      // If allowed to play, attempt immediate play and bind persistent unlock listeners
      const unlockAndPlay = () => {
        if (!isPlayingRef.current) return;
        const audio = getOrCreateAudio();
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const muteMusic = async () => {
    setIsPlaying(false);
    AsyncStorage.setItem('xoet_music_muted', 'true').catch(() => {});
    if (audioRef.current) {
      audioRef.current.pause();
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
    AsyncStorage.setItem('xoet_music_muted', nextState ? 'false' : 'true').catch(() => {});
    
    const audio = getOrCreateAudio();
    if (audio) {
      if (nextState) {
        audio.play().catch(err => {
          console.warn("Audio playback blocked by browser autoplay rules:", err);
        });
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
    const audio = getOrCreateAudio();
    if (audio && audio.paused) {
      await audio.play().catch(() => {});
    }
  };

  const noopAsync = async () => {};

  return (
    <BackgroundMusicContext.Provider value={{ isPlaying, toggleMusic, muteMusic, setVolume: noopAsync, unlockAudio }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};

export const useBackgroundMusic = () => {
  const context = useContext(BackgroundMusicContext);
  if (!context) throw new Error('useBackgroundMusic must be used within a BackgroundMusicProvider');
  return context;
};
