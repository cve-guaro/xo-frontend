// components/AnimatedList.native.tsx
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, RefreshControlProps } from 'react-native';

interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onItemSelect?: (item: T, index: number) => void;
  className?: string;
  itemClassName?: string;
  initialSelectedIndex?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function AnimatedList<T>(props: AnimatedListProps<T>) {
  const {
    items = [],
    renderItem,
    onItemSelect,
    initialSelectedIndex = -1,
  } = props;
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

  const handlePress = (item: T, index: number) => {
    setSelectedIndex(index);
    if (onItemSelect) {
      onItemSelect(item, index);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} refreshControl={props.refreshControl}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handlePress(item, index)}
            activeOpacity={0.7}
            style={[
              styles.item,
              selectedIndex === index && styles.selectedItem
            ]}
          >
            {renderItem(item, index, selectedIndex === index)}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  item: {
    padding: 12,
    backgroundColor: 'rgba(23, 23, 50, 0.4)',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    marginBottom: 12,
    borderRadius: 8,
  },
  selectedItem: {
    backgroundColor: 'rgba(0, 218, 243, 0.05)',
    borderLeftColor: '#00daf3',
  },
});
