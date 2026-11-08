import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  Platform,
  StyleSheet,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../lib/haptcs";

export interface CellSymbolProps {
  symbol: string;
  size: number;
  isDesktop: boolean;
  isWinning?: boolean;
}

export const CellSymbol = React.memo<CellSymbolProps>(({
  symbol,
  size,
  isDesktop,
  isWinning = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.2);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [symbol]);

  const isX = symbol === "X";
  const iconColor = isX ? "#ef4444" : "#00DAF3";
  const iconSize = isDesktop ? size * 0.8 : size * 0.85;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={isX ? "close" : "radio-button-off"}
        size={iconSize}
        color={iconColor}
        style={[
          isDesktop ? (isX ? styles.neonXShadow : styles.neonOShadow) : {},
          isWinning && {
            shadowColor: iconColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 18,
            elevation: 12,
          },
        ]}
      />
    </Animated.View>
  );
});

export interface BoardCellProps {
  index: number;
  symbol: string;
  isMyTurn: boolean;
  mySymbol: "X" | "O";
  cellSize: number;
  isDesktop: boolean;
  isWinning: boolean;
  onPress: (index: number) => void;
}

export const BoardCell = React.memo<BoardCellProps>(({
  index,
  symbol,
  isMyTurn,
  mySymbol,
  cellSize,
  isDesktop,
  isWinning,
  onPress,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const pressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (symbol === "_" && isMyTurn) {
      haptics.tap();
      Animated.spring(pressAnim, {
        toValue: 0.92,
        tension: 400,
        friction: 15,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 300,
      friction: 12,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };

  const isEmpty = symbol === "_";
  const canPlay = isEmpty && isMyTurn;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(index)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={Platform.OS === "web" && canPlay ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setIsHovered(false) : undefined}
      style={({ pressed }) => [
        styles.cell,
        isDesktop && { width: cellSize, height: cellSize, borderRadius: 28 },
        canPlay && styles.cellEmptyActive,
        canPlay && isHovered && {
          backgroundColor: mySymbol === "X" ? "rgba(239, 68, 68, 0.12)" : "rgba(0, 218, 243, 0.12)",
          borderColor: mySymbol === "X" ? "rgba(239, 68, 68, 0.45)" : "rgba(0, 218, 243, 0.45)",
          transform: [{ scale: 1.025 }],
        },
        isWinning && {
          borderColor: symbol === "X" ? "#ef4444" : "#00DAF3",
          backgroundColor: symbol === "X" ? "rgba(239, 68, 68, 0.22)" : "rgba(0, 218, 243, 0.22)",
          shadowColor: symbol === "X" ? "#ef4444" : "#00DAF3",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 16,
          elevation: 10,
        },
      ]}
    >
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressAnim }],
        }}
      >
        {!isEmpty ? (
          <CellSymbol
            symbol={symbol}
            size={cellSize}
            isDesktop={isDesktop}
            isWinning={isWinning}
          />
        ) : isHovered && canPlay ? (
          <View style={{ opacity: 0.28 }}>
            <Ionicons
              name={mySymbol === "X" ? "close" : "radio-button-off"}
              size={isDesktop ? cellSize * 0.75 : cellSize * 0.8}
              color={mySymbol === "X" ? "#ef4444" : "#00DAF3"}
            />
          </View>
        ) : canPlay ? (
          <View style={[styles.turnCellDot, { backgroundColor: "#fff", opacity: 0.85 }]} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: "rgba(12, 20, 46, 0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmptyActive: {
    borderColor: "rgba(0, 218, 243, 0.3)",
    backgroundColor: "rgba(12, 20, 46, 0.95)",
  },
  turnCellDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  neonXShadow: {
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  neonOShadow: {
    shadowColor: "#00DAF3",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
});

export default BoardCell;
