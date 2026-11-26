// components/ui/confetti.tsx
// High-performance universal celebration confetti engine for XOET.
// Works seamlessly in React Native Web (browser) and Native environments.
// Provides side cannons, fireworks, gold stars, and celebratory bursts on player win.
import React, {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Platform, View, StyleSheet, TouchableOpacity, Text } from "react-native";

export type ConfettiOptions = {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  ticks?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  shapes?: ("square" | "circle" | "star")[];
  scalar?: number;
  zIndex?: number;
};

export type ConfettiGlobalOptions = {
  resize?: boolean;
  useWorker?: boolean;
};

type Api = {
  fire: (options?: ConfettiOptions) => void;
};

export type ConfettiRef = Api | null;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  shape: "square" | "circle" | "star";
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  decay: number;
  gravity: number;
  ticks: number;
}

// Global singleton canvas for full-screen celebration bursts
let globalCanvas: any = null;
let activeParticles: Particle[] = [];
let animFrameId: number | null = null;

const DEFAULT_COLORS = ["#00DAF3", "#FF3B57", "#FFD200", "#10B981", "#8B5CF6", "#F59E0B", "#FFFFFF"];

function getCanvas(): any {
  if (Platform.OS !== "web") return null;
  if (typeof document === "undefined") return null;

  if (!globalCanvas) {
    globalCanvas = document.createElement("canvas");
    globalCanvas.id = "xoet-confetti-canvas";
    globalCanvas.style.position = "fixed";
    globalCanvas.style.top = "0";
    globalCanvas.style.left = "0";
    globalCanvas.style.width = "100vw";
    globalCanvas.style.height = "100vh";
    globalCanvas.style.pointerEvents = "none";
    globalCanvas.style.zIndex = "999999";
    document.body.appendChild(globalCanvas);

    const resize = () => {
      if (globalCanvas) {
        globalCanvas.width = window.innerWidth * window.devicePixelRatio;
        globalCanvas.height = window.innerHeight * window.devicePixelRatio;
      }
    };
    window.addEventListener("resize", resize);
    resize();
  }
  return globalCanvas;
}

function runAnimationLoop() {
  if (animFrameId !== null) return;

  const step = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const remaining: Particle[] = [];

    for (let i = 0; i < activeParticles.length; i++) {
      const p = activeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.decay;
      p.vy *= p.decay;
      p.rotation += p.rotationSpeed;
      p.alpha -= 0.012;
      p.ticks--;

      if (p.alpha > 0 && p.ticks > 0 && p.y < window.innerHeight + 100) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "star") {
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            ctx.lineTo(
              Math.cos(((18 + s * 72) * Math.PI) / 180) * p.size,
              -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.size
            );
            ctx.lineTo(
              Math.cos(((54 + s * 72) * Math.PI) / 180) * (p.size / 2),
              -Math.sin(((54 + s * 72) * Math.PI) / 180) * (p.size / 2)
            );
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        ctx.restore();
        remaining.push(p);
      }
    }

    ctx.restore();
    activeParticles = remaining;

    if (activeParticles.length > 0) {
      animFrameId = requestAnimationFrame(step);
    } else {
      animFrameId = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  animFrameId = requestAnimationFrame(step);
}

/**
 * Universal confetti explosion trigger
 */
export function fireConfetti(options: ConfettiOptions = {}) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;

  const canvas = getCanvas();
  if (!canvas) return;

  const count = options.particleCount ?? 50;
  const angle = (options.angle ?? 90) * (Math.PI / 180);
  const spread = (options.spread ?? 60) * (Math.PI / 180);
  const startVelocity = options.startVelocity ?? 45;
  const decay = options.decay ?? 0.94;
  const gravity = options.gravity ?? 0.6;
  const colors = options.colors ?? DEFAULT_COLORS;
  const shapes = options.shapes ?? ["square", "circle"];
  const scalar = options.scalar ?? 1;
  const ticks = options.ticks ?? 180;

  const originX = (options.origin?.x ?? 0.5) * window.innerWidth;
  const originY = (options.origin?.y ?? 0.5) * window.innerHeight;

  for (let i = 0; i < count; i++) {
    const pAngle = angle + (Math.random() - 0.5) * spread;
    const pSpeed = startVelocity * (0.6 + Math.random() * 0.8);
    const vx = Math.cos(pAngle) * pSpeed;
    const vy = -Math.sin(pAngle) * pSpeed;

    activeParticles.push({
      x: originX,
      y: originY,
      vx,
      vy,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: (8 + Math.random() * 6) * scalar,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      alpha: 1,
      decay,
      gravity,
      ticks,
    });
  }

  runAnimationLoop();
}

/**
 * Trigger Grand Win Celebration: Side Cannons + Gold Stars + Fireworks
 * Designed specifically for XOET match wins, wheel jackpot, and victory popups!
 */
export function triggerWinCelebration() {
  if (Platform.OS !== "web") return;

  // 1. Left Cannon Burst
  fireConfetti({
    particleCount: 60,
    angle: 60,
    spread: 60,
    startVelocity: 55,
    origin: { x: 0.05, y: 0.65 },
    colors: ["#00DAF3", "#FFD200", "#FF3B57", "#10B981"],
  });

  // 2. Right Cannon Burst
  fireConfetti({
    particleCount: 60,
    angle: 120,
    spread: 60,
    startVelocity: 55,
    origin: { x: 0.95, y: 0.65 },
    colors: ["#00DAF3", "#FFD200", "#FF3B57", "#10B981"],
  });

  // 3. Gold Stars Shower (center burst)
  setTimeout(() => {
    fireConfetti({
      particleCount: 50,
      angle: 90,
      spread: 120,
      startVelocity: 40,
      origin: { x: 0.5, y: 0.4 },
      shapes: ["star", "circle"],
      colors: ["#FFE400", "#FFBD00", "#FFCA6C", "#FFFFFF", "#00DAF3"],
      scalar: 1.3,
    });
  }, 250);

  // 4. Grand Finale Fireworks (top burst)
  setTimeout(() => {
    fireConfetti({
      particleCount: 45,
      angle: 90,
      spread: 360,
      startVelocity: 35,
      origin: { x: 0.35, y: 0.3 },
      colors: ["#FF3B57", "#FFD200", "#00DAF3"],
    });
    fireConfetti({
      particleCount: 45,
      angle: 90,
      spread: 360,
      startVelocity: 35,
      origin: { x: 0.65, y: 0.3 },
      colors: ["#10B981", "#FFD200", "#FFFFFF"],
    });
  }, 500);
}

// ── Component API Matching User Specification ──

const ConfettiContext = createContext<Api>({} as Api);

interface Props {
  options?: ConfettiOptions;
  globalOptions?: ConfettiGlobalOptions;
  manualstart?: boolean;
  children?: React.ReactNode;
  style?: any;
}

export const Confetti = forwardRef<ConfettiRef, Props>((props, ref) => {
  const { options, manualstart = false, children, style } = props;

  const fire = useCallback(
    (opts: ConfettiOptions = {}) => {
      fireConfetti({ ...options, ...opts });
    },
    [options]
  );

  const api = useMemo(() => ({ fire }), [fire]);
  useImperativeHandle(ref, () => api, [api]);

  useEffect(() => {
    if (!manualstart) {
      fire();
    }
  }, [manualstart, fire]);

  return (
    <ConfettiContext.Provider value={api}>
      <View style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }, style]}>
        {children}
      </View>
    </ConfettiContext.Provider>
  );
});

Confetti.displayName = "Confetti";

export function ConfettiButton({
  options,
  children,
  onPress,
  style,
}: {
  options?: ConfettiOptions;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const handlePress = () => {
    fireConfetti(options);
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#00DAF3" }, style]}
      activeOpacity={0.8}
    >
      <Text style={{ color: "#080C14", fontWeight: "800", fontSize: 14 }}>
        {children || "Celebrate 🎉"}
      </Text>
    </TouchableOpacity>
  );
}

export default Confetti;
