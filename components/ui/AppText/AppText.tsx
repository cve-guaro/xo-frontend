import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { type } from '../../../theme/tokens';

export type AppTextRole =
  | 'display'
  | 'title'
  | 'titleSm'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'micro'
  | 'tiny';

export interface AppTextProps extends Omit<TextProps, 'role'> {
  role?: AppTextRole;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

const roleStyle: Record<AppTextRole, object> = {
  display: type.display,
  title: type.title,
  titleSm: type.titleSm,
  body: type.body,
  bodySm: type.bodySm,
  label: type.label,
  micro: type.micro,
  tiny: type.tiny,
};

export function AppText({
  role = 'body',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        roleStyle[role],
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}