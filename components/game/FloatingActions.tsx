// components/game/FloatingActions.tsx
// Collapsible floating action toolbar for mobile — sound toggle, bonus logs, expand/collapse.
import React from "react";
import { View, Animated, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function FloatingActions({
  floatingExpanded,
  floatingAnim,
  bgMusicPlaying,
  onToggleSound,
  onBonusLogs,
  onExpand,
  onCollapse,
}: {
  floatingExpanded: boolean;
  floatingAnim: Animated.Value;
  bgMusicPlaying: boolean;
  onToggleSound: () => void;
  onBonusLogs: () => void;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 95,
        right: 24,
        width: 50,
        zIndex: 9998,
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 180,
      }}
      pointerEvents="box-none"
    >
      {/* Expanded State Menu */}
      <Animated.View
        pointerEvents={floatingExpanded ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          bottom: 0,
          alignSelf: 'center',
          backgroundColor: 'rgba(12, 12, 31, 0.85)',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          padding: 8,
          gap: 10,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
          opacity: floatingAnim,
          transform: [
            { scale: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
          ],
        }}
      >
        {/* Mute/Unmute */}
        <TouchableOpacity
          onPress={onToggleSound}
          activeOpacity={0.85}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: bgMusicPlaying ? 'rgba(16,185,129,0.92)' : 'rgba(255,255,255,0.06)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1,
            borderColor: bgMusicPlaying ? '#10b981' : 'rgba(255,255,255,0.15)',
          }}
        >
          <Ionicons name={bgMusicPlaying ? "volume-high" : "volume-mute"} size={16} color="#fff" />
        </TouchableOpacity>

        {/* Gift/Bonus logs */}
        <TouchableOpacity
          onPress={onBonusLogs}
          activeOpacity={0.85}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: 'rgba(0, 218, 243, 0.92)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: '#00daf3',
          }}
        >
          <Ionicons name="gift" size={16} color="#0a0a0f" />
        </TouchableOpacity>

        {/* Close 'x' button to collapse */}
        <TouchableOpacity
          onPress={onCollapse}
          activeOpacity={0.85}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Collapsed '+' button */}
      <Animated.View
        pointerEvents={floatingExpanded ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          bottom: 0,
          alignSelf: 'center',
          opacity: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { scale: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) },
            { translateY: floatingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
          ],
        }}
      >
        <TouchableOpacity
          onPress={onExpand}
          activeOpacity={0.85}
          style={{
            width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
            shadowColor: '#00daf3',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={["#00daf3", "#00daf3"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
