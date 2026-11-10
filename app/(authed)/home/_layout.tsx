import { Ionicons } from "@expo/vector-icons";
import { House, ClockCounterClockwise, Trophy, UserCircle, Wallet } from "phosphor-react-native";
import { Redirect, Tabs, useRouter, usePathname, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, View, Platform, useWindowDimensions, Text, Image, TouchableOpacity, StyleSheet , LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext";
import { haptics } from "../../../lib/haptcs";
import { playTickSound } from "../../../lib/pinTickAudio";
import { WebPressable } from "../../../components/WebPressable";
import { BlurView } from "expo-blur";
import { BREAKPOINTS } from "../../../constants/breakpoints";

const TAB_H = Platform.OS === "ios" ? 90 : 82;

const colors = {
  bg: "#0B0B16",
  bar: "rgba(11,11,22,0.88)",
  border: "rgba(255,255,255,0.08)",
  active: "#00DAF3",
  activeBlue: "#00DAF3",
  activeRed: "#ff2a5f",
  activePillBg: "rgba(0,218,243,0.12)",
  activePillBorder: "rgba(0,218,243,0.3)",
  inactive: "#8B8FA8",
};

function TabButton(props: any) {
  // Strip 'href' to prevent RN Web from rendering an <a> tag that triggers a full page reload on tap.
  const { onPress, accessibilityState, href, ...rest } = props;
  const selected = !!accessibilityState?.selected;

  return (
    <WebPressable
      {...rest}
      onPress={(e) => {
        if (e && e.preventDefault) e.preventDefault();
        haptics.heavy();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 12,
          paddingBottom: Platform.OS === "ios" ? 32 : 14,
          opacity: pressed ? 0.85 : 1,
        },
        selected && { transform: [{ translateY: -2 }] },
      ]}
    />
  );
}

const SidebarItem = ({ icon, label, isActive, onPress }: { icon: any, label: string, isActive: boolean, onPress: () => void }) => (
  <WebPressable
    onPress={onPress}
    style={({ hovered }: { pressed: boolean; hovered: boolean }) => [
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: isActive ? 'rgba(166,140,255,0.1)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderLeftWidth: isActive ? 4 : 0,
        borderLeftColor: isActive ? colors.active : 'transparent',
      }
    ]}
  >
    <Ionicons name={icon} size={22} color={isActive ? colors.active : colors.inactive} />
    <Text style={{ marginLeft: 16, color: isActive ? '#e5e3ff' : 'rgba(229,227,255,0.5)', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
      {label}
    </Text>
  </WebPressable>
);

export default function AuthedLayout() {
  const { user, language, logout, activeGameMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isSpinMode = activeGameMode === 'spin';
  const isInGameRoom = pathname.includes('/spin') || pathname.includes('/room') || pathname.includes('/waiting');
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= BREAKPOINTS.TABLET;
  const insets = useSafeAreaInsets();

  const getTabTitle = useCallback(
    (routeName: string) => {
      if (language === "am") {
        if (routeName === "gameplay") return "ጨዋታ";
        if (routeName === "account") return "መለያ";
        if (routeName === "transactions") return "ክፍያዎች";
      }
      if (routeName === "gameplay") return "Play";
      if (routeName === "account") return "Account";
      if (routeName === "transactions") return "Payments";
      return routeName;
    },
    [language]
  );

  const baseScreenOptions = useMemo(
    () =>
      ({
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,

        tabBarShowLabel: false,

        tabBarLabelStyle: {
          display: "none",
        },

        tabBarStyle: {
          display: isDesktop ? "none" : "flex",
          backgroundColor: "#060614",
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: TAB_H,
          paddingTop: 4,
          paddingBottom: Platform.OS === "ios" ? 32 : 16,
          zIndex: 9999,
          elevation: 9999,
        },

      }) as const,
    [isDesktop]
  );

  const renderIcon = useCallback((routeName: string, focused: boolean) => {
    let iconName: keyof typeof Ionicons.glyphMap = "ellipse";
    if (routeName === "gameplay") iconName = focused ? "game-controller" : "game-controller-outline";
    if (routeName === "account") iconName = focused ? "person" : "person-outline";
    if (routeName === "transactions") iconName = focused ? "wallet" : "wallet-outline";

    return (
      <View
        style={{
          width: 44,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          backgroundColor: focused ? colors.activePillBg : "transparent",
          borderWidth: focused ? 1 : 0,
          borderColor: focused ? colors.activePillBorder : "transparent",
        }}
      >
        <Ionicons name={iconName} size={22} color={focused ? colors.active : colors.inactive} />
      </View>
    );
  }, []);

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        initialRouteName="gameplay"
        screenOptions={({ route }) => ({
          ...baseScreenOptions,
          tabBarStyle: { display: "none" }, // completely hide default bar
        })}
      >
        <Tabs.Screen name="gameplay" options={{ title: getTabTitle("gameplay") }} />
        <Tabs.Screen name="history" options={{ title: language === 'am' ? 'ታሪክ' : 'History', href: null }} />
        <Tabs.Screen name="transactions" options={{ title: getTabTitle("transactions"), href: null }} />
        <Tabs.Screen name="account" options={{ title: getTabTitle("account") }} />
        <Tabs.Screen name="leaderboard" options={{ title: language === 'am' ? 'ሊደርቦርድ' : 'Leaderboard', href: null }} />
      </Tabs>

      {/* Global Custom Floating Bottom Nav — Hidden in Game Rooms & on Desktop */}
      {!isDesktop && !isInGameRoom && (() => {
        const isWalletPage = pathname === '/home/transactions';
        const isHistoryPage = pathname === '/home/history';
        const isLeaderboardPage = pathname === '/home/leaderboard';
        const isAccountPage = pathname === '/home/account';
        const isGameplayPage = pathname === '/home/gameplay' || pathname.includes('spin');

        // Spin card uses 3 tabs; XO card uses 5 tabs
        const show3Tabs = isSpinMode;
        const activeThemeColor = isSpinMode ? colors.activeRed : colors.activeBlue;
        const activeThemePillBg = isSpinMode ? 'rgba(255, 42, 95, 0.20)' : 'rgba(0, 218, 243, 0.20)';
        const activeThemePillBorder = isSpinMode ? 'rgba(255, 42, 95, 0.55)' : 'rgba(0, 218, 243, 0.55)';

        return (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            elevation: 9999,
            backgroundColor: '#080F17', // Matching Brand Identity Deep Navy
            borderTopWidth: 1,
            borderTopColor: 'rgba(35, 48, 65, 0.7)',
            paddingBottom: Platform.OS === 'web' ? 6 : Math.max(insets.bottom, 6),
            paddingTop: 10,
            borderRadius: 0,
          }}>
            <View style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-around',
              paddingHorizontal: show3Tabs ? 20 : 6,
              borderRadius: 0,
            }}>

              {/* 1. Home Tab */}
              <TouchableOpacity
                onPress={() => {
                  try { playTickSound(); } catch {}
                  try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
                  haptics.tap();
                  if (!isGameplayPage) router.replace('/(authed)/home/gameplay');
                }}
                style={isGameplayPage ? s.navItemActive : s.navItem}
                activeOpacity={0.75}
              >
                <View style={[
                  s.navItemBox,
                  isGameplayPage && { backgroundColor: activeThemePillBg, borderColor: activeThemePillBorder, paddingHorizontal: 12 },
                ]}>
                  <House
                    size={20}
                    color={isGameplayPage ? activeThemeColor : colors.inactive}
                    weight={isGameplayPage ? "fill" : "regular"}
                  />
                  {isGameplayPage && (
                    <Text style={[s.activeNavText, { color: activeThemeColor }]}>
                      Home
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* 2. History Tab (Only in XO 5-tab mode) */}
              {!show3Tabs && (
                <TouchableOpacity
                  onPress={() => {
                    try { playTickSound(); } catch {}
                  try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
                    haptics.tap();
                    if (!isHistoryPage) router.replace('/(authed)/home/history');
                  }}
                  style={isHistoryPage ? s.navItemActive : s.navItem}
                  activeOpacity={0.75}
                >
                  <View style={[
                    s.navItemBox,
                    isHistoryPage && { backgroundColor: activeThemePillBg, borderColor: activeThemePillBorder, paddingHorizontal: 12 },
                  ]}>
                    <ClockCounterClockwise
                      size={20}
                      color={isHistoryPage ? activeThemeColor : colors.inactive}
                      weight={isHistoryPage ? "fill" : "regular"}
                    />
                    {isHistoryPage && (
                      <Text style={[s.activeNavText, { color: activeThemeColor }]}>
                        History
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* 3. Leaderboard Tab (Only in XO 5-tab mode) */}
              {!show3Tabs && (
                <TouchableOpacity
                  onPress={() => {
                    try { playTickSound(); } catch {}
                  try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
                    haptics.tap();
                    if (!isLeaderboardPage) router.replace('/(authed)/home/leaderboard');
                  }}
                  style={isLeaderboardPage ? s.navItemActive : s.navItem}
                  activeOpacity={0.75}
                >
                  <View style={[
                    s.navItemBox,
                    isLeaderboardPage && { backgroundColor: activeThemePillBg, borderColor: activeThemePillBorder, paddingHorizontal: 12 },
                  ]}>
                    <Trophy
                      size={20}
                      color={isLeaderboardPage ? activeThemeColor : colors.inactive}
                      weight={isLeaderboardPage ? "fill" : "regular"}
                    />
                    {isLeaderboardPage && (
                      <Text style={[s.activeNavText, { color: activeThemeColor }]}>
                        Rank
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* 4. Wallet Tab (Present in both modes) */}
              <TouchableOpacity
                onPress={() => {
                  try { playTickSound(); } catch {}
                  try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
                  haptics.tap();
                  if (!isWalletPage) router.replace('/(authed)/home/transactions');
                }}
                style={isWalletPage ? s.navItemActive : s.navItem}
                activeOpacity={0.75}
              >
                <View style={[
                  s.navItemBox,
                  isWalletPage && { 
                    backgroundColor: activeThemePillBg, 
                    borderColor: activeThemePillBorder,
                    paddingHorizontal: 12,
                  },
                ]}>
                  <Wallet
                    size={20}
                    color={isWalletPage ? activeThemeColor : colors.inactive}
                    weight={isWalletPage ? "fill" : "regular"}
                  />
                  {isWalletPage && (
                    <Text style={[s.activeNavText, { color: activeThemeColor }]}>
                      Wallet
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* 5. Profile Tab */}
              <TouchableOpacity
                onPress={() => {
                  try { playTickSound(); } catch {}
                  try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch {}
                  haptics.tap();
                  if (!isAccountPage) router.replace('/(authed)/home/account');
                }}
                style={isAccountPage ? s.navItemActive : s.navItem}
                activeOpacity={0.75}
              >
                <View style={[
                  s.navItemBox,
                  isAccountPage && { backgroundColor: activeThemePillBg, borderColor: activeThemePillBorder, paddingHorizontal: 12 },
                ]}>
                  <UserCircle
                    size={20}
                    color={isAccountPage ? activeThemeColor : colors.inactive}
                    weight={isAccountPage ? "fill" : "regular"}
                  />
                  {isAccountPage && (
                    <Text style={[s.activeNavText, { color: activeThemeColor }]}>
                      Profile
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}
    </View>
  );
}

const s = StyleSheet.create({
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  navItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navItemBox: {
    height: 38,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'transparent',
    paddingHorizontal: 6,
    ...(Platform.OS === 'web' ? {
      transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    } as any : {}),
  },
  activeNavText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginLeft: 6,
  },
});


export const TAB_BAR_HEIGHT = TAB_H + 30;
