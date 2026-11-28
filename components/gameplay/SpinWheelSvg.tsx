import React from "react";
import Svg, { Circle, Path, G, Text as SvgText, Defs, RadialGradient, Stop } from "react-native-svg";

const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
};

const getArcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y, "Z"].join(" ");
};

export function SpinWheelSvg({
  size,
  faded,
  mode,
  hidePointer,
}: {
  size: number;
  faded?: boolean;
  mode?: "5_PLAYER" | "RAIL";
  hidePointer?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.4;

  const sectors =
    mode === "RAIL"
      ? [
          { value: "15%", sub: "Bonus", color: "#a855f7", angle: 54 },
          { value: "25%", sub: "Bonus", color: "#22c55e", angle: 90 },
          { value: "10%", sub: "Bonus", color: "#22d3ee", angle: 36 },
          { value: "35%", sub: "Bonus", color: "#f97316", angle: 126 },
          { value: "15%", sub: "Bonus", color: "#ef4444", angle: 54 },
        ]
      : [
          { value: "20%", sub: "Bonus", color: "#22d3ee", angle: 72 },
          { value: "20%", sub: "Bonus", color: "#f97316", angle: 72 },
          { value: "20%", sub: "Bonus", color: "#ef4444", angle: 72 },
          { value: "20%", sub: "Bonus", color: "#a855f7", angle: 72 },
          { value: "20%", sub: "Bonus", color: "#22c55e", angle: 72 },
        ];

  let accumulatedAngle = 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity: faded ? 0.35 : 1 }}>
      {!faded && (
        <Defs>
          <RadialGradient id="wheelGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
            <Stop offset="70%" stopColor="#7c3aed" stopOpacity={0.1} />
            <Stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </RadialGradient>
        </Defs>
      )}
      {!faded && <Circle cx={cx} cy={cy} r={r * 1.35} fill="url(#wheelGlow)" />}
      <G>
        {sectors.map((sec, idx) => {
          const startAngle = accumulatedAngle;
          const endAngle = accumulatedAngle + sec.angle;
          accumulatedAngle = endAngle;
          const textAngle = startAngle + sec.angle / 2;
          const textPos = polarToCartesian(cx, cy, r * 0.68, textAngle);
          const subPos = polarToCartesian(cx, cy, r * 0.48, textAngle);
          return (
            <G key={idx}>
              <Path d={getArcPath(cx, cy, r, startAngle, endAngle)} fill={sec.color} stroke="#0f1122" strokeWidth={1.8} />
              {!faded && (
                <>
                  <SvgText
                    x={textPos.x}
                    y={textPos.y}
                    fill="#ffffff"
                    fontSize={size * 0.048}
                    fontWeight="900"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {sec.value}
                  </SvgText>
                  <SvgText
                    x={subPos.x}
                    y={subPos.y}
                    fill="rgba(255,255,255,0.85)"
                    fontSize={size * 0.03}
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {sec.sub}
                  </SvgText>
                </>
              )}
            </G>
          );
        })}
      </G>

      <Circle cx={cx} cy={cy} r={r * 0.98} stroke="#f5b642" strokeWidth={size * 0.05} fill="none" />
      <Circle cx={cx} cy={cy} r={r * 1.01} stroke="#c59b27" strokeWidth={size * 0.008} fill="none" />
      <Circle cx={cx} cy={cy} r={r * 0.95} stroke="#c59b27" strokeWidth={size * 0.008} fill="none" />

      {Array.from({ length: 18 }).map((_, idx) => {
        const angle = idx * 20;
        const pos = polarToCartesian(cx, cy, r * 0.98, angle);
        return (
          <G key={idx}>
            <Circle cx={pos.x} cy={pos.y} r={size * 0.018} fill="#fef08a" stroke="#ca8a04" strokeWidth={0.8} />
            <Circle cx={pos.x} cy={pos.y} r={size * 0.009} fill="#ffffff" />
          </G>
        );
      })}

      <Circle cx={cx} cy={cy} r={r * 0.26} fill="#141126" stroke="#f5b642" strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={r * 0.22} fill="#0d0b1a" stroke="#ffe599" strokeWidth={1} />
      {!faded && (
        <SvgText
          x={cx}
          y={cy + 1}
          fill="#f5b642"
          fontSize={size * 0.045}
          fontWeight="900"
          textAnchor="middle"
          alignmentBaseline="middle"
          letterSpacing={1}
        >
          SPIN
        </SvgText>
      )}

      {!faded && !hidePointer && (
        <G transform={`rotate(180, ${cx}, ${cy - r * 1.02})`}>
          <Path
            d={`M ${cx} ${cy - r * 1.02} L ${cx - 12} ${cy - r * 1.16} L ${cx + 12} ${cy - r * 1.16} Z`}
            fill="#f5b642"
            stroke="#c59b27"
            strokeWidth={1.5}
          />
        </G>
      )}
    </Svg>
  );
}
