// components/game/WinTicker.tsx
// Live wins real-time ticker banner for mobile layout.
import React from "react";
import { View, Text, Animated, Platform } from "react-native";

export default function WinTicker({
  currentWinAnnouncement,
  winTickerAnim,
}: {
  currentWinAnnouncement: string;
  winTickerAnim: Animated.Value;
}) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 76 : 64,
        left: 0,
        right: 0,
        zIndex: 9998,
        height: 36,
        overflow: 'hidden',
        opacity: winTickerAnim.interpolate({
          inputRange: [0, 1, 2],
          outputRange: [0, 1, 0],
        }),
        transform: [{
          translateY: winTickerAnim.interpolate({
            inputRange: [0, 1, 2],
            outputRange: [24, 0, -24],
          })
        }],
      }}
      pointerEvents="none"
    >
      <View style={{ height: 36, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 24 }}>
        <Text
          style={{
            color: '#00daf3',
            fontSize: 12,
            fontWeight: '900',
            letterSpacing: 0.5,
            textShadowColor: 'rgba(0, 218, 243, 0.4)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 6,
            textAlign: 'left',
          }}
          numberOfLines={1}
        >
          {currentWinAnnouncement}
        </Text>
      </View>
    </Animated.View>
  );
}
