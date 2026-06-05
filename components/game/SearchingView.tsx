// components/game/SearchingView.tsx
// Full-screen "Finding Opponent..." view with pulse animation and elapsed timer.
import React, { memo, useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing, Platform, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const SearchingView = memo(function SearchingView({ onCancel, isMatched }: { onCancel: () => void, isMatched?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    const ti = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => { loop.stop(); clearInterval(ti); };
  }, []);

  const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
        {/* Single simple pulse for visual feedback without being heavy */}
        <Animated.View style={{
          position: 'absolute',
          width: 200, height: 200, borderRadius: 100,
          borderWidth: 2, borderColor: 'rgba(129,236,255,0.1)',
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] }) }],
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] })
        }} />

        <LinearGradient colors={isMatched ? ['#10b981', '#059669'] : ['#81ecff', '#00daf3']} style={{
          width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
          shadowColor: '#00daf3', shadowOpacity: 0.5, shadowRadius: 15, elevation: 10,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
        }}>
          <Ionicons name={isMatched ? 'checkmark-circle' : 'search'} size={32} color="#000" />
        </LinearGradient>
      </View>

      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 24, letterSpacing: 1 }}>
        {isMatched ? 'MATCH FOUND!' : 'FINDING OPPONENT...'}
      </Text>

      <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={{ color: '#81ecff', fontWeight: '900', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : undefined }}>{timeStr}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 32, width: '100%' }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>ONLINE</Text>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 }}>12,402</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>LATENCY</Text>
          <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '900', marginTop: 2 }}>24ms</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onCancel} disabled={isMatched} style={{ marginTop: 40, width: '100%', borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={["rgba(253,111,133,0.2)", "rgba(253,111,133,0.1)"]} style={{ paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(253,111,133,0.2)', borderRadius: 18 }}>
          <Text style={{ color: '#fd6f85', fontWeight: '900', letterSpacing: 1 }}>CANCEL</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

export default SearchingView;
