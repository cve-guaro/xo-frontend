import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { colors } from '../theme/tokens';

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
  token: string | null;
  isEN: boolean;
  toast: any;
}

export default function ReferralModal({ visible, onClose, token, isEN, toast }: ReferralModalProps) {
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralUrl, setReferralUrl] = useState('');
  const [referralStats, setReferralStats] = useState({ totalReferred: 0, totalBonusEarned: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible && token) {
      let isMounted = true;
      setCopied(false);
      const fetchReferrals = async () => {
        setReferralLoading(true);
        try {
          const res = await fetch(`${API_URL}/user/referral-link`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (d.ok && isMounted) {
            setReferralUrl(d.referralUrl);
            const sr = await fetch(`${API_URL}/user/referral-stats`, { headers: { Authorization: `Bearer ${token}` } });
            const sd = await sr.json();
            if (sd.ok && isMounted) setReferralStats({ totalReferred: sd.totalReferred, totalBonusEarned: sd.totalBonusEarned });
          }
        } catch (e) {
          console.error('Referral fetch error', e);
        } finally {
          if (isMounted) setReferralLoading(false);
        }
      };
      fetchReferrals();

      return () => { isMounted = false; };
    }
  }, [visible, token]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(5, 7, 14, 0.82)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          maxWidth: 440,
          width: '100%',
          padding: 24,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.cardRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="share-social-outline" size={18} color={colors.textSoft} />
              </View>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
                {isEN ? 'Invite & earn' : 'አጋራና አግኝ'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardRaised, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={isEN ? 'Close' : 'ዝጋ'}
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textMuted, fontSize: 13.5, lineHeight: 20, marginBottom: 16 }}>
            {isEN
              ? 'Share your referral link with friends. You receive a bonus when they register and play.'
              : 'ጓደኞችዎን ወደ XO Ethiopia ይጋብዙ፤ በሊንክዎ ሲመዘገቡ ጉርሻ ያገኛሉ።'}
          </Text>

          {referralLoading ? (
            <View style={{ padding: 36, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <>
              <View style={{ backgroundColor: colors.cardRaised, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                  {isEN ? 'Your referral link' : 'የማጋሪያ ሊንክዎ'}
                </Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }} selectable numberOfLines={2}>
                  {referralUrl || 'Loading...'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
                <View style={{ flex: 1, backgroundColor: colors.cardRaised, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                    {isEN ? 'Friends invited' : 'ተጋባዦች'}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
                    {referralStats.totalReferred}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.cardRaised, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                    {isEN ? 'Total earned' : 'ያገኙት'}
                  </Text>
                  <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '800', marginTop: 4 }}>
                    {referralStats.totalBonusEarned} ETB
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (referralUrl && Platform.OS === 'web') {
                    navigator.clipboard?.writeText(referralUrl).then(() => {
                      setCopied(true);
                      toast?.show?.(isEN ? 'Link copied' : 'ሊንክ ተቀድቷል', 'success');
                    }).catch(() => {});
                  }
                }}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  height: 46,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={17} color={colors.bgDeep} />
                <Text style={{ color: colors.bgDeep, fontSize: 14, fontWeight: '800' }}>
                  {copied ? (isEN ? 'Copied' : 'ተቀድቷል') : (isEN ? 'Copy referral link' : 'ሊንክ ቅዳ')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
