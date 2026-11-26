// app/(authed)/admin/_layout.tsx
// Production-Grade Responsive Admin Shell — Desktop (Collapsible Sidebar) / Mobile (Fluid Drawer)
import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Image, useWindowDimensions, ScrollView, SafeAreaView, Pressable,
  TextInput, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import LogoutConfirmation from '../../../components/LogoutConfirmation';
import { useBackgroundMusic } from '../../../context/BackgroundMusicProvider';
import AdminGlobalSearch from '../../../components/AdminGlobalSearch';
import Avatar from '../../../components/ui/Avatar';
import { alpha } from '../../../components/admin/ui';
import { AdminNotificationProvider, useAdminNotifications } from '../../../context/AdminNotificationContext';
import { NotificationList } from '../../../components/admin/NotificationList';

// ─── Design Tokens (XO Brand + TailAdmin Dark/Light System) ──
export * from '../../../constants/adminTheme';
import {
  AdminThemeMode,
  DarkAdminTheme,
  LightAdminTheme,
  AdminTheme,
  AdminThemeContextType,
  AdminThemeContext,
  useAdminTheme,
} from '../../../constants/adminTheme';
const C = AdminTheme;

const SIDEBAR_FULL = 244;
const SIDEBAR_ICON = 76;
const TOPBAR_H = 72;

// ─── NavItem for sidebar & drawer ─────────────────────────────
function SideNavItem({
  icon, label, path, currentPath, collapsed, onSelect,
}: { icon: any; label: string; path: string; currentPath: string; collapsed: boolean; onSelect?: () => void }) {
  const router = useRouter();
  const { t } = useAuth();
  const { theme: C } = useAdminTheme();
  const safePath = currentPath || '';
  const isActive = path === '/admin'
    ? safePath === '/admin'
    : (path !== '/admin' && safePath.startsWith(path));

  const handlePress = () => {
    if (onSelect) onSelect();
    router.push(path as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 9,
          borderRadius: 8,
          marginBottom: 3,
          borderWidth: 1,
          borderColor: isActive ? C.primary : 'transparent',
          backgroundColor: isActive ? C.primaryContainer : 'transparent',
        },
        collapsed && { justifyContent: 'center', paddingHorizontal: 0, width: 44, height: 44, alignSelf: 'center', marginBottom: 4 },
        Platform.OS === 'web' && { transition: 'background-color 0.15s ease, border-color 0.15s ease' } as any
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <View style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? C.primary : 'transparent',
      }}>
        <Ionicons
          name={isActive ? icon : `${icon}-outline` as any}
          size={17}
          color={isActive ? '#FFFFFF' : C.onSurfaceVariant}
        />
      </View>
      {!collapsed && (
        <Text style={{
          color: isActive ? C.onSurface : C.onSurfaceVariant,
          fontSize: 13,
          fontWeight: isActive ? '700' : '500',
          flex: 1
        }} numberOfLines={1}>
          {t(label as any) || label}
        </Text>
      )}
      {isActive && !collapsed && (
        <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: C.primary }} />
      )}
    </TouchableOpacity>
  );
}

// ─── NavGroup for categorizing sidebar navigation ─────────────
function NavGroup({
  title, items, currentPath, collapsed, onSelect,
}: { title: string; items: any[]; currentPath: string; collapsed: boolean; onSelect?: () => void }) {
  const { t } = useAuth();
  const { theme: C } = useAdminTheme();
  const isActive = items.some(item => (currentPath || '').startsWith(item.path) && item.path !== '/admin');
  const [open, setOpen] = useState(true);

  return (
    <View style={{ marginBottom: 14 }}>
      {!collapsed ? (
        <TouchableOpacity 
          onPress={() => setOpen(!open)} 
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 6,
          }}
        >
          <Text style={{
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: isActive ? C.primary : C.onSurfaceVariant,
          }}>
            {t(title as any) || title}
          </Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color={C.onSurfaceVariant} />
        </TouchableOpacity>
      ) : (
        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 8, marginHorizontal: 12 }} />
      )}
      {(open || collapsed) && (
        <View style={!collapsed ? { paddingHorizontal: 8 } : { alignItems: 'center' }}>
          {items.map(item => (
            <SideNavItem 
              key={item.path} 
              {...item} 
              currentPath={currentPath} 
              collapsed={collapsed} 
              onSelect={onSelect}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Bottom tab item for phone view ───────────────────────────
function BottomTabItem({
  icon, label, path, currentPath, onPress,
}: { icon: any; label: string; path: string; currentPath: string; onPress?: () => void }) {
  const router = useRouter();
  const { t } = useAuth();
  const { theme: C } = useAdminTheme();
  const safePath = currentPath || '';
  const isActive = path === '/admin'
    ? safePath === '/admin'
    : (path !== '/admin' && path !== '#more' && safePath.startsWith(path));

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(path as any);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 3 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <View style={{
        width: 36,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? C.primaryContainer : 'transparent',
      }}>
        <Ionicons
          name={isActive ? icon : `${icon}-outline` as any}
          size={19}
          color={isActive ? C.primary : C.onSurfaceVariant}
        />
      </View>
      <Text style={{
        color: isActive ? C.primary : C.onSurfaceVariant,
        fontSize: 10,
        fontWeight: isActive ? '800' : '600',
        textAlign: 'center'
      }} numberOfLines={1}>
        {t(label as any) || label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Admin Layout Component ──────────────────────────────
function AdminLayoutInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, t, token, logout, language, switchLanguage, fixUrl, isSuperAdmin } = useAuth();
  const { isPlaying: musicPlaying, toggleMusic } = useBackgroundMusic();
  const { notifications, dismiss, clearAll, notify } = useAdminNotifications();

  const isMobile  = width < 1024;
  const isDesktop = width >= 1024;
  const isEN = language !== 'am';
  const isAdminRole = Boolean(
    user &&
      (user.role === 'admin' ||
        user.role === 'superadmin' ||
        user.role === 'maintenance' ||
        user.role === 'maintenance_admin' ||
        (user as any)?.is_superadmin ||
        (user as any)?.is_admin)
  );
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);

  // Desktop sidebar collapse toggle state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const collapsed = isDesktop && sidebarCollapsed;
  const sidebarW  = isMobile ? 0 : (collapsed ? SIDEBAR_ICON : SIDEBAR_FULL);

  // Theme Mode State (Dark / Light)
  const [themeMode, setThemeMode] = useState<AdminThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem('admin_theme_mode').then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setThemeMode(saved);
      }
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem('admin_theme_mode', next).catch(() => {});
      return next;
    });
  };

  const currentTheme = themeMode === 'light' ? LightAdminTheme : DarkAdminTheme;

  const [stats, setStats] = useState<any>(null);

  const isMaintenanceAdmin = user?.role === 'superadmin' || user?.role === 'maintenance' || user?.role === 'maintenance_admin';

  // ─── Flat 8-item navigation matching reference dashboard ───────
  const navItems = [
    { icon: 'grid', label: 'Overview', path: '/admin' },
    { icon: 'wallet', label: 'Payments', path: '/admin/financial' },
    { icon: 'game-controller', label: 'Game engine', path: '/admin/controls' },
    { icon: 'people', label: 'Players', path: '/admin/users' },
    { icon: 'megaphone', label: 'Promotions', path: '/admin/promotion-links' },
    { icon: 'trophy', label: 'Leaderboard', path: '/admin/leaderboard' },
    { icon: 'apps', label: 'Mini-apps', path: '/admin/miniapps' },
    { icon: 'shield', label: 'System', path: '/admin/audit' },
  ];

  const bottomTabItems = [
    { icon: 'grid', label: 'Overview', path: '/admin' },
    { icon: 'wallet', label: 'Payments', path: '/admin/financial' },
    { icon: 'game-controller', label: 'Games', path: '/admin/controls' },
    { icon: 'people', label: 'Players', path: '/admin/users' },
  ];

  // ─── 2FA SECURITY GATE ────────────────────────────────────────
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    if (Platform.OS === 'web') {
      try { return sessionStorage.getItem('adminUnlocked') === 'true'; } catch(e) {}
    }
    return false;
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const sendAdminOTP = async () => {
    try {
      setOtpLoading(true); setOtpError('');
      const res = await fetch(`${API_URL}/admin/auth/send-2fa`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      const data = await res.json();
      if (res.ok) setOtpSent(true);
      else setOtpError(data.error || 'Failed to send security code');
    } catch (e) {
      setOtpError('Network error');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyAdminOTP = async () => {
    try {
      setOtpLoading(true); setOtpError('');
      const res = await fetch(`${API_URL}/admin/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        },
        body: JSON.stringify({ code: otpCode })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUnlocked(true);
        if (Platform.OS === 'web') {
          try { sessionStorage.setItem('adminUnlocked', 'true'); } catch(e) {}
        }
      } else {
        setOtpError(data.error || 'Invalid code');
      }
    } catch (e) {
      setOtpError('Network error');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleAdminQuickPass = async () => {
    try {
      setPassLoading(true);
      setOtpError('');
      const res = await fetch(`${API_URL}/admin/auth/quick-pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdminUnlocked(true);
        if (Platform.OS === 'web') {
          try { sessionStorage.setItem('adminUnlocked', 'true'); } catch(e) {}
        }
      } else {
        setOtpError(data.error || 'Quick pass is restricted to Super Admin. Use Security Code instead.');
      }
    } catch (e: any) {
      setOtpError(e?.message || 'Network error');
    } finally {
      setPassLoading(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
        });
        if (res.ok) setStats(await res.json());
      } catch (e) {}
    };
    if (token && isAdminRole) fetchStats();
  }, [token, pathname, isAdminRole]);

  // ─── ROLE-BASED ROUTE GUARD (Blocks direct URL access by normal users) ───
  if (!user || !isAdminRole) {
    if (Platform.OS === 'web') {
      try { sessionStorage.removeItem('adminUnlocked'); } catch(e) {}
    }
    return <Redirect href="/(authed)/home/gameplay" />;
  }

  // ─── 2FA AUTH GUARD ───────────────────────────────────────────
  if (!adminUnlocked) {
    return (
      <View style={s.lockScreen}>
        <View style={s.lockBox}>
          <View style={s.lockIconWrap}>
            <Ionicons name="shield-checkmark" size={30} color={C.primary} />
          </View>
          <Text style={s.lockTitle}>{isEN ? 'Admin Security Gateway' : 'የአድሚን ደህንነት በር'}</Text>
          <Text style={s.lockSubtitle}>
            {isEN ? 'Authenticate administrative credentials to access console.' : 'የአስተዳደር ኮንሶል ለመድረስ ደህንነትዎን ያረጋግጡ።'}
          </Text>

          {otpError ? <Text style={s.errorBadge}>{otpError}</Text> : null}

          {!otpSent ? (
            <>
              <TouchableOpacity
                onPress={sendAdminOTP}
                disabled={otpLoading}
                style={[s.primaryBtn, otpLoading && { opacity: 0.7 }]}
                activeOpacity={0.8}
              >
                {otpLoading ? <ActivityIndicator color="#ffffff" /> : (
                  <Text style={s.primaryBtnText}>{isEN ? 'Send Security Code' : 'መለያ ኮድ ላክ'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdminQuickPass}
                disabled={passLoading}
                style={[s.quickPassBtn, passLoading && { opacity: 0.7 }]}
                activeOpacity={0.8}
              >
                {passLoading ? (
                  <ActivityIndicator color={C.secondary} />
                ) : (
                  <>
                    <Ionicons name="flash" size={15} color={C.secondary} />
                    <Text style={s.quickPassText}>{isEN ? 'Quick pass' : 'ፈጣን ማለፊያ'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="0000"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="number-pad"
                maxLength={4}
                style={s.otpInput}
                autoFocus
              />
              <TouchableOpacity
                onPress={verifyAdminOTP}
                disabled={otpLoading || otpCode.length < 4}
                style={[s.primaryBtn, (otpCode.length < 4) && { opacity: 0.5 }]}
                activeOpacity={0.8}
              >
                {otpLoading ? <ActivityIndicator color="#ffffff" /> : (
                  <Text style={s.primaryBtnText}>{isEN ? 'Verify & Unlock' : 'አረጋግጥ እና ክፈት'}</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => router.replace('/(authed)/home/gameplay' as any)} 
                style={{ marginTop: 20 }}
              >
                 <Text style={s.returnLink}>{isEN ? '← Return to Game' : '← ወደ ጨዋታ ተመለስ'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ─── MOBILE PHONE LAYOUT (< 1024px) ───────────────────────────
  if (isMobile) {
    return (
      <AdminThemeContext.Provider value={{ mode: themeMode, theme: currentTheme, isDark: themeMode === 'dark', toggleTheme }}>
        <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
          <SafeAreaView style={[s.mobileSafeArea, { backgroundColor: currentTheme.surfaceContainerLowest }]}>
            <View style={[s.mobileTopbar, { backgroundColor: currentTheme.surfaceContainerLowest, borderBottomColor: currentTheme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity 
                  onPress={() => setMobileSidebarVisible(true)} 
                  style={[s.mobileHeaderIconBtn, { backgroundColor: currentTheme.surfaceContainer, borderColor: currentTheme.border }]}
                  accessibilityLabel="Open Navigation Drawer"
                >
                  <Ionicons name="menu" size={20} color={currentTheme.onSurface} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: currentTheme.primary, letterSpacing: -0.5 }}>XO</Text>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: currentTheme.onSurface, letterSpacing: 2 }}>ETHIOPIA</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: currentTheme.success }} />
                  <View>
                    <Text style={{ color: currentTheme.success, fontSize: 9, fontWeight: '800' }}>Online</Text>
                    <Text style={{ color: currentTheme.onSurfaceVariant, fontSize: 8 }}>{isSuperAdmin ? 'Super Admin' : 'Admin'}</Text>
                  </View>
                </View>

                {/* Notification Bell (Mobile) */}
                <TouchableOpacity 
                  onPress={() => setNotificationsOpen(!notificationsOpen)} 
                  style={[s.mobileHeaderIconBtn, { backgroundColor: notificationsOpen ? currentTheme.primary : currentTheme.surfaceContainer, borderColor: notificationsOpen ? currentTheme.primary : currentTheme.border }]}
                  accessibilityLabel="Platform Notifications"
                >
                  <Ionicons name="notifications-outline" size={16} color={notificationsOpen ? '#FFFFFF' : currentTheme.onSurfaceVariant} />
                  {notifications.length > 0 && (
                    <View style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: currentTheme.primary }} />
                  )}
                </TouchableOpacity>

                {/* Theme Mode Toggle (Dark / Light) */}
                <TouchableOpacity 
                  onPress={toggleTheme} 
                  style={[s.mobileHeaderIconBtn, { backgroundColor: currentTheme.surfaceContainer, borderColor: currentTheme.border }]}
                  accessibilityLabel="Toggle Dark / Light Theme"
                >
                  <Ionicons name={themeMode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={16} color={themeMode === 'dark' ? currentTheme.accentGold : currentTheme.primary} />
                </TouchableOpacity>

                <View style={[s.mobileUserChip, { backgroundColor: currentTheme.primary, borderColor: currentTheme.border }]}>
                  <Text style={[s.mobileUserInitial, { color: '#ffffff' }]}>{user?.username?.[0]?.toUpperCase() || 'Y'}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>

          {/* Main Routed Content for Mobile */}
          <View style={{ flex: 1, backgroundColor: currentTheme.background, minHeight: 0, minWidth: 0 }}>
            <Slot />
          </View>

        {/* Mobile Notifications Popover Overlay */}
        {notificationsOpen && (
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99999, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 64 }]}
            onPress={() => setNotificationsOpen(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <NotificationList
                notifications={notifications}
                onDismiss={dismiss}
                onClearAll={clearAll}
                onClose={() => setNotificationsOpen(false)}
                onRefresh={() => {
                  notify({
                    title: 'Platform Activity Synced',
                    subtitle: 'Game engines & player ledger state refreshed',
                    type: 'success',
                  });
                }}
              />
            </Pressable>
          </Pressable>
        )}

        {/* Mobile Navigation Drawer Overlay */}
        {mobileSidebarVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}>
            <Pressable 
              style={s.drawerBackdrop} 
              onPress={() => setMobileSidebarVisible(false)} 
              accessibilityLabel="Close Drawer"
            />
            <View style={[s.drawerContainer, { backgroundColor: currentTheme.surfaceContainerLowest, borderRightColor: currentTheme.border }]}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={[s.drawerHeader, { borderBottomColor: currentTheme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: currentTheme.primary, letterSpacing: -0.5 }}>XO</Text>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: currentTheme.onSurface, letterSpacing: 2 }}>ETHIOPIA</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setMobileSidebarVisible(false)}
                    style={[s.drawerCloseBtn, { backgroundColor: currentTheme.surfaceContainer, borderColor: currentTheme.border }]}
                  >
                    <Ionicons name="close" size={18} color={currentTheme.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
                  <View style={{ paddingHorizontal: 8 }}>
                    {navItems.map(item => (
                      <SideNavItem
                        key={item.path}
                        {...item}
                        currentPath={pathname || ''}
                        collapsed={false}
                        onSelect={() => setMobileSidebarVisible(false)}
                      />
                    ))}
                  </View>
                </ScrollView>

                <View style={[s.drawerFooter, { borderTopColor: currentTheme.border }]}>
                  <TouchableOpacity 
                    style={[s.drawerHomeBtn, { backgroundColor: alpha(currentTheme.accentCyan, 0.08), borderColor: alpha(currentTheme.accentCyan, 0.3) }]} 
                    onPress={() => { setMobileSidebarVisible(false); router.push('/(authed)/home/gameplay' as any); }}
                  >
                    <Ionicons name="game-controller-outline" size={17} color={currentTheme.accentCyan} />
                    <Text style={[s.drawerHomeBtnText, { color: currentTheme.accentCyan }]}>{isEN ? 'Back to game' : 'ወደ ጨዋታ ተመለስ'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s.emergencyBtn, { backgroundColor: alpha(currentTheme.primary, 0.08), borderColor: alpha(currentTheme.primary, 0.3) }]} 
                    onPress={() => { setMobileSidebarVisible(false); setLogoutModalVisible(true); }}
                  >
                    <Ionicons name="log-out-outline" size={17} color={currentTheme.primary} />
                    <Text style={[s.emergencyText, { color: currentTheme.primary }]}>{isEN ? 'Log out' : 'ውጣ'}</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </View>
        )}

        {/* Bottom Tab Bar for Quick Phone Navigation matching Image 1 & 2 */}
        <SafeAreaView style={[s.bottomBar, { backgroundColor: currentTheme.surfaceContainerLowest, borderTopColor: currentTheme.border }]}>
          {bottomTabItems.map(item => (
            <BottomTabItem key={item.path} {...item} currentPath={pathname} />
          ))}
          <BottomTabItem
            icon="ellipsis-horizontal"
            label="More"
            path="#more"
            currentPath={pathname}
            onPress={() => setMobileSidebarVisible(true)}
          />
        </SafeAreaView>

        <LogoutConfirmation
          visible={logoutModalVisible}
          onCancel={() => setLogoutModalVisible(false)}
          onConfirm={async () => {
            setLogoutModalVisible(false);
            await logout();
            router.replace('/(auth)/login' as any);
          }}
        />
      </View>
    </AdminThemeContext.Provider>
    );
  }

  // ─── DESKTOP LAYOUT (>= 1024px) ───────────────────────────────
  return (
    <AdminThemeContext.Provider value={{ mode: themeMode, theme: currentTheme, isDark: themeMode === 'dark', toggleTheme }}>
      <View style={[s.root, { backgroundColor: currentTheme.background }]}>
        {/* Collapsible Sidebar */}
        <View style={[s.sidebar, { width: sidebarW, backgroundColor: currentTheme.surfaceContainerLowest, borderRightColor: currentTheme.border }]}>
          <View style={[s.sidebarBrand, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
            {!collapsed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: currentTheme.primary, letterSpacing: -0.5 }}>XO</Text>
                <Text style={{ fontSize: 10, fontWeight: '900', color: currentTheme.onSurface, letterSpacing: 2 }}>ETHIOPIA</Text>
              </View>
            )}
            <TouchableOpacity 
              onPress={() => setSidebarCollapsed(p => !p)} 
              style={[s.collapseToggleBtn, { borderColor: currentTheme.border }, collapsed && { marginLeft: 0 }]}
              accessibilityLabel={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={15} color={currentTheme.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {!collapsed && (
            <Text style={[s.sidebarRole, { color: currentTheme.onSurfaceVariant }]} numberOfLines={1}>
              {isSuperAdmin 
                ? (isEN ? 'Super Administrator' : 'ዋና አድሚን') 
                : (isEN ? 'System Administrator' : 'ሲስተም አድሚን')}
            </Text>
          )}

          <ScrollView style={s.navList} showsVerticalScrollIndicator={false}>
            <View style={!collapsed ? { paddingHorizontal: 8 } : { alignItems: 'center' }}>
              {navItems.map(item => (
                <SideNavItem
                  key={item.path}
                  {...item}
                  currentPath={pathname || ''}
                  collapsed={collapsed}
                />
              ))}
            </View>
          </ScrollView>

          <View style={[s.sidebarFooter, { borderTopColor: currentTheme.border }, collapsed && { paddingHorizontal: 8, alignItems: 'center' }]}>
            <TouchableOpacity
              style={[s.footerHomeBtn, { backgroundColor: alpha(currentTheme.accentCyan, 0.08), borderColor: alpha(currentTheme.accentCyan, 0.3) }, collapsed && s.footerBtnCollapsed]}
              activeOpacity={0.7}
              onPress={() => router.push('/(authed)/home/gameplay' as any)}
              accessibilityLabel="Back to Home"
            >
              <Ionicons name="game-controller-outline" size={17} color={currentTheme.accentCyan} />
              {!collapsed && <Text style={[s.footerHomeBtnText, { color: currentTheme.accentCyan }]}>{isEN ? 'Back to game' : 'ወደ ጨዋታ'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.emergencyBtn, { backgroundColor: alpha(currentTheme.primary, 0.08), borderColor: alpha(currentTheme.primary, 0.3) }, collapsed && s.footerBtnCollapsed]}
              activeOpacity={0.7}
              onPress={() => setLogoutModalVisible(true)}
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={17} color={currentTheme.primary} />
              {!collapsed && <Text style={[s.emergencyText, { color: currentTheme.primary }]}>{isEN ? 'Log out' : 'ውጣ'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.footerLink, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}
              activeOpacity={0.7}
              onPress={() => router.push('/admin/settings' as any)}
            >
              <View style={[s.footerLinkIcon, (pathname || '') === '/admin/settings' && { backgroundColor: currentTheme.lightPrimary }]}>
                <Ionicons name="settings-outline" size={16} color={(pathname || '') === '/admin/settings' ? currentTheme.primary : currentTheme.onSurfaceVariant} />
              </View>
              {!collapsed && (
                <Text style={[s.footerLinkText, { color: (pathname || '') === '/admin/settings' ? currentTheme.onSurface : currentTheme.onSurfaceVariant }]}>
                  {isEN ? 'Settings' : 'ቅንብሮች'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Topbar matching Image 1 & 2 */}
        <View style={[s.topbar, { left: sidebarW, backgroundColor: currentTheme.surfaceContainerLowest, borderBottomColor: currentTheme.border }]}>
          <View style={s.topbarLeft}>
            <AdminGlobalSearch />
          </View>

          <View style={s.topbarRight}>
            <TouchableOpacity
              style={s.balanceGroup}
              activeOpacity={0.7}
              onPress={() => router.push('/admin/ledger' as any)}
            >
              <Text style={[s.balanceLabel, { color: currentTheme.onSurfaceVariant }]}>{isEN ? 'PLATFORM BALANCE' : 'የሲስተም ሂሳብ'}</Text>
              <Text style={[s.balanceValue, { color: currentTheme.onSurface }]}>ETB {Number(stats?.totalProfit || 0).toLocaleString()}</Text>
            </TouchableOpacity>

            <View style={[s.topbarSep, { backgroundColor: currentTheme.border }]} />

            <TouchableOpacity 
              style={s.balanceGroup} 
              activeOpacity={0.7} 
              onPress={() => router.push('/admin/ledger' as any)}
            >
              <Text style={[s.balanceLabel, { color: currentTheme.onSurfaceVariant }]}>{isEN ? 'WALLET POSITION' : 'ትክክለኛ ቻፓ'}</Text>
              <Text style={[s.balanceValue, { color: currentTheme.onSurface }]}>
                ETB {Number(stats?.chapaBalance || stats?.chapaNetPosition || 0).toLocaleString()}
              </Text>
            </TouchableOpacity>

            <View style={[s.topbarSep, { backgroundColor: currentTheme.border }]} />

            {/* Notification Bell with interactive alerts popover */}
            <View style={{ position: 'relative', zIndex: 1001 }}>
              <TouchableOpacity
                onPress={() => {
                  setNotificationsOpen(!notificationsOpen);
                  if (settingsDropdownOpen) setSettingsDropdownOpen(false);
                }}
                activeOpacity={0.7}
                style={[
                  s.topbarActionBtn,
                  {
                    backgroundColor: notificationsOpen ? currentTheme.primary : currentTheme.surfaceContainer,
                    borderColor: notificationsOpen ? currentTheme.primary : currentTheme.border,
                  }
                ]}
                accessibilityLabel="Notifications and Alerts"
              >
                <Ionicons
                  name="notifications-outline"
                  size={16}
                  color={notificationsOpen ? '#FFFFFF' : currentTheme.onSurfaceVariant}
                />
                <View style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: currentTheme.primary }} />
              </TouchableOpacity>

              {/* Notification Popover Dropdown with Animated Stacked Cards */}
              {notificationsOpen && (
                <View style={{
                  position: 'absolute',
                  top: 44,
                  right: 0,
                  zIndex: 99999,
                }}>
                  <NotificationList
                    notifications={notifications}
                    onDismiss={dismiss}
                    onClearAll={clearAll}
                    onClose={() => setNotificationsOpen(false)}
                    onRefresh={async () => {
                      notify({
                        title: 'Platform Activity Synced',
                        subtitle: 'Game engines & player ledger state refreshed',
                        type: 'success',
                      });
                    }}
                  />
                </View>
              )}
            </View>

            {/* Grouped Controls Dropdown (Sound, Theme, Language) */}
            <View style={{ position: 'relative', zIndex: 1000 }}>
              <TouchableOpacity
                onPress={() => setSettingsDropdownOpen(!settingsDropdownOpen)}
                activeOpacity={0.7}
                style={[
                  s.topbarActionBtn,
                  {
                    backgroundColor: settingsDropdownOpen ? currentTheme.primary : currentTheme.surfaceContainer,
                    borderColor: settingsDropdownOpen ? currentTheme.primary : currentTheme.border,
                    flexDirection: 'row',
                    paddingHorizontal: 8,
                    gap: 4,
                    width: 'auto',
                  }
                ]}
                accessibilityLabel="Sound, Theme, Language Settings"
              >
                <Ionicons
                  name="options-outline"
                  size={15}
                  color={settingsDropdownOpen ? '#FFFFFF' : currentTheme.onSurfaceVariant}
                />
                <Ionicons
                  name={settingsDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={11}
                  color={settingsDropdownOpen ? '#FFFFFF' : currentTheme.onSurfaceVariant}
                />
              </TouchableOpacity>

              {/* Dropdown Menu */}
              {settingsDropdownOpen && (
                <View style={{
                  position: 'absolute',
                  top: 42,
                  right: 0,
                  width: 210,
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: currentTheme.border,
                  padding: 8,
                  gap: 4,
                  zIndex: 9999,
                  ...(Platform.OS === 'web' ? { boxShadow: '0 8px 24px rgba(0,0,0,0.2)' } : {}),
                }}>
                  {/* 1. Audio Sound Toggle */}
                  <TouchableOpacity
                    onPress={() => toggleMusic()}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: currentTheme.surfaceContainerLowest,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons
                        name={musicPlaying ? "volume-high" : "volume-mute"}
                        size={16}
                        color={musicPlaying ? currentTheme.secondary : currentTheme.onSurfaceVariant}
                      />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: currentTheme.onSurface }}>Sound</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: musicPlaying ? currentTheme.success : currentTheme.onSurfaceVariant }}>
                      {musicPlaying ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>

                  {/* 2. Theme Mode Toggle */}
                  <TouchableOpacity
                    onPress={() => toggleTheme()}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: currentTheme.surfaceContainerLowest,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons
                        name={themeMode === 'dark' ? "moon" : "sunny"}
                        size={16}
                        color={themeMode === 'dark' ? currentTheme.accentGold : currentTheme.primary}
                      />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: currentTheme.onSurface }}>Theme</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.primary, textTransform: 'capitalize' }}>
                      {themeMode}
                    </Text>
                  </TouchableOpacity>

                  {/* 3. Language Switch */}
                  <TouchableOpacity
                    onPress={() => switchLanguage()}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: currentTheme.surfaceContainerLowest,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="globe-outline" size={16} color={currentTheme.onSurfaceVariant} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: currentTheme.onSurface }}>Language</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.primary }}>
                      {language === 'am' ? 'Amharic' : 'English'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Admin User Chip matching mockups */}
            <View style={[s.userChip, { backgroundColor: currentTheme.surfaceContainer, borderColor: currentTheme.border }]}>
              <Avatar uri={(user as any)?.avatar} name={user?.username} size={30} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[s.userName, { color: currentTheme.onSurface }]} numberOfLines={1}>{user?.username || 'yared'}</Text>
                <Text style={[s.userOnline, { color: currentTheme.onSurfaceVariant }]}>{isSuperAdmin ? 'SuperAdmin' : 'Admin'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Main Routed View Canvas (Clean flat background) */}
        <View style={[
          s.mainCanvas,
          { marginLeft: sidebarW, backgroundColor: currentTheme.background },
          Platform.OS === 'web' ? ({
            height: `calc(100vh - ${TOPBAR_H}px)`,
            maxHeight: `calc(100vh - ${TOPBAR_H}px)`,
            overflow: 'hidden',
          } as any) : {},
        ]}>
          <Slot />
        </View>

        <LogoutConfirmation
          visible={logoutModalVisible}
          onCancel={() => setLogoutModalVisible(false)}
          onConfirm={async () => {
            setLogoutModalVisible(false);
            await logout();
            router.replace('/(auth)/login' as any);
          }}
        />
      </View>
    </AdminThemeContext.Provider>
  );
}

export default function AdminLayout() {
  return (
    <AdminNotificationProvider>
      <AdminLayoutInner />
    </AdminNotificationProvider>
  );
}

// ─── Cleaned, Anti-Slop Component Styles ───────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background, flexDirection: 'row' },
  sidebar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 40,
    backgroundColor: C.surfaceContainerLowest,
    borderRightWidth: 1, borderRightColor: C.border,
  },
  sidebarBrand: { 
    flexDirection: 'row', alignItems: 'center', gap: 10, 
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 
  },
  logoImg: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: C.border, flexShrink: 0 },
  logoText: { color: C.onSurface, fontSize: 15, fontWeight: '900', letterSpacing: -0.3, flex: 1 },
  collapseToggleBtn: { 
    marginLeft: 'auto', width: 28, height: 28, borderRadius: 6, 
    alignItems: 'center', justifyContent: 'center', 
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: C.border 
  },
  sidebarRole: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500', paddingHorizontal: 20, marginTop: 2, marginBottom: 8 },
  navList: { flex: 1, minHeight: 0 },

  groupHeader: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingVertical: 8 
  },
  groupHeaderText: { 
    color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', 
    letterSpacing: 1.2, textTransform: 'uppercase' 
  },
  groupItemsContainer: { paddingHorizontal: 10 },
  groupDividerCollapsed: { 
    height: 1, backgroundColor: C.border, marginVertical: 8, marginHorizontal: 12 
  },

  navItem: { 
    flexDirection: 'row', alignItems: 'center', gap: 12, 
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, 
    marginBottom: 2, borderWidth: 1, borderColor: 'transparent' 
  },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 44, height: 44, alignSelf: 'center', marginBottom: 4 },
  navItemActive: { 
    backgroundColor: '#333A48', 
    borderColor: '#FF2D55', 
  },
  navIconWrap: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: '#FF2D55' },
  navLabel: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600', flex: 1 },
  navLabelActive: { color: '#ffffff', fontWeight: '800' },
  activeIndicator: { width: 4, height: 16, borderRadius: 2, backgroundColor: '#FF2D55' },

  sidebarFooter: { 
    paddingHorizontal: 14, paddingBottom: 12, 
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, gap: 6 
  },
  footerBtnCollapsed: { paddingHorizontal: 0, width: 44, height: 44, borderRadius: 10, justifyContent: 'center' },
  footerHomeBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, 
    backgroundColor: 'rgba(34, 211, 238, 0.08)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.25)', 
    borderRadius: 10, paddingVertical: 10 
  },
  footerHomeBtnText: { color: C.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  emergencyBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, 
    backgroundColor: 'rgba(244, 63, 94, 0.08)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.25)', 
    borderRadius: 10, paddingVertical: 10 
  },
  emergencyText: { color: C.error, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  footerLinkIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  footerLinkIconActive: { backgroundColor: 'rgba(255, 45, 85, 0.15)' },
  footerLinkText: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600' },

  topbar: { 
    position: 'absolute', top: 0, right: 0, height: TOPBAR_H, zIndex: 30, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 24, gap: 16,
    backgroundColor: C.surfaceContainerLowest, 
    borderBottomWidth: 1, borderBottomColor: C.border, 
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, maxWidth: 380 },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 0 },
  topbarHomeBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: 'rgba(255, 45, 85, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 45, 85, 0.25)', 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 
  },
  topbarHomeBadgeText: { color: C.secondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  balanceGroup: { alignItems: 'flex-end' },
  balanceLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  balanceValue: { color: C.primary, fontSize: 13, fontWeight: '800' },
  topbarSep: { height: 16, width: 1, backgroundColor: C.border },
  topbarActionBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 5, 
    backgroundColor: C.surfaceContainer, paddingHorizontal: 9, paddingVertical: 6, 
    borderRadius: 8, borderWidth: 1, borderColor: C.border 
  },
  topbarLangText: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '800' },
  userChip: { 
    flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 14, 
    paddingVertical: 5, borderRadius: 10, backgroundColor: C.surfaceContainer, 
    borderWidth: 1, borderColor: C.border 
  },
  avatarContainer: { position: 'relative' },
  userAvatar: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#313D4A', alignItems: 'center', justifyContent: 'center' },
  statusIndicator: { position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: C.success, borderWidth: 1.5, borderColor: C.surfaceContainerLowest },
  userName: { color: C.onSurface, fontSize: 12, fontWeight: '800', lineHeight: 14 },
  userOnline: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '500' },

  mainCanvas: {
    flex: 1,
    marginTop: TOPBAR_H,
    padding: 0,
    backgroundColor: C.background,
    minHeight: 0,
    minWidth: 0,
  },

  // Mobile Specific Layout Styles
  mobileSafeArea: { backgroundColor: C.surfaceContainerLowest },
  mobileTopbar: { 
    height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.border, 
    backgroundColor: C.surfaceContainerLowest 
  },
  mobileLogo: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: C.border },
  mobileTopbarTitle: { color: C.onSurface, fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  mobileHeaderIconBtn: { 
    width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', 
    backgroundColor: C.surfaceContainer, borderWidth: 1, borderColor: C.border 
  },
  mobileLangBtn: { 
    height: 36, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', 
    backgroundColor: C.surfaceContainer, borderWidth: 1, borderColor: C.border 
  },
  mobileLangText: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '800' },
  mobileUserChip: { 
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#313D4A', borderWidth: 1, borderColor: C.border 
  },
  mobileUserInitial: { color: '#ffffff', fontSize: 12, fontWeight: '900' },

  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.75)' },
  drawerContainer: { 
    width: 280, height: '100%', backgroundColor: C.surfaceContainerLowest, 
    borderRightWidth: 1, borderRightColor: C.border 
  },
  drawerHeader: { 
    padding: 18, borderBottomWidth: 1, borderBottomColor: C.border, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  drawerHeaderTitle: { color: C.onSurface, fontSize: 15, fontWeight: '900' },
  drawerHeaderSubtitle: { color: C.secondary, fontSize: 11, fontWeight: '600' },
  drawerCloseBtn: { 
    width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', 
    backgroundColor: C.surfaceContainer, borderWidth: 1, borderColor: C.border 
  },
  drawerFooter: { 
    padding: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 8 
  },
  drawerHomeBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, 
    backgroundColor: 'rgba(255, 45, 85, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 45, 85, 0.25)', 
    paddingVertical: 12, borderRadius: 10 
  },
  drawerHomeBtnText: { color: C.secondary, fontSize: 12, fontWeight: '800' },

  bottomBar: { 
    flexDirection: 'row', backgroundColor: C.surfaceContainerLowest, 
    borderTopWidth: 1, borderTopColor: C.border 
  },
  bottomTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 3 },
  bottomTabIconBox: { width: 34, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  bottomTabIconBoxActive: { backgroundColor: 'rgba(255, 45, 85, 0.15)' },
  bottomTabLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  bottomTabLabelActive: { color: '#ffffff', fontWeight: '800' },

  // Lockscreen Gate Styles
  lockScreen: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockBox: { 
    width: '100%', maxWidth: 360, padding: 28, backgroundColor: C.surfaceContainerLowest, 
    borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' 
  },
  lockIconWrap: { 
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#313D4A', 
    borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 
  },
  lockTitle: { color: C.onSurface, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  lockSubtitle: { color: C.onSurfaceVariant, fontSize: 12, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  errorBadge: { color: C.error, fontSize: 12, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  primaryBtn: { 
    width: '100%', paddingVertical: 14, borderRadius: 10, 
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' 
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  quickPassBtn: { 
    width: '100%', paddingVertical: 12, borderRadius: 10, 
    backgroundColor: 'rgba(34, 211, 238, 0.08)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.3)', 
    alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row', gap: 6 
  },
  quickPassText: { color: C.secondary, fontSize: 12, fontWeight: '800' },
  otpInput: { 
    width: '100%', backgroundColor: C.surfaceContainer, borderWidth: 1, borderColor: C.border, 
    borderRadius: 10, paddingVertical: 14, color: '#ffffff', fontSize: 20, textAlign: 'center', 
    letterSpacing: 10, marginBottom: 16, fontWeight: '900' 
  },
  returnLink: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600' },
});
