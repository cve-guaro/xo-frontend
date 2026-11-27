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

  if (!showBanner || isPwaInstalled || isDesktop) return null;

  return (
    <View style={isDesktop ? styles.desktopContainer : styles.mobileContainer}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/brand/PNG/icon/xo-icon-color-transparent-64.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </View>
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
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissBtn}
            accessibilityLabel="Dismiss install prompt"
          >
            <CloseIcon size={20} color="#B4B8CC" />
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
    backgroundColor: '#10101F',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.35)',
    padding: 16,
  } as any,
  mobileContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#10101F',
    borderWidth: 1,
    borderColor: 'rgba(0, 218, 243, 0.35)',
    padding: 16,
  } as any,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#16162A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as any,
  appIcon: {
    width: 36,
    height: 20,
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: '#EDEEF4',
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    color: '#B4B8CC',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismissBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installBtn: {
    backgroundColor: '#00DAF3',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  installText: {
    color: '#04222B',
    fontWeight: '800',
    fontSize: 12,
  },
});
