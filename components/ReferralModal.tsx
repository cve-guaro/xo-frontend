import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';

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

  useEffect(() => {
    if (visible && token) {
      let isMounted = true;
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
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: '#0c0c1f', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', maxWidth: 480, width: '100%', overflow: 'hidden' }}>
          <LinearGradient colors={['rgba(16,185,129,0.15)' as any, 'rgba(0,0,0,0)' as any]} style={{ padding: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="share-social" size={24} color="#10b981" />
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{isEN ? 'Share & Earn' : 'አጋራና አግኝ'}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: 'rgba(229,227,255,0.7)', fontSize: 14, lineHeight: 22, marginBottom: 20 }}>
              {isEN 
                ? 'Invite friends to XO Ethiopia! When they register using your link, you earn a bonus to play with.' 
                : 'ጓደኞችዎን ወደ XO Ethiopia ይጋብዙ! በአገናኝ ሊንክዎ ሲመዘገቡ ለመጫወት ጉርሻ ያገኛሉ።'}
            </Text>

            {referralLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10b981" />
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
                  <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 }}>
                    {isEN ? 'YOUR REFERRAL LINK' : 'የማጋሪያ ሊንክዎ'}
                  </Text>
                  <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '700' }} selectable>{referralUrl || 'Loading...'}</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => {
                    if (referralUrl && Platform.OS === 'web') {
                      navigator.clipboard?.writeText(referralUrl).then(() => {
                        toast.show(isEN ? 'Link copied!' : 'ሊንክ ተቀድቷል!', 'success');
                      }).catch(() => {});
                    }
                  }}
                  style={{ backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}
                >
                  <Ionicons name="copy-outline" size={18} color="#0c0c1f" />
                  <Text style={{ color: '#0c0c1f', fontSize: 15, fontWeight: '900' }}>{isEN ? 'Copy Link' : 'ሊንክ ቅዳ'}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Text style={{ color: 'rgba(168,167,212,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
                      {isEN ? 'INVITED' : 'ተጋባዦች'}
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{referralStats.totalReferred}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)' }}>
                    <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
                      {isEN ? 'EARNED' : 'ያገኙት'}
                    </Text>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 }}>ETB {referralStats.totalBonusEarned}</Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
