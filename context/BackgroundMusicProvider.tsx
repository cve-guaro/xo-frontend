import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './authContext';
import { API_URL } from '../config';
import { useAudioPlayer } from 'expo-audio';

type BackgroundMusicContextType = {
  isPlaying: boolean;
  toggleMusic: () => Promise<void>;
  muteMusic: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  unlockAudio: () => Promise<void>;
};

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

export const BackgroundMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();

  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(true);
  const hasInitialized = useRef(false);
  const playerRef = useRef<any>(null);
  const justInitializedRef = useRef(false);

  // Create the audio player exactly once, stable across re-renders
  const player = useAudioPlayer(require('../assets/sounds/background.mp3'));
  if (player && !playerRef.current) {
    playerRef.current = player;
    player.loop = true;
    player.volume = 0.15;
  }
  const p = playerRef.current;

  const safePlay = (playerInstance: any) => {
    if (!playerInstance) return;
    if (playerInstance.playing) return;
    try {
      const res = playerInstance.play();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch {}
  };

  // Initial load effect — run once
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

      if (shouldStartPlaying && p) {
        safePlay(p);
      }
    };

    if (!hasInitialized.current && p) {
      init();
    }
  }, [p, user?.sound_muted]);

  // Sync with User DB if it changes
  useEffect(() => {
    if (user?.sound_muted !== undefined && hasInitialized.current && p) {
      const dbShouldPlay = !user.sound_muted;
      if (dbShouldPlay !== isPlayingRef.current) {
        console.log('[AUDIO] Syncing state from User DB:', dbShouldPlay ? 'Playing' : 'Muted');
        setIsPlaying(dbShouldPlay);
        isPlayingRef.current = dbShouldPlay;
        if (dbShouldPlay) {
          safePlay(p);
        } else if (p.pause) p.pause();
      }
    }
  }, [user?.sound_muted, p]);

  // App State listener for background pausing
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        if (isPlayingRef.current && p) safePlay(p);
      } else if (next.match(/inactive|background/) && p && p.pause) {
        p.pause();
      }
    });

    return () => {
      subscription.remove();
      if (p && p.pause) p.pause();
    };
  }, [p]);

  const unlockAudio = async () => {
    if (isPlayingRef.current && p && !p.playing) {
      safePlay(p);
    }
  };

  const muteMusic = async () => {
    setIsPlaying(false);
    isPlayingRef.current = false;

    AsyncStorage.setItem('xoet_music_muted', 'true').catch(() => {});

    if (token) {
      fetch(`${API_URL}/account/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ soundMuted: true })
      }).catch(() => {});
    }

    if (p && p.pause) p.pause();
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

    if (nextState) {
      safePlay(p);
    } else {
      if (p && p.pause) p.pause();
    }
  };

  const setVolume = async (volume: number) => {
    if (p) {
      p.volume = volume;
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
