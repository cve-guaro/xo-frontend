// constants/adminTheme.ts
// Decoupled admin theme tokens and context to prevent circular require cycles.
// Palette ported 1:1 from the reference admin dashboard (src/index.css):
//   brand #ff1744 · canvas #f7f8f8/#070a12 · surface #ffffff/#0d1320
//   surface-2 #f6f7f7/#121b2b · surface-3 #eff1f1/#1a2638
//   hair #eff0f0/#182234 · ink #242629/#f7f9fc · ink-2 #666b70/#bbc7d6 · ink-3 #9ba0a4/#8291a5
//   positive #169e6c/#53cd96 · gold #e7a253/#efb16c · coral #e46a67/#ff7888 · electric-blue #00bfff
// Field names are kept identical to the original so the 20 admin screens that
// read theme.* keep compiling unchanged; only the values were corrected.
import { createContext, useContext } from 'react';

export type AdminThemeMode = 'dark' | 'light';

export const DarkAdminTheme = {
  mode: 'dark' as AdminThemeMode,
  primary: '#ff1744', // brand
  primaryContainer: 'rgba(255, 23, 68, 0.12)', // brand-soft
  secondary: '#53cd96', // positive
  tertiaryDim: '#8291a5', // ink-3
  tertiary: '#ff4568', // brand-2
  background: '#070a12', // canvas
  surface: '#0d1320', // surface
  surfaceContainerLowest: '#070a12', // canvas / sidebar / inputs
  surfaceContainerLow: '#121b2b', // surface-2
  surfaceContainer: '#0d1320', // surface
  surfaceContainerHigh: '#1a2638', // surface-3
  surfaceContainerHighest: '#1a2638', // table header & badges
  border: '#182234', // hair
  onSurface: '#f7f9fc', // ink
  onSurfaceVariant: '#bbc7d6', // ink-2
  outlineVariant: '#28374b', // hair-2
  error: '#ff7888', // coral
  errorContainer: 'rgba(255, 120, 136, 0.12)',
  lightPrimary: 'rgba(255, 23, 68, 0.12)',
  success: '#53cd96', // positive
  accentViolet: '#ff1744', // brand
  accentCyan: '#00bfff', // electric-blue
  accentGold: '#efb16c', // gold
  accentGreen: '#53cd96', // positive
  badgeRotation: ['#ff1744', '#53cd96', '#efb16c', '#8291a5'],
};

export const LightAdminTheme = {
  mode: 'light' as AdminThemeMode,
  primary: '#ff1744', // brand
  primaryContainer: '#fff0f3', // brand-soft
  secondary: '#169e6c', // positive
  tertiaryDim: '#9ba0a4', // ink-3
  tertiary: '#d80e36', // brand-2
  background: '#f7f8f8', // canvas
  surface: '#ffffff', // surface
  surfaceContainerLowest: '#ffffff', // topbar / sidebar / card
  surfaceContainerLow: '#f6f7f7', // surface-2
  surfaceContainer: '#ffffff', // surface
  surfaceContainerHigh: '#eff1f1', // surface-3
  surfaceContainerHighest: '#eff1f1', // table header & inputs
  border: '#eff0f0', // hair
  onSurface: '#242629', // ink
  onSurfaceVariant: '#666b70', // ink-2
  outlineVariant: '#e4e7e7', // hair-2
  error: '#e46a67', // coral
  errorContainer: '#fdecec',
  lightPrimary: 'rgba(255, 23, 68, 0.06)',
  success: '#169e6c', // positive
  accentViolet: '#ff1744', // brand
  accentCyan: '#00bfff', // electric-blue
  accentGold: '#e7a253', // gold
  accentGreen: '#169e6c', // positive
  badgeRotation: ['#ff1744', '#169e6c', '#e7a253', '#9ba0a4'],
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