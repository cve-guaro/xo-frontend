import type { StyleProp, ViewStyle, TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}