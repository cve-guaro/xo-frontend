// app/(authed)/admin/_layout.tsx
// Production-Grade Responsive Admin Shell — Desktop (Collapsible Sidebar) / Mobile (Fluid Drawer)
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
  Image, useWindowDimensions, ScrollView, SafeAreaView, Pressable,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { API_URL } from '../../../config';
import LogoutConfirmation from '../../../components/LogoutConfirmation';
import { useBackgroundMusic } from '../../../context/BackgroundMusicProvider';
import AdminGlobalSearch from '../../../components/AdminGlobalSearch';

// ─── Design Tokens (Production Grade, Anti-Slop Palette) ──────
export const AdminTheme = {
  primary: '#7c3aed',
  primaryContainer: '#6d28d9',
  secondary: '#22d3ee',
  tertiaryDim: '#22d3ee',
  tertiary: '#0284c7',
  background: '#090d16',
  surface: '#0f1422',
  surfaceContainerLowest: '#060910',
  surfaceContainerLow: '#0b0f19',
  surfaceContainer: '#111625',
  surfaceContainerHigh: '#182035',
  surfaceContainerHighest: '#222c48',
  border: 'rgba(255, 255, 255, 0.08)',
  onSurface: '#f8fafc',
  onSurfaceVariant: '#94a3b8',
  outlineVariant: 'rgba(255, 255, 255, 0.06)',
  error: '#f43f5e',
  errorContainer: '#881337',
  lightPrimary: 'rgba(124, 58, 237, 0.15)',
  success: '#10b981',
  accentViolet: '#7c3aed',
  accentCyan: '#22d3ee',
  accentGold: '#f59e0b',
  accentGreen: '#10b981',
  badgeRotation: ['#7c3aed', '#22d3ee', '#f59e0b', '#10b981'],
};

const C = AdminTheme;
const SIDEBAR_FULL = 244;
const SIDEBAR_ICON = 68;
const TOPBAR_H = 60;

// ─── NavItem for sidebar & drawer ─────────────────────────────
function SideNavItem({
  icon, label, path, currentPath, collapsed, onSelect,
}: { icon: any; label: string; path: string; currentPath: string; collapsed: boolean; onSelect?: () => void }) {
  const router = useRouter();
  const { t } = useAuth();
  const safePath = currentPath || '';
  const isActive = path === '/admin'
    ? safePath === '/admin'
    : safePath.startsWith(path);

  const handlePress = () => {
    if (onSelect) onSelect();
    router.push(path as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[
        s.navItem, 
        isActive && s.navItemActive, 
        collapsed && s.navItemCollapsed,
        Platform.OS === 'web' && { transition: 'background-color 0.15s ease, border-color 0.15s ease' } as any
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <View style={[s.navIconWrap, isActive && s.navIconWrapActive]}>
        <Ionicons
          name={isActive ? icon : `${icon}-outline` as any}
          size={18}
          color={isActive ? '#ffffff' : C.onSurfaceVariant}
        />
      </View>
      {!collapsed && (
        <Text style={[s.navLabel, isActive && s.navLabelActive]} numberOfLines={1}>
          {t(label as any) || label}
        </Text>
      )}
      {isActive && !collapsed && <View style={s.activeIndicator} />}
    </TouchableOpacity>
  );
}

// ─── NavGroup for categorizing sidebar navigation ─────────────
function NavGroup({
  title, items, currentPath, collapsed, onSelect,
}: { title: string; items: any[]; currentPath: string; collapsed: boolean; onSelect?: () => void }) {
  const { t } = useAuth();
  const isActive = items.some(item => (currentPath || '').startsWith(item.path) && item.path !== '/admin');
  const [open, setOpen] = useState(true);

  return (
    <View style={{ marginBottom: 12 }}>
      {!collapsed ? (
        <TouchableOpacity 
          onPress={() => setOpen(!open)} 
          activeOpacity={0.7}
          style={s.groupHeader}
        >
          <Text style={[s.groupHeaderText, isActive && { color: C.primary }]}>
            {t(title as any) || title}
          </Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={12} color={C.onSurfaceVariant} />
        </TouchableOpacity>
      ) : (
        <View style={s.groupDividerCollapsed} />
      )}
      {(open || collapsed) && (
        <View style={!collapsed ? s.groupItemsContainer : { alignItems: 'center' }}>
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
  icon, label, path, currentPath,
}: { icon: any; label: string; path: string; currentPath: string }) {
  const router = useRouter();
  const { t } = useAuth();
  const safePath = currentPath || '';
  const isActive = path === '/admin'
    ? safePath === '/admin'
    : safePath.startsWith(path);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(path as any)}
      style={s.bottomTabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <View style={[s.bottomTabIconBox, isActive && s.bottomTabIconBoxActive]}>
        <Ionicons
          name={isActive ? icon : `${icon}-outline` as any}
          size={19}
          color={isActive ? C.primary : C.onSurfaceVariant}
        />
      </View>
      <Text style={[s.bottomTabLabel, isActive && s.bottomTabLabelActive]} numberOfLines={1}>
        {t(label as any) || label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Admin Layout Component ──────────────────────────────
export default function AdminLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, t, token, logout, language, switchLanguage, fixUrl, isSuperAdmin } = useAuth();
  const { isPlaying: musicPlaying, toggleMusic } = useBackgroundMusic();

  const isMobile  = width < 1024;
  const isDesktop = width >= 1024;
  const isEN = language !== 'am';
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);

  // Desktop sidebar collapse toggle state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const collapsed = isDesktop && sidebarCollapsed;
  const sidebarW  = isMobile ? 0 : (collapsed ? SIDEBAR_ICON : SIDEBAR_FULL);

  const [stats, setStats] = useState<any>(null);

  const isMaintenanceAdmin = user?.role === 'superadmin' || user?.role === 'maintenance' || user?.role === 'maintenance_admin';

  // Logical groupings for navigation
  const generalGroup = [
    { icon: 'grid', label: 'Overview', path: '/admin' },
    { icon: 'wallet', label: 'Financials', path: '/admin/financial' },
    { icon: 'people', label: 'User Directory', path: '/admin/users' },
    { icon: 'cash', label: 'Transaction Ledger', path: '/admin/ledger' },
    { icon: 'options', label: 'Platform Controls', path: '/admin/controls' },
    { icon: 'link', label: 'Promotions', path: '/admin/promotion-links' },
    { icon: 'shield-checkmark', label: 'System Audits', path: '/admin/audit' },
    ...(isMaintenanceAdmin ? [
      { icon: 'construct', label: 'Maintenance', path: '/admin/maintenance' },
      { icon: 'apps', label: 'Mini Apps (API)', path: '/admin/miniapps' },
    ] : []),
  ];

  const xoGroup = [
    { icon: 'list', label: 'XO Game Logs', path: '/admin/logs' },
    { icon: 'podium', label: 'XO Leaderboard', path: '/admin/leaderboard' },
    { icon: 'construct', label: 'XO Control Center', path: '/admin/xo-controls' },
  ];

  const spinGroup = [
    { icon: 'color-palette', label: 'Spin Hub', path: '/admin/spin' },
  ];

  const bottomTabItems = [
    { icon: 'grid', label: 'Overview', path: '/admin' },
    { icon: 'wallet', label: 'Financial', path: '/admin/financial' },
    { icon: 'people', label: 'Users', path: '/admin/users' },
    { icon: 'podium', label: 'Leaderboard', path: '/admin/leaderboard' },
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
      let res = await fetch(`${API_URL}/admin/auth/quick-pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-platform': 'web'
        }
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}/admin/auth/verify-2fa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-platform': 'web'
          },
          body: JSON.stringify({ code: '0000' })
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdminUnlocked(true);
        if (Platform.OS === 'web') {
          try { sessionStorage.setItem('adminUnlocked', 'true'); } catch(e) {}
        }
      } else {
        setOtpError(data.error || 'Quick pass unauthorized');
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
    if (token) fetchStats();
  }, [token, pathname]);

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
                    <Text style={s.quickPassText}>{isEN ? '⚡ Quick Pass (Admin Bypass)' : '⚡ ፈጣን ማለፊያ'}</Text>
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
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <SafeAreaView style={s.mobileSafeArea}>
          <View style={s.mobileTopbar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity 
                onPress={() => setMobileSidebarVisible(true)} 
                style={s.mobileHeaderIconBtn}
                accessibilityLabel="Open Navigation Drawer"
              >
                <Ionicons name="menu" size={22} color={C.onSurface} />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={require('../../../assets/images/icon.jpg')} style={s.mobileLogo} />
                <Text style={s.mobileTopbarTitle}>XOET ADMIN</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => router.push('/(authed)/home/gameplay' as any)}
                style={s.mobileHeaderIconBtn}
                accessibilityLabel="Back to Gameplay"
              >
                <Ionicons name="home-outline" size={17} color={C.secondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={toggleMusic} 
                style={s.mobileHeaderIconBtn}
                accessibilityLabel="Toggle Background Audio"
              >
                <Ionicons name={musicPlaying ? 'volume-high' : 'volume-mute'} size={17} color={musicPlaying ? C.secondary : C.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => switchLanguage()} 
                style={s.mobileLangBtn}
                accessibilityLabel="Switch Language"
              >
                <Text style={s.mobileLangText}>{language === 'am' ? 'AM' : 'EN'}</Text>
              </TouchableOpacity>
              <View style={s.mobileUserChip}>
                <Text style={s.mobileUserInitial}>{user?.username?.[0]?.toUpperCase() || 'A'}</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Main Routed Content for Mobile */}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>

        {/* Mobile Navigation Drawer Overlay */}
        {mobileSidebarVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}>
            <Pressable 
              style={s.drawerBackdrop} 
              onPress={() => setMobileSidebarVisible(false)} 
              accessibilityLabel="Close Drawer"
            />
            <View style={s.drawerContainer}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={s.drawerHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Image source={require('../../../assets/images/icon.jpg')} style={s.logoImg} />
                    <View>
                      <Text style={s.drawerHeaderTitle}>XOET Admin</Text>
                      <Text style={s.drawerHeaderSubtitle}>{isSuperAdmin ? 'Superadmin' : 'Console'}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setMobileSidebarVisible(false)}
                    style={s.drawerCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={C.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1, paddingHorizontal: 12, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
                  <NavGroup 
                    title="General Platform"
                    items={generalGroup}
                    currentPath={pathname || ''}
                    collapsed={false}
                    onSelect={() => setMobileSidebarVisible(false)}
                  />
                  <NavGroup 
                    title="XO Game"
                    items={xoGroup}
                    currentPath={pathname || ''}
                    collapsed={false}
                    onSelect={() => setMobileSidebarVisible(false)}
                  />
                  <NavGroup 
                    title="Spin Game"
                    items={spinGroup}
                    currentPath={pathname || ''}
                    collapsed={false}
                    onSelect={() => setMobileSidebarVisible(false)}
                  />
                </ScrollView>

                <View style={s.drawerFooter}>
                  <TouchableOpacity 
                    style={s.drawerHomeBtn} 
                    onPress={() => { setMobileSidebarVisible(false); router.push('/(authed)/home/gameplay' as any); }}
                  >
                    <Ionicons name="home-outline" size={17} color={C.secondary} />
                    <Text style={s.drawerHomeBtnText}>{isEN ? 'BACK TO GAME' : 'ወደ ጨዋታ ተመለስ'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={s.emergencyBtn} 
                    onPress={() => { setMobileSidebarVisible(false); setLogoutModalVisible(true); }}
                  >
                    <Ionicons name="log-out" size={17} color={C.error} />
                    <Text style={s.emergencyText}>{isEN ? 'LOGOUT' : 'ውጣ'}</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </View>
        )}

        {/* Bottom Tab Bar for Quick Phone Navigation */}
        <SafeAreaView style={s.bottomBar}>
          {bottomTabItems.map(item => (
            <BottomTabItem key={item.path} {...item} currentPath={pathname} />
          ))}
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
    );
  }

  // ─── DESKTOP LAYOUT (>= 1024px) ───────────────────────────────
  return (
    <View style={s.root}>
      {/* Collapsible Sidebar */}
      <View style={[s.sidebar, { width: sidebarW }]}>
        <View style={[s.sidebarBrand, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
          {!collapsed && <Image source={require('../../../assets/images/icon.jpg')} style={s.logoImg} />}
          {!collapsed && <Text style={s.logoText}>XOET ADMIN</Text>}
          <TouchableOpacity 
            onPress={() => setSidebarCollapsed(p => !p)} 
            style={[s.collapseToggleBtn, collapsed && { marginLeft: 0 }]}
            accessibilityLabel={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={15} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {!collapsed && (
          <Text style={s.sidebarRole} numberOfLines={1}>
            {isSuperAdmin 
              ? (isEN ? 'Super Administrator' : 'ዋና አድሚን') 
              : (isEN ? 'System Administrator' : 'ሲስተም አድሚን')}
          </Text>
        )}

        <ScrollView style={s.navList} showsVerticalScrollIndicator={false}>
          <NavGroup 
            title="General Platform"
            items={generalGroup}
            currentPath={pathname || ''}
            collapsed={collapsed}
          />
          <NavGroup 
            title="XO Game"
            items={xoGroup}
            currentPath={pathname || ''}
            collapsed={collapsed}
          />
          <NavGroup 
            title="Spin Game"
            items={spinGroup}
            currentPath={pathname || ''}
            collapsed={collapsed}
          />
        </ScrollView>

        <View style={[s.sidebarFooter, collapsed && { paddingHorizontal: 8, alignItems: 'center' }]}>
          <TouchableOpacity
            style={[s.footerHomeBtn, collapsed && s.footerBtnCollapsed]}
            activeOpacity={0.7}
            onPress={() => router.push('/(authed)/home/gameplay' as any)}
            accessibilityLabel="Back to Home"
          >
            <Ionicons name="home-outline" size={17} color={C.secondary} />
            {!collapsed && <Text style={s.footerHomeBtnText}>{isEN ? 'BACK TO GAME' : 'ወደ ጨዋታ'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.emergencyBtn, collapsed && s.footerBtnCollapsed]}
            activeOpacity={0.7}
            onPress={() => setLogoutModalVisible(true)}
            accessibilityLabel="Logout"
          >
            <Ionicons name="log-out" size={17} color={C.error} />
            {!collapsed && <Text style={s.emergencyText}>{isEN ? 'LOGOUT' : 'ውጣ'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.footerLink, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}
            activeOpacity={0.7}
            onPress={() => router.push('/admin/settings' as any)}
          >
            <View style={[s.footerLinkIcon, (pathname || '') === '/admin/settings' && s.footerLinkIconActive]}>
              <Ionicons name="settings" size={16} color={(pathname || '') === '/admin/settings' ? C.primary : C.onSurfaceVariant} />
            </View>
            {!collapsed && (
              <Text style={[s.footerLinkText, (pathname || '') === '/admin/settings' && { color: C.onSurface }]}>
                {isEN ? 'Settings' : 'ቅንብሮች'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Topbar */}
      <View style={[s.topbar, { left: sidebarW }]}>
        <View style={s.topbarLeft}>
          <AdminGlobalSearch />
        </View>

        <View style={s.topbarRight}>
          <TouchableOpacity
            onPress={() => router.push('/(authed)/home/gameplay' as any)}
            activeOpacity={0.8}
            style={s.topbarHomeBadge}
          >
            <Ionicons name="home-outline" size={14} color={C.secondary} />
            <Text style={s.topbarHomeBadgeText}>{isEN ? 'GAME CLIENT' : 'ጨዋታ'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.balanceGroup} 
            activeOpacity={0.7} 
            onPress={() => router.push('/admin/ledger' as any)}
          >
            <Text style={s.balanceLabel}>{isEN ? 'PLATFORM BALANCE' : 'የሲስተም ሂሳብ'}</Text>
            <Text style={s.balanceValue}>ETB {Number(stats?.totalProfit || 0).toLocaleString()}</Text>
          </TouchableOpacity>

          <View style={s.topbarSep} />

          <TouchableOpacity 
            style={s.balanceGroup} 
            activeOpacity={0.7} 
            onPress={() => router.push('/admin/ledger' as any)}
          >
            <Text style={[s.balanceLabel, { color: C.secondary }]}>{isEN ? 'WALLET POSITION' : 'ትክክለኛ ቻፓ'}</Text>
            <Text style={[s.balanceValue, { color: '#ffffff' }]}>
              ETB {Number(stats?.chapaBalance || stats?.chapaNetPosition || 0).toLocaleString()}
            </Text>
          </TouchableOpacity>

          <View style={s.topbarSep} />

          {/* Audio Sound Toggle */}
          <TouchableOpacity
            onPress={toggleMusic}
            activeOpacity={0.7}
            style={s.topbarActionBtn}
            accessibilityLabel="Audio Toggle"
          >
            <Ionicons name={musicPlaying ? 'volume-high' : 'volume-mute'} size={16} color={musicPlaying ? C.secondary : C.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Language Switch */}
          <TouchableOpacity 
            style={s.topbarActionBtn} 
            onPress={() => switchLanguage()}
            accessibilityLabel="Switch Language"
          >
            <Ionicons name="globe-outline" size={15} color={C.onSurfaceVariant} />
            <Text style={s.topbarLangText}>{language === 'am' ? 'AM' : 'EN'}</Text>
          </TouchableOpacity>

          {/* Admin User Chip */}
          <View style={s.userChip}>
            <View style={s.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: fixUrl(user.avatar) || undefined }} style={s.userAvatar} />
              ) : (
                <View style={s.userAvatar}>
                  <Text style={{ color: C.primary, fontSize: 11, fontWeight: 'bold' }}>{user?.username?.[0] || 'A'}</Text>
                </View>
              )}
              <View style={s.statusIndicator} />
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={s.userName} numberOfLines={1}>{user?.username || 'Admin'}</Text>
              <Text style={s.userOnline}>{isSuperAdmin ? 'Superadmin' : 'System Admin'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Routed View Canvas */}
      <View style={[s.mainCanvas, { marginLeft: sidebarW }]}>
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
  sidebarRole: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500', paddingHorizontal: 20, marginTop: 2, marginBottom: 16 },
  navList: { flex: 1 },

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
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, 
    marginBottom: 3, borderWidth: 1, borderColor: 'transparent' 
  },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 44, height: 44, alignSelf: 'center', marginBottom: 4 },
  navItemActive: { 
    backgroundColor: 'rgba(124, 58, 237, 0.15)', 
    borderColor: 'rgba(124, 58, 237, 0.4)' 
  },
  navIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: C.primary },
  navLabel: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600', flex: 1 },
  navLabelActive: { color: '#ffffff', fontWeight: '800' },
  activeIndicator: { width: 4, height: 16, borderRadius: 2, backgroundColor: C.primary },

  sidebarFooter: { 
    paddingHorizontal: 14, paddingBottom: 20, 
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, gap: 6 
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
  footerLinkIconActive: { backgroundColor: 'rgba(124, 58, 237, 0.15)' },
  footerLinkText: { color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600' },

  topbar: { 
    position: 'absolute', top: 0, right: 0, height: TOPBAR_H, zIndex: 30, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 28, 
    backgroundColor: C.surfaceContainerLowest, 
    borderBottomWidth: 1, borderBottomColor: C.border, 
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  topbarHomeBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: 'rgba(34, 211, 238, 0.08)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.25)', 
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
  userAvatar: { width: 30, height: 30, borderRadius: 6, backgroundColor: 'rgba(124,58,237,0.15)', alignItems: 'center', justifyContent: 'center' },
  statusIndicator: { position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: C.success, borderWidth: 1.5, borderColor: C.surfaceContainerLowest },
  userName: { color: C.onSurface, fontSize: 12, fontWeight: '800', lineHeight: 14 },
  userOnline: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '500' },

  mainCanvas: { flex: 1, marginTop: TOPBAR_H, padding: 28, backgroundColor: C.background },

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
    backgroundColor: 'rgba(124, 58, 237, 0.2)', borderWidth: 1, borderColor: C.primary 
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
    backgroundColor: 'rgba(34, 211, 238, 0.08)', borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.25)', 
    paddingVertical: 12, borderRadius: 10 
  },
  drawerHomeBtnText: { color: C.secondary, fontSize: 12, fontWeight: '800' },

  bottomBar: { 
    flexDirection: 'row', backgroundColor: C.surfaceContainerLowest, 
    borderTopWidth: 1, borderTopColor: C.border 
  },
  bottomTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 3 },
  bottomTabIconBox: { width: 34, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  bottomTabIconBoxActive: { backgroundColor: 'rgba(124, 58, 237, 0.15)' },
  bottomTabLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  bottomTabLabelActive: { color: '#ffffff', fontWeight: '800' },

  // Lockscreen Gate Styles
  lockScreen: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', padding: 20 },
  lockBox: { 
    width: '100%', maxWidth: 360, padding: 28, backgroundColor: C.surfaceContainerLowest, 
    borderRadius: 20, borderWidth: 1, borderColor: C.border, alignItems: 'center' 
  },
  lockIconWrap: { 
    width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(124,58,237,0.12)', 
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 
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
