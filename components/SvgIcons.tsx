// components/SvgIcons.tsx
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
}

export const SparklesIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <Path d="m5 5 2.5 2.5M16.5 16.5 19 19M5 19l2.5-2.5M16.5 7.5 19 5" />
    <Circle cx="12" cy="12" r="3" fill="none" />
  </Svg>
);

export const ArrowForwardIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12h14M12 5l7 7-7 7" />
  </Svg>
);

export const CheckmarkCircleIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Path d="m22 4-10 10.01-3-3" />
  </Svg>
);

export const ServerIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="2" y="2" width="20" height="6" rx="2" />
    <Rect x="2" y="9" width="20" height="6" rx="2" />
    <Rect x="2" y="16" width="20" height="6" rx="2" />
    <Path d="M6 5h.01M6 12h.01M6 19h.01" strokeWidth={3} />
  </Svg>
);

export const ConstructIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Svg>
);

export const CloudOfflineIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5l14 14" />
    <Path d="M5.13 5.13A6.5 6.5 0 0 0 3 10a5 5 0 0 0 5 5h3.14" />
  </Svg>
);

export const WifiIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 20h.01" strokeWidth={3} />
    <Path d="M8.5 16.5a5 5 0 0 1 7 0" />
    <Path d="M5 13a10 10 0 0 1 14 0" />
    <Path d="M1.5 9.5a15 15 0 0 1 21 0" />
  </Svg>
);

export const EllipseIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="4" fill={color} />
  </Svg>
);

export const RefreshIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M23 4v6h-6" />
    <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </Svg>
);

export const AlertCircleIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="8" x2="12" y2="12" />
    <Line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={3} />
  </Svg>
);

export const CloseIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="6" x2="6" y2="18" />
    <Line x1="6" y1="6" x2="18" y2="18" />
  </Svg>
);

export const InfoIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Line x1="12" y1="16" x2="12" y2="12" />
    <Line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={3} />
  </Svg>
);

export const WarningIcon = ({ size = 24, color = "#fff" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <Line x1="12" y1="9" x2="12" y2="13" />
    <Line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={3} />
  </Svg>
);
