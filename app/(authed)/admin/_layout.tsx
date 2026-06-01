// app/(authed)/admin/_layout.tsx
// Responsive Admin Shell — Mobile / Tablet / Desktop
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


// ─── Design Tokens ────────────────────────────────────────────
export const AdminTheme = {
  primary: '#00daf3',
  primaryContainer: '#00a3ff',
  secondary: '#00daf3',
  tertiaryDim: '#00daf3',
  tertiary: '#00a3ff',
  background: '#09090b',
  surface: '#18181b',
  surfaceContainerLowest: '#030303',
  surfaceContainerLow: '#0f0f11',
  surfaceContainer: '#1e1e24',
  surfaceContainerHigh: '#27272a',
  surfaceContainerHighest: '#3f3f46',
  onSurface: '#f4f4f5',
  onSurfaceVariant: '#a1a1aa',
  outlineVariant: 'rgba(39, 39, 42, 0.6)',
  error: '#ef4444',
  errorContainer: '#7f1d1d',
};

const C = AdminTheme;
const SIDEBAR_FULL = 256;
const SIDEBAR_ICON = 64;
const TOPBAR_H = 60;

 const NAV_ITEMS = [
   { icon: 'grid',    label: 'Overview',        path: '/admin' },
   { icon: 'wallet',  label: 'Financial',       path: '/admin/financial' },
   { icon: 'options', label: 'Control Center', path: '/admin/controls' },
   { icon: 'people',  label: 'Users',           path: '/admin/users' },
   { icon: 'cash',    label: 'Transaction',     path: '/admin/ledger' },
   { icon: 'list',    label: 'Game Logs',       path: '/admin/logs' },
   { icon: 'link',    label: 'Promotions',      path: '/admin/promotion-links' },
   { icon: 'shield-checkmark', label: 'Audit Logs', path: '/admin/audit' },
   { icon: 'podium',  label: 'Leaderboard',     path: '/admin/leaderboard' },
   { icon: 'settings', label: 'Settings',        path: '/admin/settings' },
   { icon: 'home',    label: 'Back To Home',    path: '/(authed)/home/gameplay' },
 ];


// ─── NavItem for sidebar ──────────────────────────────────────
function SideNavItem({
  icon, label, path, currentPath, collapsed,
}: { icon: any; label: string; path: string; currentPath: string; collapsed: boolean }) {
  const router = useRouter();
  const { t } = useAuth();
  const safePath = currentPath || '';
  const isActive = path === '/admin'
    ? safePath === '/admin'
    : safePath.startsWith(path);
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push(path as any)}
      style={[
        s.navItem, 
        isActive && s.navItemActive, 
        collapsed && s.navItemCollapsed,
        Platform.OS === 'web' && { transition: 'all 0.2s ease' } as any
      ]}
    >
      <View style={[s.navIconWrap, isActive && s.navIconWrapActive]}>
        <Ionicons
          name={isActive ? icon : `${icon}-outline` as any}
          size={18}
          color={isActive ? '#000' : C.onSurfaceVariant}
        />
      </View>
      {!collapsed && (
        <Text style={[s.navLabel, isActive && s.navLabelActive]} numberOfLines={1}>
          {t(label as any)}
        </Text>
      )}
      {isActive && !collapsed && <View style={s.activeIndicator} />}
    </TouchableOpacity>
  );
}

// ─── NavGroup for sidebar ─────────────────────────────────────
function NavGroup({
  title, items, currentPath, collapsed,
}: { title: string; items: any[]; currentPath: string; collapsed: boolean }) {
  const { t } = useAuth();
  const isActive = items.some(item => (currentPath || '').startsWith(item.path) && item.path !== '/admin');
  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  return (
    <View style={{ marginBottom: 8 }}>
      {!collapsed && (
        <TouchableOpacity 
          onPress={() => setOpen(!open)} 
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 10 }}
        >
          <Text style={{ color: isActive ? C.primary : C.onSurfaceVariant, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t(title as any) || title}
          </Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={isActive ? C.primary : C.onSurfaceVariant} />
        </TouchableOpacity>
      )}
      {(open || collapsed) && (
        <View style={!collapsed ? { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(39, 39, 42, 0.6)', marginLeft: 30, marginTop: 4 } : {}}>
          {items.map(item => (
            <SideNavItem key={item.path} {...item} currentPath={currentPath} collapsed={collapsed} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Bottom tab item for mobile ───────────────────────────────
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
    >
      <Ionicons
        name={isActive ? icon : `${icon}-outline` as any}
        size={22}
        color={isActive ? C.primaryContainer : C.onSurfaceVariant}
      />
      <Text style={[s.bottomTabLabel, isActive && { color: C.primaryContainer }]} numberOfLines={1}>
        {t(label as any)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Layout ──────────────────────────────────────────────
// ─── Main Layout ──────────────────────────────────────────────
export default function AdminLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, t, token, logout, language, switchLanguage, fixUrl, isSuperAdmin } = useAuth();
  const { isPlaying: musicPlaying, toggleMusic } = useBackgroundMusic();

  const isMobile  = width < 1024;
  const isTablet  = false;
  const isDesktop = width >= 1024;
  const isEN = language !== 'am';
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const collapsed = isTablet || sidebarCollapsed;
  const sidebarW  = isMobile ? 0 : (collapsed ? SIDEBAR_ICON : SIDEBAR_FULL);

  const [stats, setStats] = useState<any>(null);

  const isMaintenanceAdmin = user?.role === 'superadmin' || user?.role === 'maintenance' || user?.role === 'maintenance_admin';
  const dynamicNavItems = [...NAV_ITEMS];
  if (isMaintenanceAdmin) {
    dynamicNavItems.splice(6, 0, { icon: 'construct', label: 'Maintenance', path: '/admin/maintenance' });
  }

  // ─── 2FA STATE ────────────────────────────────────────────────
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

  const sendAdminOTP = async () => {
    try {
      setOtpLoading(true); setOtpError('');
      const res = await fetch(`${API_URL}/admin/auth/send-2fa`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'x-platform': 'web' }
      });
      const data = await res.json();
      if (res.ok) setOtpSent(true);
      else setOtpError(data.error || 'Failed to send code');
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
      }
      else setOtpError(data.error || 'Invalid code');
    } catch (e) {
      setOtpError('Network error');
    } finally {
      setOtpLoading(false);
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

  const primaryNav = dynamicNavItems.slice(0, 4);   // Overview, Users, Ledger, Logs
  const secondaryNav = dynamicNavItems.slice(4); // Promos, Audit, Settings, [Maintenance], Home

  // ─── ADMIN 2FA GATE ───────────────────────────────────────────
  if (!adminUnlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <View style={StyleSheet.absoluteFill}>
          <Image source={require('../../../assets/images/login-bg-premium.png')} style={{ width: '100%', height: '100%', opacity: 0.1 }} />
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,9,14,0.92)' }} />
        </View>

        <View style={{ width: 340, padding: 32, backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, borderColor: C.outlineVariant, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(0, 218, 243, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Ionicons name="shield-checkmark" size={32} color={C.primary} />
          </View>
          <Text style={{ color: C.onSurface, fontSize: 20, fontWeight: '900', marginBottom: 8 }}>{isEN ? 'Admin Security' : 'የአድሚን ደህንነት'}</Text>
          <Text style={{ color: C.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            {isEN ? 'Confirm your identity to access the administrative dashboard.' : 'የአስተዳደር ዳሽቦርድ ለመድረስ ማንነትዎን ያረጋገጡ።'}
          </Text>

          {otpError ? <Text style={{ color: C.error, fontSize: 12, marginBottom: 12 }}>{otpError}</Text> : null}

          {!otpSent ? (
            <TouchableOpacity
              onPress={sendAdminOTP}
              disabled={otpLoading}
              style={{ width: '100%', padding: 16, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', opacity: otpLoading ? 0.7 : 1 }}
            >
              {otpLoading ? <ActivityIndicator color="#0c0c1f" /> : <Text style={{ color: '#0c0c1f', fontSize: 14, fontWeight: '800' }}>{isEN ? 'Send Security Code' : 'መለያ ኮድ ላክ'}</Text>}
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder={isEN ? "4-Digit Code" : "ባለ 4 አሃዝ ኮድ"}
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="number-pad"
                maxLength={4}
                style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.outlineVariant, borderRadius: 12, padding: 16, color: '#fff', fontSize: 18, textAlign: 'center', letterSpacing: 8, marginBottom: 16, fontWeight: 'bold' }}
              />
              <TouchableOpacity
                onPress={verifyAdminOTP}
                disabled={otpLoading || otpCode.length < 4}
                style={{ width: '100%', padding: 16, borderRadius: 12, backgroundColor: (otpCode.length === 4) ? C.primary : 'rgba(255,255,255,0.1)', alignItems: 'center', opacity: otpLoading ? 0.7 : 1 }}
              >
                {otpLoading ? <ActivityIndicator color="#0c0c1f" /> : <Text style={{ color: (otpCode.length === 4) ? '#0c0c1f' : 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '800' }}>{isEN ? 'Verify & Unlock' : 'አረጋግጥ እና ክፈት'}</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => router.replace('/(authed)/home/gameplay' as any)} style={{ marginTop: 24 }}>
                 <Text style={{ color: C.onSurfaceVariant, fontSize: 12, fontWeight: '600' }}>{isEN ? 'Return to Game' : 'ወደ ጨዋታ ተመለስ'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ─── MOBILE LAYOUT ────────────────────────────────────────────
  if (isMobile) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background }}>
        <SafeAreaView style={{ backgroundColor: '#111115' }}>
          <View style={s.mobileTopbar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setMobileSidebarVisible(true)} style={s.iconBtn}>
                <Ionicons name="menu" size={24} color={C.primary} />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={require('../../../assets/images/icon.jpg')} style={s.mobileLogo} />
                <Text style={s.mobileTopbarTitle}>{isEN ? 'XOET' : 'XOET'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={toggleMusic} style={s.iconBtn}>
                <Ionicons name={musicPlaying ? 'volume-high' : 'volume-mute'} size={18} color={musicPlaying ? C.secondary : C.error} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => switchLanguage()} style={s.iconBtn}>
                <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800' }}>
                  {language === 'am' ? 'AM' : 'EN'}
                </Text>
              </TouchableOpacity>
              <View style={s.userChipSmall}>
                <Text style={s.userChipName} numberOfLines={1}>
                  {user?.username?.[0]?.toUpperCase() || 'A'}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        <View style={{ flex: 1 }}>
          <Slot />
        </View>

        {/* Mobile Sidebar / Drawer */}
        {mobileSidebarVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} onPress={() => setMobileSidebarVisible(false)} />
            <View style={{ width: 280, height: '100%', backgroundColor: C.surface, borderRightWidth: 1, borderRightColor: C.outlineVariant }}>
               <SafeAreaView style={{ flex: 1 }}>
                  <View style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: C.outlineVariant, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text style={{ color: C.primary, fontSize: 18, fontWeight: '900' }}>{isEN ? 'Menu' : 'ምናሌ'}</Text>
                     <TouchableOpacity onPress={() => setMobileSidebarVisible(false)}>
                        <Ionicons name="close" size={24} color={C.onSurfaceVariant} />
                     </TouchableOpacity>
                  </View>
                  <ScrollView style={{ flex: 1, padding: 12 }}>
                     <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', margin: 12, textTransform: 'uppercase' }}>{isEN ? 'Primary' : 'ዋና'}</Text>
                     {primaryNav.map(item => (
                        <SideNavItem key={item.path} {...item} currentPath={pathname} collapsed={false} />
                     ))}
                     <View style={{ height: 1, backgroundColor: C.outlineVariant, marginVertical: 12 }} />
                     <Text style={{ color: C.onSurfaceVariant, fontSize: 10, fontWeight: '800', margin: 12, textTransform: 'uppercase' }}>{isEN ? 'System & Support' : 'ሲስተም'}</Text>
                     {secondaryNav.map(item => (
                        <SideNavItem key={item.path} {...item} currentPath={pathname} collapsed={false} />
                     ))}
                  </ScrollView>
                  <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: C.outlineVariant }}>
                     <TouchableOpacity 
                        style={s.emergencyBtn} 
                        onPress={() => { setMobileSidebarVisible(false); setLogoutModalVisible(true); }}
                     >
                        <Ionicons name="log-out" size={18} color={C.error} />
                        <Text style={s.emergencyText}>{isEN ? 'LOGOUT' : 'ውጣ'}</Text>
                     </TouchableOpacity>
                  </View>
               </SafeAreaView>
            </View>
          </View>
        )}

        <SafeAreaView style={s.bottomBar}>
          {primaryNav.map(item => (
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

  // ─── TABLET / DESKTOP LAYOUT ──────────────────────────────────
  return (
    <View style={s.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[s.glow, { top: -200, left: -150, backgroundColor: 'rgba(0,218,243,0.12)' }]} />
        <View style={[s.glow, { bottom: -100, right: -100, backgroundColor: 'rgba(0,218,243,0.08)' }]} />
        <View style={[s.glow, { top: '30%', right: -200, backgroundColor: 'rgba(253,111,133,0.05)' }]} />
      </View>

      <View style={[s.sidebar, { width: sidebarW }]}>
        <View style={[s.sidebarBrand, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
          {!collapsed && <Image source={require('../../../assets/images/icon.jpg')} style={s.logoImg} />}
          {!collapsed && <Text style={s.logoText}>XOET ADMIN</Text>}
          {isDesktop && (
            <TouchableOpacity onPress={() => setSidebarCollapsed(p => !p)} style={{ marginLeft: collapsed ? 0 : 'auto' as any, padding: 4 }}>
              <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={16} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {!collapsed && (
          <Text style={s.sidebarRole} numberOfLines={1}>
            {isSuperAdmin 
              ? (isEN ? 'Super Administrator' : 'ዋና አድሚን') 
              : (isEN ? 'System Administrator' : 'ሲስተም አድሚን')}
          </Text>
        )}

        <ScrollView style={s.navList} showsVerticalScrollIndicator={false}>
          <SideNavItem icon="grid" label="Overview" path="/admin" currentPath={pathname || ''} collapsed={collapsed} />
          <SideNavItem icon="wallet" label="Financial" path="/admin/financial" currentPath={pathname || ''} collapsed={collapsed} />
          <SideNavItem icon="people" label="Users" path="/admin/users" currentPath={pathname || ''} collapsed={collapsed} />
          
          <NavGroup 
            title="Operations"
            items={[
              { icon: 'cash', label: 'Transaction', path: '/admin/ledger' },
              { icon: 'list', label: 'Game Logs', path: '/admin/logs' },
              { icon: 'podium', label: 'Leaderboard', path: '/admin/leaderboard' },
              { icon: 'options', label: 'Control Center', path: '/admin/controls' },
            ]}
            currentPath={pathname || ''}
            collapsed={collapsed}
          />

          <NavGroup 
            title="System"
            items={[
              ...(isMaintenanceAdmin ? [{ icon: 'construct', label: 'Maintenance', path: '/admin/maintenance' }] : []),
              { icon: 'shield-checkmark', label: 'Audit Logs', path: '/admin/audit' },
              { icon: 'link', label: 'Promotions', path: '/admin/promotion-links' },
              { icon: 'home', label: 'Back To Home', path: '/(authed)/home/gameplay' },
            ]}
            currentPath={pathname || ''}
            collapsed={collapsed}
          />
        </ScrollView>

        <View style={[s.sidebarFooter, collapsed && { paddingHorizontal: 8, alignItems: 'center' }]}>
          <TouchableOpacity
            style={[s.emergencyBtn, collapsed && { paddingHorizontal: 0, width: 40, height: 40, borderRadius: 12 }]}
            activeOpacity={0.7}
            onPress={() => setLogoutModalVisible(true)}
          >
            <Ionicons name="log-out" size={18} color={C.error} />
            {!collapsed && <Text style={s.emergencyText}>{isEN ? 'LOGOUT' : 'ውጣ'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.footerLink, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}
            activeOpacity={0.7}
            onPress={() => router.push('/admin/settings' as any)}
          >
            <View style={[s.footerLinkIcon, (pathname || '') === '/admin/settings' && s.footerLinkIconActive]}>
              <Ionicons name="settings" size={18} color={(pathname || '') === '/admin/settings' ? C.primary : C.onSurfaceVariant} />
            </View>
            {!collapsed && <Text style={[s.footerLinkText, (pathname || '') === '/admin/settings' && { color: C.onSurface }]}>{isEN ? 'Settings' : 'ቅንብሮች'}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[s.topbar, { left: sidebarW }]}>
        <View style={s.topbarLeft}>
          <AdminGlobalSearch />
        </View>
        <View style={s.topbarRight}>
          {isDesktop && (
            <>
              <TouchableOpacity style={s.balanceGroup} activeOpacity={0.7} onPress={() => router.push('/admin/ledger' as any)}>
                <Text style={s.balanceLabel}>{isEN ? 'PLATFORM BALANCE' : 'የሲስተም ቀሪ ሂሳብ'}</Text>
                <Text style={s.balanceValue}>ETB {Number(stats?.totalProfit || 0).toLocaleString()}</Text>
              </TouchableOpacity>
                  <View style={s.topbarSep} />
                  <TouchableOpacity style={s.balanceGroup} activeOpacity={0.7} onPress={() => router.push('/admin/ledger' as any)}>
                    <Text style={[s.balanceLabel, { color: C.secondary }]}>{isEN ? 'WALLET NET POSITION' : 'ትክክለኛ የቻፓ ሂሳብ'}</Text>
                    <Text style={[s.balanceValue, { color: '#fff' }]}>ETB {Number(stats?.chapaBalance || stats?.chapaNetPosition || 0).toLocaleString()}</Text>
                  </TouchableOpacity>
              <View style={s.topbarSep} />
            </>
          )}
          {/* Sound Controller - Right Side */}
          <TouchableOpacity
            onPress={toggleMusic}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: musicPlaying ? 'rgba(0,218,243,0.08)' : 'rgba(253,111,133,0.08)',
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
              borderWidth: 1,
              borderColor: musicPlaying ? 'rgba(0,218,243,0.2)' : 'rgba(253,111,133,0.2)',
            }}
          >
            <Ionicons name={musicPlaying ? 'volume-high' : 'volume-mute'} size={16} color={musicPlaying ? C.secondary : C.error} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn]} onPress={() => switchLanguage()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(24, 24, 27, 0.65)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.outlineVariant }}>
              <Ionicons name="globe-outline" size={16} color={C.onSurfaceVariant} />
              <Text style={{ color: C.onSurfaceVariant, fontSize: 11, fontWeight: '800' }}>{language === 'am' ? 'AM' : 'EN'}</Text>
            </View>
          </TouchableOpacity>
          <View style={[s.userChip, isTablet && { paddingRight: 8 }]}>
            <View style={s.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: fixUrl(user.avatar) || undefined }} style={s.userAvatar} />
              ) : (
                <View style={s.userAvatar}>
                  <Text style={{ color: C.primary, fontSize: 10, fontWeight: 'bold' }}>{user?.username?.[0] || 'A'}</Text>
                </View>
              )}
              <View style={s.statusIndicator} />
            </View>
            {isDesktop && (
              <View style={{ marginLeft: 8 }}>
                <Text style={s.userName} numberOfLines={1}>{user?.username || (isEN ? 'Admin' : 'አድሚን')}</Text>
                <Text style={s.userOnline}>{isSuperAdmin ? (isEN ? 'Super Admin' : 'ዋና አድሚን') : (isEN ? 'System Admin' : 'ሲስተም አድሚን')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>


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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background, flexDirection: 'row' },
  glow: { position: 'absolute', width: 600, height: 600, borderRadius: 300 },
  sidebar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 40,
    backgroundColor: '#111115',
    borderRightWidth: 1, borderRightColor: C.outlineVariant,
  },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  logoImg: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: C.primaryContainer, flexShrink: 0 },
  logoText: { color: C.primaryContainer, fontSize: 16, fontWeight: '900', letterSpacing: -0.5, flex: 1 },
  sidebarRole: { color: C.onSurfaceVariant, fontSize: 11, fontWeight: '500', paddingHorizontal: 20, marginTop: 2, marginBottom: 20, letterSpacing: 0.5 },
  navList: { flex: 1, marginTop: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12, marginHorizontal: 12, borderRadius: 16, marginBottom: 6 },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, marginHorizontal: 8 },
  navItemActive: { backgroundColor: 'rgba(0, 218, 243, 0.08)', borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.3)', shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  navIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  navIconWrapActive: { backgroundColor: C.primary, shadowColor: C.primary, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navLabel: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600', flex: 1 },
  navLabelActive: { color: '#fff', fontWeight: '900', letterSpacing: 0.5 },
  activeIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.secondary, shadowColor: C.secondary, shadowOpacity: 0.8, shadowRadius: 6 },
  sidebarFooter: { paddingHorizontal: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: 'rgba(68,68,107,0.15)', paddingTop: 20, gap: 8 },
  emergencyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(253,111,133,0.05)', borderWidth: 1, borderColor: 'rgba(253,111,133,0.2)', borderRadius: 12, paddingVertical: 12, marginBottom: 4 },
  emergencyText: { color: C.error, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  footerLinkIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  footerLinkIconActive: { backgroundColor: 'rgba(0,218,243,0.1)' },
  footerLinkText: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '600' },
  topbar: { 
    position: 'absolute', top: 0, right: 0, height: TOPBAR_H, zIndex: 30, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 32, 
    backgroundColor: 'rgba(24,24,27,0.95)', 
    borderBottomWidth: 1, borderBottomColor: 'rgba(39,39,42,0.4)', 
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topbarTitle: { color: C.onSurface, fontSize: 18, fontWeight: '900' },
  topbarSep: { height: 14, width: 1, backgroundColor: 'rgba(68,68,107,0.4)' },
  topbarSub: { color: C.onSurfaceVariant, fontSize: 13, fontWeight: '500' },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  balanceGroup: { alignItems: 'flex-end' },
  balanceLabel: { color: C.onSurfaceVariant, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  balanceValue: { color: C.secondary, fontSize: 14, fontWeight: '900' },
  iconBtn: { padding: 6, alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(39,39,42,0.6)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(39,39,42,0.3)',
    width: 240,
  },
  searchText: { color: C.onSurfaceVariant, fontSize: 13, flex: 1 },
  searchCmd: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  userChip: { flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 16, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(39,39,42,0.6)', borderWidth: 1, borderColor: C.outlineVariant },
  avatarContainer: { position: 'relative' },
  userAvatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,218,243,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,218,243,0.2)' },
  statusIndicator: { position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: C.secondary, borderWidth: 2, borderColor: C.background },
  userName: { color: C.onSurface, fontSize: 13, fontWeight: '800', lineHeight: 15 },
  userOnline: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '600' },
  mainCanvas: { flex: 1, marginTop: TOPBAR_H, padding: 32 },

  mobileTopbar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(39,39,42,0.3)' },
  mobileLogo: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: C.primaryContainer },
  mobileTopbarTitle: { color: C.primaryContainer, fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  userChipSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(39,39,42,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: C.outlineVariant },
  userChipName: { color: C.onSurface, fontSize: 11, fontWeight: '700', maxWidth: 70 },
  bottomBar: { flexDirection: 'row', backgroundColor: 'rgba(24,24,27,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(0,218,243,0.15)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
  bottomTabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 },
  bottomTabLabel: { color: C.onSurfaceVariant, fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
