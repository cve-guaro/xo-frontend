import React, { useState } from 'react';
import { Pressable, PressableProps, Platform, StyleProp, ViewStyle } from 'react-native';

interface WebPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; hovered: boolean }) => StyleProp<ViewStyle>);
  hoverScale?: number;
  hoverOpacity?: number;
  activeScale?: number;
}

export const WebPressable: React.FC<WebPressableProps> = ({ 
  style, 
  hoverScale = 1.02, 
  hoverOpacity = 0.8, 
  activeScale = 0.95,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      {...props}
      onHoverIn={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
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
          Platform.OS === 'web' && { cursor: 'pointer', transition: 'all 0.15s ease-in-out' },
          { transform, opacity }
        ] as any;
      }}
    />
  );
};
