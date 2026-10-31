import { Easing } from "react-native";
import { BEZIER } from "./tokens";

/** Enter = ease-out (fast start, soft land). Exit = ease-in (soft start, quick leave).
 *  `inOut` is for opacity/colour changes only, 200ms or less. */
export const EASE = {
  out: Easing.bezier(...BEZIER.out),
  in: Easing.bezier(...BEZIER.in),
  inOut: Easing.inOut(Easing.ease),
} as const;
