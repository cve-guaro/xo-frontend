import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Pressable, View, Platform, useWindowDimensions, Text, Image } from "react-native";
import { useAuth } from "../../../context/authContext";
import { haptics } from "../../../lib/haptcs";
import { WebPressable } from "../../../components/WebPressable";

const TAB_H = Platform.OS === "ios" ? 90 : 82;


const colors = {
  bg: "#060614", // Surface dark
  bar: "rgba(6,6,20,0.7)", // Glassy bar
  border: "rgba(167,139,250,0.08)", // Primary dim border
  active: "#a78bfa", // Primary neon purple
  inactive: "#4a4a6a", // Inverse on-surface
  activePillBg: "rgba(167,139,250,0.12)",
  activePillBorder: "rgba(167,139,250,0.2)",
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
    style={({ hovered }) => [
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: isActive ? 'rgba(166,139,255,0.1)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
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
  const isDesktop = Platform.OS === "web" && width > 768;

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
          tabBarIcon: ({ focused }) => renderIcon(route.name, focused),
          tabBarButton: (props) => (
            <TabButton
              {...props}
              onPress={(e: any) => {
                haptics.heavy()
                props.onPress?.(e);
              }}
            />
          ),
        })}
      >
        <Tabs.Screen name="gameplay" options={{ title: getTabTitle("gameplay") }} />
        <Tabs.Screen name="transactions" options={{ title: getTabTitle("transactions") }} />
        <Tabs.Screen name="account" options={{ title: getTabTitle("account") }} />
      </Tabs>
    </View>
  );
}

// export this so screens can pad properly
export const TAB_BAR_HEIGHT = TAB_H;
