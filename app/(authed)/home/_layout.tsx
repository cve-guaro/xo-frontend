import { Ionicons } from "@expo/vector-icons";
import { House, ClockCounterClockwise, Trophy, UserCircle } from "phosphor-react-native";
import { Redirect, Tabs, useRouter, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, View, Platform, useWindowDimensions, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../../../context/authContext";
import { haptics } from "../../../lib/haptcs";
import { WebPressable } from "../../../components/WebPressable";
import { BlurView } from "expo-blur";

const TAB_H = Platform.OS === "ios" ? 90 : 82;


const colors = {
  bg: "#0B0B16", // Surface dark
  bar: "rgba(11,11,22,0.72)", // Glassy bar
  border: "rgba(255,255,255,0.08)", // Hairline border
  active: "#00DAF3", // Brand cyan
  inactive: "#8B8FA8", // Muted
  activePillBg: "rgba(0,218,243,0.12)",
  activePillBorder: "rgba(0,218,243,0.35)",
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
        borderLeftWidth: isActive ? 4 : 4,
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
  const { user, language, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  if (!user) return <Redirect href="/(auth)/login" />;

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

      {/* Global Custom Floating Bottom Nav — 4 items: Home, History, Leaderboard, Profile */}
      {!isDesktop && !pathname.includes('spin') && (
        <View pointerEvents="box-none" style={{
          position: 'absolute', bottom: 0,
          left: 0, right: 0, zIndex: 9999, elevation: 9999,
          alignItems: 'center',
          paddingBottom: Platform.OS === 'ios' ? 18 : 12,
        }}>
          <View style={{
            width: '94%', maxWidth: 480,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
            backgroundColor: 'rgba(11,11,22,0.78)',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            paddingTop: 10,
            paddingBottom: Platform.OS === 'ios' ? 14 : 10,
            overflow: 'hidden',
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45, shadowRadius: 20, elevation: 12,
          }}>
            {/* Universal glassmorphic background */}
            <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />

            {/* Home */}
            <TouchableOpacity onPress={() => router.push('/(authed)/home/gameplay')} style={s.navItem} activeOpacity={0.8}>
              <View style={[s.iconPill, pathname === '/home/gameplay' && s.iconPillActive]}>
                <House size={21} color={pathname === '/home/gameplay' ? colors.active : colors.inactive} weight={pathname === '/home/gameplay' ? "fill" : "regular"} />
              </View>
              <Text style={[s.navLabel, pathname === '/home/gameplay' && s.navLabelActive]}>
                {language === 'am' ? 'ዋና' : 'Home'}
              </Text>
            </TouchableOpacity>

            {/* History (Match History) */}
            <TouchableOpacity onPress={() => router.push('/(authed)/home/history')} style={s.navItem} activeOpacity={0.8}>
              <View style={[s.iconPill, pathname === '/home/history' && s.iconPillActive]}>
                <ClockCounterClockwise size={21} color={pathname === '/home/history' ? colors.active : colors.inactive} weight={pathname === '/home/history' ? "fill" : "regular"} />
              </View>
              <Text style={[s.navLabel, pathname === '/home/history' && s.navLabelActive]}>
                {language === 'am' ? 'ታሪክ' : 'History'}
              </Text>
            </TouchableOpacity>

            {/* Leaderboard */}
            <TouchableOpacity onPress={() => router.push('/(authed)/home/leaderboard')} style={s.navItem} activeOpacity={0.8}>
              <View style={[s.iconPill, pathname === '/home/leaderboard' && s.iconPillActive]}>
                <Trophy size={21} color={pathname === '/home/leaderboard' ? colors.active : colors.inactive} weight={pathname === '/home/leaderboard' ? "fill" : "regular"} />
              </View>
              <Text style={[s.navLabel, pathname === '/home/leaderboard' && s.navLabelActive]}>
                {language === 'am' ? 'ሊደርቦርድ' : 'Leaderboard'}
              </Text>
            </TouchableOpacity>

            {/* Profile */}
            <TouchableOpacity onPress={() => router.push('/(authed)/home/account')} style={s.navItem} activeOpacity={0.8}>
              <View style={[s.iconPill, pathname === '/home/account' && s.iconPillActive]}>
                <UserCircle size={21} color={pathname === '/home/account' ? colors.active : colors.inactive} weight={pathname === '/home/account' ? "fill" : "regular"} />
              </View>
              <Text style={[s.navLabel, pathname === '/home/account' && s.navLabelActive]}>
                {language === 'am' ? 'መለያ' : 'Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  navItem: { flex: 1, alignItems: 'center' },
  iconPill: {
    width: 46, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: 'rgba(0,218,243,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0,218,243,0.35)',
  },
  navLabel: { fontSize: 9, marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: '#8B8FA8' },
  navLabelActive: { color: '#00DAF3' },
});

// export this so screens can pad properly
export const TAB_BAR_HEIGHT = TAB_H + 30;
