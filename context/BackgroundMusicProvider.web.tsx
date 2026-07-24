import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './authContext';
import { API_URL } from '../config';

type BackgroundMusicContextType = {
  isPlaying: boolean;
  toggleMusic: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  unlockAudio: () => Promise<void>;
};

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

export const BackgroundMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio(require('../assets/sounds/background.mp3'));
        audio.loop = true;
        audio.volume = 0.25;
        audioRef.current = audio;
      } catch (e) {
        console.warn("Failed to initialize background music on web:", e);
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const toggleMusic = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    AsyncStorage.setItem('xoet_music_muted', nextState ? 'false' : 'true').catch(() => {});
    
    if (audioRef.current) {
      if (nextState) {
        audioRef.current.play().catch(err => {
          console.warn("Audio playback blocked by browser autoplay rules:", err);
        });
      } else {
        audioRef.current.pause();
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

  const noopAsync = async () => {};

  return (
    <BackgroundMusicContext.Provider value={{ isPlaying, toggleMusic, setVolume: noopAsync, unlockAudio: noopAsync }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};

export const useBackgroundMusic = () => {
  const context = useContext(BackgroundMusicContext);
  if (!context) throw new Error('useBackgroundMusic must be used within a BackgroundMusicProvider');
  return context;
};
