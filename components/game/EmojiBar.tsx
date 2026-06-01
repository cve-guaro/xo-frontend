// components/game/EmojiBar.tsx — Quick-tap animated emoji bar with 2s cooldown
import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing, Image } from 'react-native';

export const EMOJI_GIFS: Record<string, string> = {
  '👋': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif',
  '🤝': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f91d/512.gif',
  '😂': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif',
  '🥱': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f971/512.gif',
  '🤬': 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92c/512.gif',
};

const EMOJIS = Object.keys(EMOJI_GIFS);

interface Props {
  onSend: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiBar({ onSend, disabled }: Props) {
  const [cooldown, setCooldown] = useState(false);
  const scaleAnims = useRef(EMOJIS.map(() => new Animated.Value(1))).current;

  const handlePress = (emoji: string, idx: number) => {
    if (cooldown || disabled) return;
    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1, duration: 150, easing: Easing.bounce, useNativeDriver: true }),
    ]).start();
    onSend(emoji);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);
  };

  return (
    <View style={styles.bar}>
      {EMOJIS.map((emoji, i) => (
        <Animated.View key={emoji} style={{ transform: [{ scale: scaleAnims[i] }] }}>
          <TouchableOpacity
            style={[styles.btn, (cooldown || disabled) && styles.btnDisabled]}
            onPress={() => handlePress(emoji, i)}
            disabled={cooldown || disabled}
            activeOpacity={0.6}
          >
            <Image 
              source={{ uri: EMOJI_GIFS[emoji] }} 
              style={{ width: 32, height: 32 }} 
              resizeMode="contain" 
            />
          </TouchableOpacity>
        </Animated.View>
      ))}
      {cooldown && <View style={styles.cdOverlay}><View style={styles.cdDot} /></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(23,23,50,0.8)',
    borderRadius: 24,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  btn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  cdOverlay: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  cdDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e5ff',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
