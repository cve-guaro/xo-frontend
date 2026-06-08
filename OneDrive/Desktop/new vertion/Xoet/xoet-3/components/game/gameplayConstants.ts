// components/game/gameplayConstants.ts
// Shared types, constants, and room configurations for gameplay screens.

export const BOARD_SIZE = 3;

export const DEMO_BOARD = ["O", "_", "X", "_", "O", "_", "X", "_", "_"] as const;

export type RoomConfig = {
  id: "R1" | "R2" | "R3";
  rangeLabel: string;
  titleEn: string;
  titleAm: string;
  cut: number;
  time: number;
  colors: [string, string];
  amountOptions: { amount: number; min: number; max: number; rangeLabel?: string; colors: [string, string] }[];
};

export type SheetStep = "ROOMS" | "AMOUNTS";

export const ROOMS: RoomConfig[] = [
  {
    id: "R1",
    rangeLabel: "10-100",
    titleEn: "Room 1",
    titleAm: "ክፍል 1",
    cut: 10,
    time: 30,
    colors: ["#8b5cf6", "#6d28d9"], // Premium Purple matching HTML
    amountOptions: [
      { amount: 25, min: 10, max: 25, rangeLabel: "10 - 25", colors: ["#8b5cf6", "#6d28d9"] },
      { amount: 50, min: 25, max: 50, rangeLabel: "25 - 50", colors: ["#8b5cf6", "#6d28d9"] },
      { amount: 100, min: 50, max: 100, rangeLabel: "50 - 100", colors: ["#8b5cf6", "#6d28d9"] },
    ],
  },
  {
    id: "R2",
    rangeLabel: "100-1000",
    titleEn: "Room 2",
    titleAm: "ክፍል 2",
    cut: 10,
    time: 30,
    colors: ["#3b82f6", "#2563eb"], // Blue
    amountOptions: [
      { amount: 250, min: 100, max: 250, rangeLabel: "100 - 250", colors: ["#3b82f6", "#2563eb"] },
      { amount: 500, min: 250, max: 500, rangeLabel: "250 - 500", colors: ["#3b82f6", "#2563eb"] },
      { amount: 1000, min: 500, max: 1000, rangeLabel: "500 - 1000", colors: ["#3b82f6", "#2563eb"] },
    ],
  },
  {
    id: "R3",
    rangeLabel: "1000-10000",
    titleEn: "Room 3",
    titleAm: "ክፍል 3",
    cut: 10,
    time: 30,
    colors: ["#06b6d4", "#0891b2"], // Cyan
    amountOptions: [
      { amount: 2500, min: 1000, max: 2500, rangeLabel: "1000 - 2500", colors: ["#06b6d4", "#0891b2"] },
      { amount: 5000, min: 2500, max: 5000, rangeLabel: "2500 - 5000", colors: ["#06b6d4", "#0891b2"] },
      { amount: 7500, min: 5000, max: 7500, rangeLabel: "5000 - 7500", colors: ["#06b6d4", "#0891b2"] },
      { amount: 10000, min: 10000, max: 10000, rangeLabel: "10000 (itself)", colors: ["#06b6d4", "#0891b2"] },
    ],
  },
];
