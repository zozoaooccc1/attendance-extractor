import { Dimensions, PixelRatio } from 'react-native';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const screenWidth = SCREEN_W;
export const screenHeight = SCREEN_H;

export function scale(size: number): number {
  return Math.round((size * SCREEN_W) / BASE_WIDTH);
}

export function verticalScale(size: number): number {
  return Math.round((size * SCREEN_H) / BASE_HEIGHT);
}

export function moderateScale(size: number, factor = 0.45): number {
  return Math.round(size + (scale(size) - size) * factor);
}

export function clampFont(size: number, min: number, max: number): number {
  return Math.min(Math.max(moderateScale(size, 0.35), min), max);
}

export function wp(percentage: number): number {
  return Math.round((percentage / 100) * SCREEN_W);
}

export function hp(percentage: number): number {
  return Math.round((percentage / 100) * SCREEN_H);
}

export const isSmallScreen = SCREEN_W < 375;
export const isLargeScreen = SCREEN_W >= 428;

export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(14),
  lg: moderateScale(20),
  xl: moderateScale(28),
};

export const fontSize = {
  xs: clampFont(10, 9, 12),
  sm: clampFont(12, 11, 14),
  base: clampFont(14, 13, 16),
  md: clampFont(15, 14, 17),
  lg: clampFont(16, 15, 18),
  xl: clampFont(18, 16, 20),
  '2xl': clampFont(20, 18, 24),
  '3xl': clampFont(24, 20, 28),
  '4xl': clampFont(28, 24, 34),
  display: clampFont(36, 30, 44),
  hero: clampFont(48, 38, 56),
};

export const iconSize = {
  sm: moderateScale(16),
  md: moderateScale(20),
  lg: moderateScale(24),
  xl: moderateScale(28),
};

export function buildFontSize(multiplier: number) {
  return {
    xs:      clampFont(10, 9, 12)  * multiplier,
    sm:      clampFont(12, 11, 14) * multiplier,
    base:    clampFont(14, 13, 16) * multiplier,
    md:      clampFont(15, 14, 17) * multiplier,
    lg:      clampFont(16, 15, 18) * multiplier,
    xl:      clampFont(18, 16, 20) * multiplier,
    '2xl':   clampFont(20, 18, 24) * multiplier,
    '3xl':   clampFont(24, 20, 28) * multiplier,
    '4xl':   clampFont(28, 24, 34) * multiplier,
    display: clampFont(36, 30, 44) * multiplier,
    hero:    clampFont(48, 38, 56) * multiplier,
  };
}
