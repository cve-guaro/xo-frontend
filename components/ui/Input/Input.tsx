import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/tokens';
import { InputProps } from './Input.types';
import { styles } from './Input.styles';

export function Input({
  label,
  error,
  icon,
  right,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.fieldWrap, error ? styles.fieldWrapError : null]}>
        {!!icon && (
          <Ionicons
            name={icon}
            size={18}
            color={error ? colors.danger : colors.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          {...rest}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, style]}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}