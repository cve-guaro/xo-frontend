import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions, Image } from 'react-native';
import { CloseIcon } from './SvgIcons';
import { LinearGradient } from 'expo-linear-gradient';

export function PwaInstallBanner() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    Platform.OS === 'web' && typeof window !== 'undefined' ? (window as any).deferredPrompt : null
  );
  const [showBanner, setShowBanner] = useState(
    Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).deferredPrompt
  );
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const checkPwaInstalled = async () => {
      // 1. Check standalone display mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone;
      if (isStandalone) return true;

      // 2. Check getInstalledRelatedApps (Chrome/Android)
      if ((navigator as any).getInstalledRelatedApps) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          if (relatedApps && relatedApps.length > 0) {
            return true;
          }
        } catch (e) {
          console.log('[PWA Banner] getInstalledRelatedApps error:', e);
        }
      }
      return false;
    };

    const handleCheck = () => {
      checkPwaInstalled().then(installed => {
        setIsPwaInstalled(installed);
      });
    };

    handleCheck();

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Listen for matchMedia changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsPwaInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    // Periodically poll (every 3 seconds) to ensure state changes are detected
    const interval = setInterval(handleCheck, 3000);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleReady = () => {
      setDeferredPrompt((window as any).deferredPrompt);
      setShowBanner(true);
    };

    window.addEventListener('pwa-prompt-ready', handleReady);

    // If it's already available
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('pwa-prompt-ready', handleReady);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA installed successfully');
      setIsPwaInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner || isPwaInstalled) return null;

  return (
    <View style={isDesktop ? styles.desktopContainer : styles.mobileContainer}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/adaptive-icon.png')}
          style={{ width: 40, height: 40, borderRadius: 10, marginRight: 12 }}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Install XO Ethiopia App</Text>
          <Text style={styles.subtitle} numberOfLines={isDesktop ? 2 : 1}>
            Play faster and offline directly from your home screen.
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleInstall} style={styles.installBtn}>
            <Text style={styles.installText}>Install</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
            <CloseIcon size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 380,
    zIndex: 9999,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00daf3',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: '#00daf3',
    padding: 16,
  },
  mobileContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00daf3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#00daf3',
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 11,
    marginTop: 2,
    opacity: 0.9,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismissBtn: {
    padding: 4,
  },
  installBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installText: {
    color: '#0b0b0f',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
