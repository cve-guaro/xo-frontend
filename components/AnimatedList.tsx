// components/AnimatedList.tsx
import React from 'react';
import { View, TouchableOpacity, ScrollView, Platform } from 'react-native';

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactElement;
  onItemSelect?: (item: T) => void;
  initialSelectedIndex?: number;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  refreshControl?: any;
  className?: string;
}

function AnimatedList<T>({
  items = [],
  renderItem,
  onItemSelect,
  initialSelectedIndex,
  showGradients,
  enableArrowNavigation,
  refreshControl,
  ...props
}: AnimatedListProps<T> & Record<string, any>) {
  const [selectedIndex, setSelectedIndex] = React.useState(initialSelectedIndex ?? -1);

  const handleSelect = React.useCallback((item: T, index: number) => {
    setSelectedIndex(index);
    onItemSelect?.(item);
  }, [onItemSelect]);

  return (
    <View style={{ flex: 1 }}>
      {items.map((item: T, index: number) => {
        const isSelected = index === selectedIndex;
        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => handleSelect(item, index)}
            style={{ marginBottom: 0 }}
          >
            {renderItem(item, index, isSelected)}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default AnimatedList;
