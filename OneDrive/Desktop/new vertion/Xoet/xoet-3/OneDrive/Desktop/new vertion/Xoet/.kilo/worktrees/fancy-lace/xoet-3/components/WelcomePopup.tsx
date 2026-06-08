import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '../context/authContext';

export default function WelcomePopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [show, setShow] = useState(visible);
  const slide = new Animated.Value(0);

  useEffect(() => {
    if (show) {
      Animated.timing(slide, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      // Play a subtle success chime
      (async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            // Using a built‑in Expo sound; replace with a custom asset if desired
            require('../assets/sounds/success.mp3')
          );
          await sound.playAsync();
        } catch (e) {
          console.warn('Welcome sound error', e);
        }
      })();
    } else {
      slide.setValue(0);
    }
  }, [show]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const opacity = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  if (!show) return null;

  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
          <LinearGradient colors={["#1e3a8a", "#2563eb"]} style={styles.inner}>
            <Text style={styles.title}>Welcome to XO Ethiopia!</Text>
            <Text style={styles.body}>
              You have received a 10 ETB welcome bonus. This bonus is not directly withdrawable, but any winnings you earn are fully withdrawable.
            </Text>
            <Text style={styles.body}>Play at least one game to unlock withdrawals.</Text>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.buttonText}>I Agree</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '85%', borderRadius: 20, overflow: 'hidden' },
  inner: { padding: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 12 },
  body: { color: '#e5e7eb', fontSize: 14, marginBottom: 8 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, backgroundColor: '#10b981', paddingVertical: 10, borderRadius: 12 },
  buttonText: { color: '#fff', marginLeft: 6, fontWeight: '800' },
});
