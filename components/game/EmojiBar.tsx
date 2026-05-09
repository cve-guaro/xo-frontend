// components/game/EmojiBar.tsx — Quick-tap emoji bar with 2s cooldown
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';

const EMOJIS = ['😡', '🤣', '🤝'];

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
            <Text style={styles.emoji}>{emoji}</Text>
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
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  emoji: {
    fontSize: 22,
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
    backgroundColor: '#f59e0b',
  },
});
