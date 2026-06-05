import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions, ActivityIndicator, Image as RNImage } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Emil Kowalski easing curve
const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
const CIRCLE_RADIUS = 16;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export default function PromotionPopup({ config, visible, onClose }: { config: any; visible: boolean; onClose: () => void }) {
  const { fixUrl } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [imgAspect, setImgAspect] = useState(1); // default square, updated on load
  
  const timerAnim = useRef(new Animated.Value(1)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  const displayDuration = Number(config?.display_duration || 10);
  const duration = displayDuration * 1000;

  // Measure real image dimensions to set correct aspect ratio
  useEffect(() => {
    if (config?.image_url) {
      const url = fixUrl(config.image_url) || '';
      if (url) {
        RNImage.getSize(
          url,
          (w, h) => { if (w && h) setImgAspect(w / h); },
          () => { /* fallback to 1:1 */ }
        );
      }
    }
  }, [config?.image_url]);

  useEffect(() => {
    if (visible && config) {
      setImageLoaded(false);
      setImageError(false);
      
      // Animate entry: opacity from 0 -> 1, scale from 0.95 -> 1
      enterAnim.setValue(0);
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 350,
        easing: easeOut,
        useNativeDriver: true,
      }).start();

      // Animate progress circle
      timerAnim.setValue(1);
      Animated.timing(timerAnim, {
        toValue: 0,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();

      // Countdown tick
      setCountdown(displayDuration);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [visible, config]);

  const handleClose = () => {
    Animated.timing(enterAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.bezier(0.32, 0.72, 0, 1), // Fast exit
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!visible || !config || !config.image_url) return null;

  const scale = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });
  const opacity = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const strokeDashoffset = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_CIRCUMFERENCE, 0],
  });

  const fullImageUrl = fixUrl(config.image_url) || "";
  const isDesktop = SCREEN_WIDTH > 768;
  // Use most of the screen but leave padding
  const maxWidth = isDesktop ? Math.min(640, SCREEN_WIDTH * 0.6) : SCREEN_WIDTH * 0.92;
  const maxHeight = isDesktop ? SCREEN_HEIGHT * 0.8 : SCREEN_HEIGHT * 0.75;

  // Calculate container dimensions dynamically preserving image aspect ratio and fitting within bounds
  let calculatedWidth = maxWidth;
  let calculatedHeight = maxWidth / imgAspect;

  if (calculatedHeight > maxHeight) {
    calculatedHeight = maxHeight;
    calculatedWidth = maxHeight * imgAspect;
  }

  return (
    <Modal visible={true} transparent animationType="none" onRequestClose={handleClose}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.container, { transform: [{ scale }], opacity, width: calculatedWidth, height: calculatedHeight }]}>
            
            {/* The Image is the main focal point — shown in FULL without cropping */}
            <View style={[styles.imageWrapper, { width: calculatedWidth, height: calculatedHeight }]}>
              {!imageLoaded && (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}
              <Animated.Image
                source={{ uri: fullImageUrl }}
                style={[styles.image, { opacity: imageLoaded ? 1 : 0, width: calculatedWidth, height: calculatedHeight }]}
                resizeMode="contain"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  // Stale/broken image URL — auto-close after brief delay
                  console.warn('[PromotionPopup] Image failed to load:', fullImageUrl);
                  setImageError(true);
                  setTimeout(() => onClose(), 1500);
                }}
              />
            </View>

            {/* Circular Close Button with Timer */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
              <View style={styles.svgWrapper}>
                <Svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: [{ rotate: '-90deg' }] }}>
                  <Circle
                    cx="20"
                    cy="20"
                    r={CIRCLE_RADIUS}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <AnimatedCircle
                    cx="20"
                    cy="20"
                    r={CIRCLE_RADIUS}
                    stroke="#ffffff"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </Svg>
                <View style={styles.closeIcon}>
                  <Ionicons name="close" size={18} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>

          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0a0a0f',
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 15 },
  },
  imageWrapper: {
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
  },
  loader: {
    position: 'absolute',
    alignSelf: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    position: 'absolute',
  }
});
