// components/ui/AnimatedXoetLogo.tsx
// XO ET Animated Logo — Minimal Draw (Continuous Loop)
import React from "react";
import { View, Image, Platform, StyleSheet } from "react-native";

const LOGO_CSS = `
.xoet-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 380px;
}
.xoet-logo {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}
.xoet-x-group,
.xoet-o-group,
.xoet-et-group,
.xoet-et-e,
.xoet-et-t {
  transform-box: fill-box;
  transform-origin: center;
}
.xoet-x1-stroke {
  stroke-dasharray: 245;
  animation: xoet-draw-x1-loop 3.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.xoet-x2-stroke {
  stroke-dasharray: 245;
  animation: xoet-draw-x2-loop 3.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.xoet-o-stroke {
  stroke-dasharray: 392;
  animation: xoet-draw-o-loop 3.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}
.xoet-x-group {
  animation: xoet-glow-x-loop 3.8s ease-in-out infinite;
}
.xoet-o-group {
  animation: xoet-glow-o-loop 3.8s ease-in-out infinite;
}
.xoet-et-group {
  animation: xoet-glow-et-loop 3.8s ease-in-out infinite;
}
.xoet-et-e {
  animation: xoet-et-e-loop 3.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
.xoet-et-t {
  animation: xoet-et-t-loop 3.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

@keyframes xoet-draw-x1-loop {
  0%, 2%    { stroke-dashoffset: 245; }
  16%, 78%  { stroke-dashoffset: 0; }
  92%, 100% { stroke-dashoffset: 245; }
}
@keyframes xoet-draw-x2-loop {
  0%, 7%    { stroke-dashoffset: 245; }
  21%, 76%  { stroke-dashoffset: 0; }
  90%, 100% { stroke-dashoffset: 245; }
}
@keyframes xoet-draw-o-loop {
  0%, 12%   { stroke-dashoffset: 392; }
  33%, 75%  { stroke-dashoffset: 0; }
  90%, 100% { stroke-dashoffset: 392; }
}
@keyframes xoet-glow-x-loop {
  0%, 18%, 88%, 100% { filter: drop-shadow(0 0 0px rgba(255, 23, 68, 0)); }
  38%, 74% { filter: drop-shadow(0 0 13px rgba(255, 23, 68, 0.58)) drop-shadow(0 0 30px rgba(255, 23, 68, 0.26)); }
}
@keyframes xoet-glow-o-loop {
  0%, 25%, 86%, 100% { filter: drop-shadow(0 0 0px rgba(0, 168, 255, 0)); }
  44%, 74% { filter: drop-shadow(0 0 13px rgba(0, 168, 255, 0.58)) drop-shadow(0 0 30px rgba(0, 168, 255, 0.26)); }
}
@keyframes xoet-glow-et-loop {
  0%, 28%, 85%, 100% { filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0)); }
  46%, 74% { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.22)); }
}
@keyframes xoet-et-e-loop {
  0%, 29%   { opacity: 0; transform: translate(-4px, 38px); }
  46%, 74%  { opacity: 1; transform: translate(0, 0); }
  85%, 100% { opacity: 0; transform: translate(-2px, 28px); }
}
@keyframes xoet-et-t-loop {
  0%, 29%   { opacity: 0; transform: translate(4px, 38px); }
  46%, 74%  { opacity: 1; transform: translate(0, 0); }
  85%, 100% { opacity: 0; transform: translate(2px, 28px); }
}
`;

const LOGO_HTML = `<style>${LOGO_CSS}</style>
<div class="xoet-wrap" style="max-width:100%">
<svg class="xoet-logo" viewBox="0 0 402 296" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="XO ET Logo">
  <defs>
    <clipPath id="xoet-x1-clip">
      <polygon points="50,42 102,42 218,198 166,198" />
    </clipPath>
    <clipPath id="xoet-x2-clip">
      <polygon points="166,42 218,42 102,198 50,198" />
    </clipPath>
    <clipPath id="xoet-et-mask">
      <rect x="142" y="216" width="118" height="42" />
    </clipPath>
  </defs>
  <g class="xoet-x-group">
    <g clip-path="url(#xoet-x1-clip)">
      <line class="xoet-x1-stroke" x1="64" y1="26" x2="204" y2="214" stroke="#FF1744" stroke-width="64" stroke-linecap="butt" />
    </g>
    <g clip-path="url(#xoet-x2-clip)">
      <line class="xoet-x2-stroke" x1="204" y1="26" x2="64" y2="214" stroke="#FF1744" stroke-width="64" stroke-linecap="butt" />
    </g>
  </g>
  <g class="xoet-o-group">
    <circle class="xoet-o-stroke" cx="270" cy="120" r="62" fill="none" stroke="#00A8FF" stroke-width="40" transform="rotate(-90 270 120)" />
  </g>
  <g class="xoet-et-group">
    <g clip-path="url(#xoet-et-mask)">
      <path class="xoet-et-e" d="M158 220 H195 V228 H169 V233.25 H191 V240.75 H169 V246 H195 V254 H158 Z" fill="#FFFFFF" />
      <path class="xoet-et-t" d="M204 220 H244 V228.5 H230 V254 H218 V228.5 H204 Z" fill="#FFFFFF" />
    </g>
  </g>
</svg>
</div>`;

export function AnimatedXoetLogo({ maxWidth = 240 }: { maxWidth?: number }) {
  if (Platform.OS === "web") {
    return (
      <View style={[styles.webContainer, { width: maxWidth, maxWidth }]}>
        <div
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: LOGO_HTML }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.nativeFallback, { width: Math.min(maxWidth, 120), height: Math.min(maxWidth, 120) }]}>
      <Image
        source={require("../../assets/images/icon.jpg")}
        style={styles.nativeImg}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  nativeFallback: {
    borderRadius: 24,
    overflow: "hidden",
  },
  nativeImg: {
    width: "100%",
    height: "100%",
  },
});

export default AnimatedXoetLogo;
