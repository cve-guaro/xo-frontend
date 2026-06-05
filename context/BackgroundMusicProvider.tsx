import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
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

// ─── WEB: lightweight no-op provider ────────────────────────────────────────
// Background music was never audible on web (autoplay policy blocks it).
// Skipping the entire expo-audio import eliminates ~500 KB decoded audio memory,
// global click/keydown listeners, and AppState subscriptions that run for nothing.
const WebMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleMusic = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    // Still persist preference so native app respects it
    AsyncStorage.setItem('xoet_music_muted', nextState ? 'false' : 'true').catch(() => {});
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

// ─── NATIVE: full audio provider ────────────────────────────────────────────
const NativeMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Conditional require so the web bundle never pulls in expo-audio
  const { useAudioPlayer } = require('expo-audio');
  const { user, token } = useAuth();
  
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);
  const hasInitialized = useRef(false);
  const [shouldLoadSound, setShouldLoadSound] = useState(false);

  const player = useAudioPlayer(shouldLoadSound ? require('../assets/sounds/background.mp3') : null);
  
  if (player) {
    player.loop = true;
  }

  // Trigger playing when player becomes available (after SWR delay)
  useEffect(() => {
    if (shouldLoadSound && player && isPlayingRef.current && !player.playing) {
      player.volume = 0.15;
      player.play();
    }
  }, [shouldLoadSound, player]);

  // Initial load effect
  useEffect(() => {
    const init = async () => {
      const isMutedLocal = await AsyncStorage.getItem('xoet_music_muted');
      
      let shouldStartPlaying = true;
      if (isMutedLocal !== null) {
        shouldStartPlaying = isMutedLocal === 'false';
      } else if (user?.sound_muted !== undefined) {
        shouldStartPlaying = !user.sound_muted;
      }
      
      setIsPlaying(shouldStartPlaying);
      isPlayingRef.current = shouldStartPlaying;
      hasInitialized.current = true;
      if (player) {
        player.volume = 0.15;
      }

      if (shouldStartPlaying && player && player.play) {
        player.play();
      }
    };
    
    if (!hasInitialized.current) {
        init();
    }
  }, [player]);

  // Sync with User DB if it changes
  useEffect(() => {
    if (user?.sound_muted !== undefined && hasInitialized.current) {
      const dbShouldPlay = !user.sound_muted;
      if (dbShouldPlay !== isPlayingRef.current) {
        console.log('[AUDIO] Syncing state from User DB:', dbShouldPlay ? 'Playing' : 'Muted');
        setIsPlaying(dbShouldPlay);
        isPlayingRef.current = dbShouldPlay;
        if (dbShouldPlay) {
          setShouldLoadSound(true);
          if (player && player.play) player.play();
        }
        else if (player && player.pause) player.pause();
      }
    }
  }, [user?.sound_muted, player]);

  // App State listener for background pausing
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
          if (isPlayingRef.current && player && player.play) player.play();
        } else if (next.match(/inactive|background/) && player && player.pause) {
          player.pause();
        }
     });

    return () => {
      subscription.remove();
      if (player && player.pause) player.pause();
    };
  }, [player]);

  const unlockAudio = async () => {
    setShouldLoadSound(true);
    if (isPlayingRef.current && player && !player.playing && player.play) {
      player.play();
    }
  };

  const toggleMusic = async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    isPlayingRef.current = nextState;
    
    AsyncStorage.setItem('xoet_music_muted', nextState ? 'false' : 'true').catch(() => {});
    
    if (token) {
      fetch(`${API_URL}/account/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ soundMuted: !nextState })
      }).catch(() => {});
    }
    
    setShouldLoadSound(true);
    if (nextState) {
      if (player && player.play) player.play();
    } else {
      if (player && player.pause) player.pause();
    }
  };

  const setVolume = async (volume: number) => {
    player.volume = volume;
  };

  return (
    <BackgroundMusicContext.Provider value={{ isPlaying, toggleMusic, setVolume, unlockAudio }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};

// ─── Exported wrapper — picks the right provider per platform ───────────────
export const BackgroundMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (Platform.OS === 'web') {
    return <WebMusicProvider>{children}</WebMusicProvider>;
  }
  return <NativeMusicProvider>{children}</NativeMusicProvider>;
};

export const useBackgroundMusic = () => {
  const context = useContext(BackgroundMusicContext);
  if (!context) throw new Error('useBackgroundMusic must be used within a BackgroundMusicProvider');
  return context;
};
