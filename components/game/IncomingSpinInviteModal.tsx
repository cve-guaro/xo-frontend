// components/game/IncomingSpinInviteModal.tsx — Styled matching Image 5 with XOET Brand Colors
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";
import { playTickSound } from "../../lib/pinTickAudio";
import { haptics } from "../../lib/haptcs";

export interface SpinInvitePayload {
  fromUserId: string;
  fromUsername: string;
  mode: "5_PLAYER" | "RAIL";
  entryAmount: number;
  timestamp?: number;
}

interface IncomingSpinInviteModalProps {
  invite: SpinInvitePayload | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingSpinInviteModal({
  invite,
  onAccept,
  onDecline,
}: IncomingSpinInviteModalProps) {
  const { language } = useAuth();
  const isEN = language === "en";

  useEffect(() => {
    if (invite) {
      try {
        playTickSound(700);
      } catch {}
    }
  }, [invite]);

  if (!invite) return null;

  const modeName = invite.mode === "5_PLAYER"
    ? (isEN ? "5-Player Room" : "የ5 ተጫዋቾች ክፍል")
    : (isEN ? "Spin & Win" : "ስፒን እና አሸንፍ");

  return (
    <Modal visible={!!invite} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={s.overlay}>
        <View style={s.box}>
          {/* Header Row (Spin Disc Avatar + Status Dot matching Image 5) */}
          <View style={s.header}>
            <View style={s.avatarWrap}>
              <View style={s.avatarCircle}>
                <Ionicons name="disc" size={24} color="#ff2a5f" />
              </View>
              <View style={s.onlineBadge} />
            </View>

            <View style={s.headerTextWrap}>
              <Text style={s.badgeLabel}>{isEN ? "SPIN INVITATION" : "የስፒን ግብዣ"}</Text>
              <Text style={s.title} numberOfLines={1}>{modeName}</Text>
            </View>
          </View>

          {/* Invitation Details Body */}
          <View style={s.bodyCard}>
            <Text style={s.bodyText}>
              <Text style={s.highlightName}>{invite.fromUsername || (isEN ? "A Friend" : "ጓደኛዎ")}</Text>{" "}
              {isEN
                ? `invited you to spin and play in ${modeName} for `
                : `በ ${modeName} ጨዋታ ላይ እንዲሳተፉ ጋብዘዎታል በ `}
              <Text style={s.amountHighlight}>{invite.entryAmount || 50} ETB</Text>!
            </Text>
          </View>

          {/* Action Pills matching Image 5 */}
          <View style={s.actions}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={[s.btn, s.btnDecline]}
              onPress={() => {
                haptics.tap();
                playTickSound();
                onDecline();
              }}
            >
              <Text style={s.btnDeclineText}>{isEN ? "Decline" : "አትቀበል"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[s.btn, s.btnAccept]}
              onPress={() => {
                haptics.confirm();
                playTickSound(800);
                onAccept();
              }}
            >
              <Ionicons name="play" size={15} color="#060a14" />
              <Text style={s.btnAcceptText}>{isEN ? "Join Spin" : "ስፒን ጀምር"}</Text>
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
    backgroundColor: 'rgba(4, 6, 12, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111625',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 42, 95, 0.3)',
    shadowColor: '#ff2a5f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 42, 95, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 42, 95, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#111625',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  badgeLabel: {
    color: '#8b93a7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Inter, sans-serif',
    marginTop: 2,
  },
  bodyCard: {
    backgroundColor: '#161c2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 18,
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  highlightName: {
    color: '#ffffff',
    fontWeight: '800',
  },
  amountHighlight: {
    color: '#ff2a5f',
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnDecline: {
    backgroundColor: '#161c2e',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnDeclineText: {
    color: '#8b93a7',
    fontSize: 14,
    fontWeight: '800',
  },
  btnAccept: {
    backgroundColor: '#ff2a5f',
    shadowColor: '#ff2a5f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnAcceptText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
