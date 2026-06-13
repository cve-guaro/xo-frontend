// components/game/EmojiFloat.tsx — Animated top-down emoji popup for opponent
import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet, Easing, View } from 'react-native';

interface Props {
  emoji: string;
  onComplete?: () => void;
}

export default function EmojiFloat({ emoji, onComplete }: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.sequence([
      // Slide down + bounce in
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, speed: 12, bounciness: 14, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }),
      ]),
      // Hold for 1.5s
      Animated.delay(1500),
      // Fade out + slide up
      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: 400, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.6, duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => onComplete?.());
  }, []);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }, { scale }], opacity }]}>
      <View style={styles.pill}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    elevation: 999,
  },
  pill: {
    backgroundColor: 'rgba(15, 17, 30, 0.85)',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  emoji: {
    fontSize: 52,
    textAlign: 'center',
  },
});
