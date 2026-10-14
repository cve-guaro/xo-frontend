// xoet-3/components/SmoothScroll.tsx
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

export function SmoothScroll({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    // Inject global styles for smooth scrolling and clean scrollbars across PC browsers
    const styleId = 'xoet-pc-smooth-scroll-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        html, body, #root, #__next {
          height: 100%;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          -webkit-tap-highlight-color: transparent;
        }

        /* Enable mouse wheel scrolling on all React Native Web scroll containers */
        div[style*="overflow-y: auto"],
        div[style*="overflow-y: scroll"],
        div[style*="overflow: auto"],
        div[style*="overflow: scroll"],
        .r-overflowY-156q2ks,
        .r-overflowY-10508g7,
        .r-overflow-1udh08x,
        [data-focusable="true"],
        [tabindex] {
          scroll-behavior: smooth;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
          touch-action: pan-y !important;
        }

        /* Modern subtle scrollbars for desktop */
        ::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(13, 18, 32, 0.6);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.35);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 58, 237, 0.65);
        }

        /* Eliminates 300ms tap delay and tap highlights across mobile browsers */
        button,
        [role="button"],
        a,
        input,
        select,
        textarea,
        [tabindex],
        .r-cursor-pointer {
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        /* Fluid Interactive Micro-Motion: silky smooth button feel */
        [role="button"],
        button,
        a,
        .r-cursor-pointer {
          transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      filter 0.16s ease,
                      background-color 0.18s ease,
                      border-color 0.18s ease;
          user-select: none;
          -webkit-user-select: none;
        }

        /* Responsive hover lift on devices that support hover */
        @media (hover: hover) and (pointer: fine) {
          [role="button"]:hover,
          button:hover {
            filter: brightness(1.06);
          }
        }

        /* Tactile bouncy click feedback without conflicting with complex animated matrices */
        [role="button"]:active,
        button:active,
        a:active {
          filter: brightness(0.95);
        }

        /* Subtle floating animations */
        @keyframes softFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        /* Pulsing indicator for turn indicator dots on game board */
        @keyframes turnDotPulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
            box-shadow: 0 0 10px #00daf3, 0 0 20px #00daf3;
          }
        }

        /* Pulsing indicator for live rooms */
        @keyframes liveGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }

        /* CTA button glowing sheen */
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 4px 18px rgba(124, 58, 237, 0.45); }
          50% { box-shadow: 0 6px 26px rgba(124, 58, 237, 0.75), 0 0 16px rgba(0, 218, 243, 0.35); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return <>{children}</>;
}
