// components/game/MobileQuickTile.tsx
// Quick action tile for the mobile gameplay landing screen.
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MobileQuickTile = ({ icon, iconColor, title, subtitle, onPress }: { icon: string; iconColor: string; title: string; subtitle: string; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    style={{
      flex: 1,
      backgroundColor: 'rgba(20, 19, 26, 0.6)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      paddingVertical: 18,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12
    }}
  >
    <Ionicons name={icon as any} size={28} color={iconColor} />
    <View style={{ alignItems: 'center', width: '100%' }}>
      <Text
        style={{ color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
      <Text
        style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8.5, fontWeight: '800', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {subtitle}
      </Text>
    </View>
  </TouchableOpacity>
);

export default MobileQuickTile;
