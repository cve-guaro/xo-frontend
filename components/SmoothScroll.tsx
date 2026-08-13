// xoet-3/components/SmoothScroll.tsx
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

export function SmoothScroll({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    let lenisInstance: any = null;
    let animationFrameId: number | null = null;

    // Dynamically load Lenis to keep native bundle clean
    import('lenis').then((LenisModule) => {
      const Lenis = LenisModule.default || LenisModule;
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
      });

      function raf(time: number) {
        lenisInstance?.raf(time);
        animationFrameId = requestAnimationFrame(raf);
      }

      animationFrameId = requestAnimationFrame(raf);
    }).catch((err) => {
      console.warn('[Lenis] Could not initialize Lenis smooth scrolling:', err);
    });

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (lenisInstance) {
        lenisInstance.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}
