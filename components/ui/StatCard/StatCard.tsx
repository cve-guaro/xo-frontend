import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/tokens';
import { StatCardProps } from './StatCard.types';
import { styles } from './StatCard.styles';

const tintMap: Record<string, { bg: string; fg: string }> = {
  primary: { bg: colors.tintPrimary, fg: colors.primary },
  gold: { bg: colors.tintGold, fg: colors.gold },
  success: { bg: colors.tintSuccess, fg: colors.success },
  danger: { bg: colors.tintDanger, fg: colors.danger },
  violet: { bg: colors.tintViolet, fg: colors.violet },
  none: { bg: 'transparent', fg: colors.textMuted },
};

export function StatCard({
  label,
  value,
  icon,
  iconColor,
  tint = 'primary',
  delta,
  sub,
  style,
}: StatCardProps) {
  const t = tintMap[tint] ?? tintMap.primary;
  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        {!!icon && (
          <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
            <Ionicons name={icon} size={16} color={iconColor ?? t.fg} />
          </View>
        )}
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {delta}
      </View>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}