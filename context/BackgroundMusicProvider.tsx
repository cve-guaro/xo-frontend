import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './authContext';
import { API_URL } from '../config';
import { useAudioPlayer } from 'expo-audio';

type BackgroundMusicContextType = {
  isPlaying: boolean;
  toggleMusic: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  unlockAudio: () => Promise<void>;
};

const BackgroundMusicContext = createContext<BackgroundMusicContextType | undefined>(undefined);

export const BackgroundMusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    if (player) {
      player.volume = volume;
    }
  };

  return (
    <BackgroundMusicContext.Provider value={{ isPlaying, toggleMusic, setVolume, unlockAudio }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
};

export const useBackgroundMusic = () => {
  const context = useContext(BackgroundMusicContext);
  if (!context) throw new Error('useBackgroundMusic must be used within a BackgroundMusicProvider');
  return context;
};
