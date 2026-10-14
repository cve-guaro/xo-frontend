import React, { useState } from 'react';
import { Pressable, PressableProps, Platform, StyleProp, ViewStyle } from 'react-native';
import { haptics } from '../lib/haptcs';

interface WebPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; hovered: boolean }) => StyleProp<ViewStyle>);
  hoverScale?: number;
  hoverOpacity?: number;
  activeScale?: number;
  hapticFeedback?: boolean;
}

export const WebPressable: React.FC<WebPressableProps> = ({ 
  style, 
  hoverScale = 1.018, 
  hoverOpacity = 1, 
  activeScale = 0.96,
  hapticFeedback = true,
  onPressIn,
  accessibilityRole = 'button',
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      {...props}
      onHoverIn={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
      onPressIn={(e) => {
        if (hapticFeedback) {
          haptics.tap();
        }
        onPressIn?.(e);
      }}
      style={(state) => {
        const { pressed } = state;
        const baseStyle = typeof style === 'function' 
          ? style({ pressed, hovered: isHovered }) 
          : style;
        
        const transform = [];
        let opacity = 1;

        if (pressed) {
          transform.push({ scale: activeScale });
        } else if (isHovered && Platform.OS === 'web') {
          transform.push({ scale: hoverScale });
          opacity = hoverOpacity;
        }

        return [
          baseStyle,
          Platform.OS === 'web' && { 
            cursor: 'pointer', 
            transition: 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease, filter 0.16s ease, box-shadow 0.2s ease',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          },
          { transform, opacity }
        ] as any;
      }}
    />
  );
};
