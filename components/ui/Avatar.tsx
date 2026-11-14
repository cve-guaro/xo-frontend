import React, { useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { API_URL } from '../../config';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: AvatarSize;
  showOnlineDot?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  cacheKey?: string | number;
}

const SIZE_MAP: Record<string, { size: number; fontSize: number }> = {
  xs: { size: 24, fontSize: 10 },
  sm: { size: 32, fontSize: 12 },
  md: { size: 40, fontSize: 14 },
  lg: { size: 48, fontSize: 18 },
  xl: { size: 64, fontSize: 24 },
  '2xl': { size: 96, fontSize: 36 },
};

/**
 * Universal single-source avatar URL resolver.
 * Handles null, relative paths (/uploads/...), local hosts, and cache-busting.
 */
export function resolveAvatarUrl(rawUrl?: string | null, apiBase: string = API_URL): string | null {
  if (!rawUrl) return null;
  let url = String(rawUrl).trim();
  if (!url) return null;

  // Relative backend path
  if (url.startsWith('/')) {
    url = `${apiBase.replace(/\/+$/, '')}${url}`;
  }

  // Swap localhost / 127.0.0.1 for current apiBase host if on a different device
  if (url.match(/https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?/i)) {
    url = url.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?/gi, apiBase.replace(/\/+$/, ''));
  }

  return url;
}

/**
 * Extracts 1-2 uppercase initials from a user's display name or username.
 */
export function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const clean = name.trim().replace(/^@/, '');
  if (!clean) return 'U';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  uri,
  name,
  size = 'md',
  showOnlineDot = false,
  style,
  imageStyle,
  cacheKey,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const { dimension, fontSize, dotSize } = useMemo(() => {
    let s = 40;
    let fs = 14;
    if (typeof size === 'number') {
      s = size;
      fs = Math.max(10, Math.round(size * 0.38));
    } else if (SIZE_MAP[size]) {
      s = SIZE_MAP[size].size;
      fs = SIZE_MAP[size].fontSize;
    }
    const ds = Math.max(7, Math.round(s * 0.25));
    return { dimension: s, fontSize: fs, dotSize: ds };
  }, [size]);

  const resolvedUri = useMemo(() => {
    const base = resolveAvatarUrl(uri);
    if (!base) return null;
    if (cacheKey) {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}t=${cacheKey}`;
    }
    return base;
  }, [uri, cacheKey]);

  const initials = useMemo(() => getInitials(name), [name]);

  const showImage = Boolean(resolvedUri && !hasError);

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
    >
      {showImage ? (
        <Image
          source={{ uri: resolvedUri! }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
            imageStyle,
          ]}
          onError={() => setHasError(true)}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.fallbackCircle,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              {
                fontSize,
                lineHeight: fontSize * 1.2,
              },
            ]}
            numberOfLines={1}
          >
            {initials}
          </Text>
        </View>
      )}

      {showOnlineDot && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#0d1326',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  image: {
    backgroundColor: '#0d1326',
  },
  fallbackCircle: {
    backgroundColor: '#161b2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#00daf3',
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#05070e',
  },
});
