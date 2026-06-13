import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  invite: any; // { fromUserId, fromUsername, betAmount }
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingInviteModal({ invite, onAccept, onDecline }: Props) {
  if (!invite) return null;

  return (
    <Modal visible={!!invite} transparent animationType="slide" onRequestClose={onDecline}>
      <View style={s.overlay}>
        <View style={s.box}>
          <View style={s.header}>
            <View style={s.iconBg}>
              <Ionicons name="game-controller" size={24} color="#00e3fd" />
            </View>
            <Text style={s.title}>New Challenge!</Text>
          </View>

          <Text style={s.body}>
            <Text style={s.highlight}>{invite.username || 'Opponent'}</Text> wants to play XO with you for{' '}
            <Text style={s.highlight}>{invite.amount || 0} ETB</Text>.
          </Text>

          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.btnDecline]} onPress={onDecline}>
              <Text style={s.btnDeclineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnAccept} onPress={onAccept}>
              <LinearGradient colors={['#00e3fd', '#0284c7']} style={s.gradient}>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={s.btnAcceptText}>Accept Game</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,6,20,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111128',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,227,253,0.3)',
    shadowColor: '#00e3fd',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,227,253,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  body: {
    color: '#e5e3ff',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 24,
  },
  highlight: {
    color: '#00e3fd',
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDecline: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnDeclineText: {
    color: '#a8a7d4',
    fontSize: 15,
    fontWeight: '700',
  },
  btnAccept: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnAcceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
