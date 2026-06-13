// components/game/BoardDemo.tsx
// Static tic-tac-toe board preview used on the landing/gameplay screen.
import React, { memo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { DEMO_BOARD } from "./gameplayConstants";

const BoardDemo = memo(function BoardDemo({ isDesktop }: { isDesktop: boolean }) {
  const { width } = useWindowDimensions();
  // Adjust sizing dynamically: max 260px on desktop, scaling down based on viewport on mobile/tablet
  const BOARD_DIM = isDesktop ? 320 : Math.min(width - 90, 280);
  const FONT_SIZE = BOARD_DIM * 0.22;

  return (
    <View style={[styles.neonBoard, { width: BOARD_DIM, height: BOARD_DIM }]}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.neonBoardRow}>
          {[0, 1, 2].map((col) => {
            const idx = row * 3 + col;
            const cell = DEMO_BOARD[idx];
            return (
              <View key={col} style={styles.neonCell}>
                {cell !== "_" && (
                  <Text style={[
                    styles.cellText,
                    cell === "O" ? styles.neonOText : styles.neonXText,
                    { fontSize: FONT_SIZE }
                  ]}>{cell}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
});

export default BoardDemo;

const styles = StyleSheet.create({
  neonBoard: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 8,
  },
  neonBoardRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  neonCell: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 54,
    fontWeight: '900',
  },
  neonOText: {
    color: '#00f0ff',
    textShadowColor: 'rgba(0, 240, 255, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  neonXText: {
    color: '#ff2d55',
    textShadowColor: 'rgba(255, 45, 85, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
});
