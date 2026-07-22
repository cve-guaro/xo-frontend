import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface SlidingNumberProps {
  value: string | number;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold' | '500' | '600' | '700' | '800' | '900';
  lineHeight?: number;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Digit({ digit, fontSize, color, fontWeight, height }: { digit: number; fontSize: number; color: string; fontWeight: any; height: number }) {
  const animatedValue = useRef(new Animated.Value(digit)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: digit,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [digit]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 9],
    outputRange: [0, -height * 9],
  });

  // Calculate a proportional width for the digit container to prevent shifting layout
  const width = fontSize * 0.62;

  return (
    <View style={{ height, width, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {DIGITS.map((d) => (
          <Text
            key={d}
            style={{
              fontSize,
              color,
              fontWeight,
              height,
              lineHeight: height,
              textAlign: 'center',
              fontFamily: 'Space Grotesk, Inter, sans-serif',
            }}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function SlidingNumber({ value, fontSize = 16, color = '#fff', fontWeight = 'bold', lineHeight }: SlidingNumberProps) {
  const height = lineHeight || fontSize * 1.25;
  const chars = String(value).split('');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height }}>
      {chars.map((char, index) => {
        const isDigit = /\d/.test(char);
        if (isDigit) {
          return (
            <Digit
              key={index}
              digit={parseInt(char, 10)}
              fontSize={fontSize}
              color={color}
              fontWeight={fontWeight}
              height={height}
            />
          );
        }
        
        // Non-digits (spaces, symbols, currency characters)
        // Add a slight horizontal padding to spaces for clean separation
        const isSpace = char === ' ';
        const paddingHorizontal = isSpace ? 2 : 0;

        return (
          <Text
            key={index}
            style={{
              fontSize,
              color,
              fontWeight,
              height,
              lineHeight: height,
              textAlign: 'center',
              paddingHorizontal,
              fontFamily: 'Space Grotesk, Inter, sans-serif',
            }}
          >
            {char}
          </Text>
        );
      })}
    </View>
  );
}
