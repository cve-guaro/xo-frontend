import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  tint?: 'primary' | 'gold' | 'success' | 'danger' | 'violet' | 'none';
  delta?: ReactNode;
  sub?: string;
  style?: StyleProp<ViewStyle>;
}