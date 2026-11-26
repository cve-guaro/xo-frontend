// components/home/PromotionalBannersRow.tsx
// XO ET — Home Page Promotional Banners
// Displays 3 coordinated promotional banners side by side:
// 1. WEEKLY CHAMPIONS -> /home/leaderboard
// 2. FAST ETB WITHDRAWALS -> opens Withdrawal modal
// 3. BONUSES & REWARDS -> opens Referral / Bonus modal
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { haptics } from '../../lib/haptcs';
import { playTickSound } from '../../lib/pinTickAudio';

const promoWeeklyBg = require('../../assets/promotions/promo-weekly-bg-v2.png');
const promoTrophyObj = require('../../assets/promotions/promo-trophy-object-v2.png');
const promoWithdrawalBg = require('../../assets/promotions/promo-withdrawal-bg-v2.png');
const promoWithdrawalObj = require('../../assets/promotions/promo-withdrawal-object-v2.png');
const promoRewardsBg = require('../../assets/promotions/promo-rewards-bg-v2.png');
const promoRewardsObj = require('../../assets/promotions/promo-rewards-object-v2.png');

interface PromotionalBannersRowProps {
  isDesktop?: boolean;
  router: any;
  setWithdrawVisible?: (v: boolean) => void;
  setShowReferralModal?: (v: boolean) => void;
  isEN?: boolean;
}

export default function PromotionalBannersRow({
  isDesktop = true,
  router,
  setWithdrawVisible = () => {},
  setShowReferralModal = () => {},
  isEN = true,
}: PromotionalBannersRowProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const banners = [
    {
      id: 'weekly-champions',
      title: isEN ? 'WEEKLY CHAMPIONS' : 'የሳምንቱ አሸናፊዎች',
      subtitle: isEN ? 'Top 3 players win every week!' : 'በየሳምንቱ ከፍተኛ 3 ተጫዋቾች ይሸለማሉ!',
      bgImg: promoWeeklyBg,
      objImg: promoTrophyObj,
      borderColor: 'rgba(0, 218, 243, 0.35)',
      onPress: () => {
        try { playTickSound(); } catch {}
        haptics.tap();
        router.push('/(authed)/home/leaderboard');
      },
    },
    {
      id: 'fast-withdrawals',
      title: isEN ? 'FAST ETB WITHDRAWALS' : 'ፈጣን የብር ማውጣት',
      subtitle: isEN
        ? 'Convenient withdrawals through supported Ethiopian payment methods.'
        : 'በቴሌብር እና በኢትዮጵያ ባንኮች ምቹ ገንዘብ ማውጣት።',
      bgImg: promoWithdrawalBg,
      objImg: promoWithdrawalObj,
      borderColor: 'rgba(239, 68, 68, 0.35)',
      onPress: () => {
        try { playTickSound(); } catch {}
        haptics.tap();
        setWithdrawVisible(true);
      },
    },
    {
      id: 'bonuses-rewards',
      title: isEN ? 'BONUSES & REWARDS' : 'ቦነስ እና ሽልማቶች',
      subtitle: isEN
        ? 'Discover welcome bonuses and special rewards.'
        : 'የእንኳን ደህና መጡ ቦነስ እና ልዩ ሽልማቶችን ያግኙ።',
      bgImg: promoRewardsBg,
      objImg: promoRewardsObj,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      onPress: () => {
        try { playTickSound(); } catch {}
        haptics.tap();
        setShowReferralModal(true);
      },
    },
  ];

  const content = banners.map((banner) => (
    <TouchableOpacity
      key={banner.id}
      activeOpacity={0.88}
      onPress={banner.onPress}
      style={[
        s.bannerCard,
        {
          borderColor: banner.borderColor,
          backgroundColor: '#0A101D',
        },
        !isMobile && s.bannerCardDesktop,
        isMobile && s.bannerCardMobile,
      ]}
      accessibilityRole="button"
      accessibilityLabel={banner.title}
    >
      {/* Background Plate */}
      <Image source={banner.bgImg} style={s.bgImage} resizeMode="cover" />
      <View style={s.darkOverlay} />

      {/* Left Content Column (Clean Title + Subtitle, No Pills, No Buttons) */}
      <View style={s.textColumn}>
        <Text style={s.titleText} numberOfLines={2}>
          {banner.title}
        </Text>
        <Text style={s.descText} numberOfLines={3}>
          {banner.subtitle}
        </Text>
      </View>

      {/* Right 3D Illustration Graphic */}
      <View style={s.artWrap}>
        <Image source={banner.objImg} style={s.artImage} resizeMode="contain" />
      </View>
    </TouchableOpacity>
  ));

  if (isMobile) {
    return (
      <View style={s.mobileWrapper}>
        <ScrollView
          horizontal
          scrollEnabled
          nestedScrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          style={{
            width: '100%',
            ...(Platform.OS === 'web'
              ? ({ overflowX: 'auto', overflowY: 'hidden', touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' } as any)
              : {}),
          }}
          contentContainerStyle={s.mobileScrollContent}
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return <View style={s.desktopRow}>{content}</View>;
}

const s = StyleSheet.create({
  desktopRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 16,
    marginTop: 8,
  },
  mobileWrapper: {
    width: '100%',
    marginBottom: 16,
    marginTop: 4,
  },
  mobileScrollContent: {
    paddingHorizontal: 4,
    paddingRight: 16,
    gap: 12,
    flexDirection: 'row',
  },
  bannerCard: {
    height: 122,
    borderRadius: 16,
    borderWidth: 1.2,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 10,
    ...(Platform.OS === 'web'
      ? ({
          transition: 'transform 0.18s ease, border-color 0.18s ease',
          cursor: 'pointer',
          touchAction: 'pan-x pan-y',
        } as any)
      : {}),
  },
  bannerCardDesktop: {
    flex: 1,
    minWidth: 0,
  },
  bannerCardMobile: {
    width: 274,
    flexShrink: 0,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 10, 20, 0.35)',
  },
  textColumn: {
    flex: 1.35,
    minWidth: 0,
    zIndex: 2,
    justifyContent: 'center',
    paddingRight: 8,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    lineHeight: 18,
    fontFamily: Platform.OS === 'web' ? 'Space Grotesk, Inter, sans-serif' : undefined,
  },
  descText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 16,
  },
  artWrap: {
    flex: 0.9,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  artImage: {
    width: '100%',
    height: '110%',
  },
});
