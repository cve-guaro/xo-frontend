// constants/adminTheme.ts
// Decoupled admin theme tokens and context to prevent circular require cycles
import { createContext, useContext } from 'react';

export type AdminThemeMode = 'dark' | 'light';

export const DarkAdminTheme = {
  mode: 'dark' as AdminThemeMode,
  primary: '#FF2D55', // Authentic XO Coral Crimson Red
  primaryContainer: 'rgba(255, 45, 85, 0.15)',
  secondary: '#10B981', // Emerald for active, online, normal
  tertiaryDim: '#8292A6',
  tertiary: '#FF2D55',
  background: '#070C16', // Sleek dark navy black canvas from reference mockups
  surface: '#0C1424', // Card background from mockups
  surfaceContainerLowest: '#060A13', // Deepest dark container / inputs / sidebar
  surfaceContainerLow: '#09101E',
  surfaceContainer: '#0C1424',
  surfaceContainerHigh: '#111C30',
  surfaceContainerHighest: '#152238', // Table header & badge background
  border: '#19273E', // Clean subtle borders from mockups
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#8292A6',
  outlineVariant: '#19273E',
  error: '#FB5454',
  errorContainer: '#4B1A1A',
  lightPrimary: 'rgba(255, 45, 85, 0.12)',
  success: '#10B981',
  accentViolet: '#FF2D55',
  accentCyan: '#06B6D4',
  accentGold: '#F59E0B',
  accentGreen: '#10B981',
  badgeRotation: ['#FF2D55', '#10B981', '#F59E0B', '#64748B'],
};

export const LightAdminTheme = {
  mode: 'light' as AdminThemeMode,
  primary: '#E11D48', // XO Deep Crimson
  primaryContainer: '#FFE4E6',
  secondary: '#10B981',
  tertiaryDim: '#64748B',
  tertiary: '#E11D48',
  background: '#F8FAFC', // Crisp clean light canvas
  surface: '#FFFFFF', // Pure white card
  surfaceContainerLowest: '#FFFFFF', // Topbar / sidebar / card
  surfaceContainerLow: '#F8FAFC',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#F1F5F9',
  surfaceContainerHighest: '#F1F5F9', // Table header & inputs
  border: '#E2E8F0', // Clean light border
  onSurface: '#0F172A', // Deep dark slate text (100% readable)
  onSurfaceVariant: '#64748B',
  outlineVariant: '#E2E8F0',
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  lightPrimary: 'rgba(225, 29, 72, 0.08)',
  success: '#10B981',
  accentViolet: '#E11D48',
  accentCyan: '#0891B2',
  accentGold: '#D97706',
  accentGreen: '#10B981',
  badgeRotation: ['#E11D48', '#10B981', '#D97706', '#64748B'],
};

export const AdminTheme = DarkAdminTheme; // default/fallback

export interface AdminThemeContextType {
  mode: AdminThemeMode;
  theme: typeof DarkAdminTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

export const AdminThemeContext = createContext<AdminThemeContextType>({
  mode: 'dark',
  theme: DarkAdminTheme,
  isDark: true,
  toggleTheme: () => {},
});

export const useAdminTheme = () => useContext(AdminThemeContext);
