// components/game/InviteFriendsModal.tsx
// ────────────────────────────────────────────────────────────────────────────
// Bottom Sheet Drawer for inviting friends to the Spin Game.
// Supports searching friends/users, adding friends with "+", and inviting online
// friends (disabled when offline) — matching Image 3 specification.
// ────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";
import { useSocket } from "../../context/socketContext";
import { API_URL } from "../../config";

type FriendItem = {
  id: string;
  username: string;
  display_name?: string;
  avatar?: string;
  is_friend: boolean;
  is_online: boolean;
  source?: string;
};

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  mode: "5_PLAYER" | "RAIL";
  entryAmount?: number;
  onInviteSent?: (targetUserId: string, targetUsername: string) => void;
}

export default function InviteFriendsModal({
  visible,
  onClose,
  mode,
  entryAmount = 100,
  onInviteSent,
}: InviteFriendsModalProps) {
  const { user, token, language } = useAuth();
  const { emitAck } = useSocket();
  const isEN = language === "en";

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<FriendItem[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Generate web invitation link
  const inviteLink =
    Platform.OS === "web" && typeof window !== "undefined"
      ? `${window.location.origin}/home/spin?mode=${mode}&ref=${encodeURIComponent(user?.username || "")}`
      : `https://xoethiopia.com/home/spin?mode=${mode}&ref=${encodeURIComponent(user?.username || "")}`;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      }
      setCopied(true);
      showToast(isEN ? "Invitation link copied to clipboard!" : "የግብዣ ሊንክ ተቀድቷል!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(isEN ? "Failed to copy link" : "ሊንኩን መቅዳት አልተቻለም");
    }
  };

  const handleShareTelegram = () => {
    const shareText = isEN
      ? `🎮 Join my ${mode === "5_PLAYER" ? "5-Player" : "Rail"} Spin game on XO Ethiopia! Click the link to play:`
      : `🎮 በ XOET ላይ ወደ ${mode === "5_PLAYER" ? "5-ተጫዋች" : "የባቡር"} ስፒን ጨዋታዬ ይግቡ! ለመጫወት ሊንኩን ይጫኑ:`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(tgUrl, "_blank");
    } else {
      Linking.openURL(tgUrl);
    }
  };

  // Fetch initial friends list (safely checking res.ok before json parsing)
  const fetchFriends = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.friends)) {
        setUsersList(data.friends);
      }
    } catch (err) {
      console.warn("[INVITE_MODAL] fetchFriends notice:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Search users or friends (safely checking res.ok before json parsing)
  const executeSearch = useCallback(
    async (q: string) => {
      if (!token) return;
      if (!q.trim()) {
        fetchFriends();
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/friends/search?q=${encodeURIComponent(q.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.users)) {
          setUsersList(data.users);
        }
      } catch (err) {
        console.warn("[INVITE_MODAL] executeSearch notice:", err);
      } finally {
        setLoading(false);
      }
    },
    [token, fetchFriends]
  );

  useEffect(() => {
    if (visible) {
      fetchFriends();
      setSearchQuery("");
      setInvitedIds(new Set());
      setCopied(false);
    }
  }, [visible, fetchFriends]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(text);
    }, 350);
  };

  // Add friend manually via "+" button
  const handleAddFriend = async (item: FriendItem) => {
    if (!token || addingId) return;
    setAddingId(item.id);
    try {
      const res = await fetch(`${API_URL}/friends/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId: item.id }),
      });
      if (!res.ok) {
        showToast("Service temporarily unavailable");
        return;
      }
      const data = await res.json();
      if (data && data.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === item.id ? { ...u, is_friend: true } : u))
        );
        showToast(isEN ? `Added ${item.username} as friend!` : `${item.username} እንደ ጓደኛ ታክሏል!`);
      } else {
        showToast(data?.error || "Failed to add friend");
      }
    } catch (err) {
      console.warn("[INVITE_MODAL] handleAddFriend notice:", err);
      showToast("Network error");
    } finally {
      setAddingId(null);
    }
  };

  // Send real-time spin invitation to online friend
  const handleInviteFriend = async (item: FriendItem) => {
    if (!item.is_online) return;
    if (invitingId || invitedIds.has(item.id)) return;

    setInvitingId(item.id);
    try {
      const ackResult: any = await emitAck("spin:invite_friend", {
        targetUserId: item.id,
        mode,
        entryAmount,
        token,
      });

      if (ackResult && ackResult.ok) {
        setInvitedIds((prev) => new Set(prev).add(item.id));
        showToast(isEN ? `Invite sent to ${item.username}!` : `ግብዣ ወደ ${item.username} ተልኳል!`);
        onInviteSent?.(item.id, item.username);
      } else if (ackResult?.error === "USER_OFFLINE") {
        showToast(isEN ? `${item.username} is currently offline` : `${item.username} ከመስመር ውጭ ነው`);
      } else {
        showToast(ackResult?.message || ackResult?.error || "Failed to send invite");
      }
    } catch (err) {
      console.error("[INVITE_MODAL] handleInviteFriend error:", err);
      showToast("Invite failed");
    } finally {
      setInvitingId(null);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={s.sheetContainer}>
          {/* Top Grab Handle */}
          <View style={s.handleBar} />

          {/* Toast feedback banner */}
          {toastMsg && (
            <View style={s.toastBanner}>
              <Ionicons name="information-circle" size={16} color="#38bdf8" />
              <Text style={s.toastText}>{toastMsg}</Text>
            </View>
          )}

          {/* Header Row: Back Button < and Search Bar (Exact Image 3 Match) */}
          <View style={s.headerRow}>
            {/* Back Button < */}
            <TouchableOpacity onPress={onClose} style={s.backBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Search Input Bar */}
            <View style={s.searchBarContainer}>
              <Ionicons name="search" size={17} color="#94a3b8" style={{ marginLeft: 10, marginRight: 6 }} />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder={isEN ? "Search friends by username..." : "ጓደኞችን በተጠቃሚ ስም ይፈልጉ..."}
                placeholderTextColor="#64748b"
                style={s.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                {...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {})}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    fetchFriends();
                  }}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>


          {/* Section Subtitle / Info */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {searchQuery.trim()
                ? isEN ? `Search Results (${usersList.length})` : `የፍለጋ ውጤቶች (${usersList.length})`
                : isEN ? `Your Friends (${usersList.length})` : `ጓደኞችዎ (${usersList.length})`}
            </Text>
            <View style={s.gameBadge}>
              <Ionicons name="disc" size={12} color="#facc15" />
              <Text style={s.gameBadgeText}>
                {mode === "5_PLAYER" ? "5-PLAYER SPIN" : "XO SPIN"}
              </Text>
            </View>
          </View>

          {/* List of Friends / Search Users */}
          {loading ? (
            <View style={s.centerLoading}>
              <ActivityIndicator size="small" color="#38bdf8" />
            </View>
          ) : usersList.length === 0 ? (
            <View style={s.emptyContainer}>
              <Ionicons name="people-outline" size={38} color="#475569" style={{ marginBottom: 10 }} />
              <Text style={s.emptyTitle}>
                {searchQuery.trim()
                  ? isEN ? "No players found" : "ምንም ተጫዋቾች አልተገኙም"
                  : isEN ? "No saved friends yet" : "እስካሁን ምንም ጓደኞች የሉም"}
              </Text>
              <Text style={s.emptySubtitle}>
                {searchQuery.trim()
                  ? isEN ? "Try searching another username" : "ሌላ የተጠቃሚ ስም ይፈልጉ"
                  : isEN ? "Play 1v1 XO or invite players to automatically save friends here!" : "ከጓደኞች ጋር በ1v1 XO ይጫወቱ ወይም እዚህ ይፈልጉ!"}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 380 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {usersList.map((item) => {
                const isInvited = invitedIds.has(item.id);
                const isSelf = user?.id && String(item.id) === String(user.id);
                if (isSelf) return null;

                return (
                  <View key={item.id} style={s.userRow}>
                    {/* User Info (Left) */}
                    <View style={s.userInfoLeft}>
                      {/* Avatar Circle with Online Status Indicator Dot */}
                      <View style={s.avatarWrap}>
                        <View style={s.avatarCircle}>
                          <Ionicons name="person" size={20} color="#ffffff" />
                        </View>
                        {/* Status dot: Green = Online, Gray = Offline */}
                        <View
                          style={[
                            s.statusDot,
                            { backgroundColor: item.is_online ? "#22c55e" : "#64748b" },
                          ]}
                        />
                      </View>

                      {/* Username & Status Column */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={s.usernameText}>
                          {item.display_name || item.username}
                        </Text>
                        <Text
                          style={[
                            s.statusLabel,
                            { color: item.is_online ? "#22c55e" : "#94a3b8" },
                          ]}
                        >
                          {item.is_online
                            ? isEN ? "Online" : "መስመር ላይ"
                            : isEN ? "Offline" : "ከመስመር ውጭ"}
                        </Text>
                      </View>
                    </View>

                    {/* Right Action: "+ Add Friend" vs "Invite" (Only enabled if online!) */}
                    <View style={s.actionCol}>
                      {!item.is_friend ? (
                        /* + Add Friend button */
                        <TouchableOpacity
                          disabled={addingId === item.id}
                          onPress={() => handleAddFriend(item)}
                          style={s.addFriendBtn}
                          activeOpacity={0.8}
                        >
                          {addingId === item.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Ionicons name="person-add" size={14} color="#ffffff" />
                              <Text style={s.addFriendText}>
                                {isEN ? "+ Friend" : "+ ጓደኛ"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : isInvited ? (
                        /* Already sent checkmark badge */
                        <View style={s.sentBadge}>
                          <Ionicons name="checkmark-circle" size={15} color="#22c55e" />
                          <Text style={s.sentBadgeText}>{isEN ? "Invited ✓" : "ተጋብዟል ✓"}</Text>
                        </View>
                      ) : item.is_online ? (
                        /* Active Invite Button (Friend is ONLINE) */
                        <TouchableOpacity
                          disabled={invitingId === item.id}
                          onPress={() => handleInviteFriend(item)}
                          style={s.inviteBtn}
                          activeOpacity={0.85}
                        >
                          {invitingId === item.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Ionicons name="send" size={13} color="#ffffff" />
                              <Text style={s.inviteBtnText}>
                                {isEN ? "Invite" : "ጋብዝ"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        /* Disabled Offline Button (Friend is OFFLINE - User Requirement: "if only online, if not online don't") */
                        <View style={s.offlineBtn}>
                          <Ionicons name="cloud-offline" size={13} color="#64748b" />
                          <Text style={s.offlineBtnText}>
                            {isEN ? "Offline" : "ከመስመር ውጭ"}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5, 10, 24, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#0a1024",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderRadius: Platform.OS === "web" ? 28 : undefined,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 540 : "100%",
    alignSelf: "center",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 12,
  },
  linkCard: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.25)",
    padding: 12,
    marginBottom: 14,
  },
  linkCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  linkIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0, 240, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  linkCardTitle: {
    color: "#e2e8f0",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  linkTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  linkTagText: {
    color: "#facc15",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkUrlContainer: {
    flex: 1,
    backgroundColor: "rgba(10, 16, 36, 0.8)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 0,
  },
  linkUrlText: {
    color: "#94a3b8",
    fontSize: 11.5,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    flexShrink: 0,
  },
  copyBtnActive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: "#22c55e",
  },
  copyBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  telegramBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#229ED9",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    flexShrink: 0,
  },
  telegramBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    borderWidth: 1,
    borderColor: "#0284c7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  toastText: {
    color: "#e0f2fe",
    fontSize: 12.5,
    fontWeight: "700",
    fontFamily: "Inter, sans-serif",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchBarContainer: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(56, 189, 248, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 6,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "600",
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: "#94a3b8",
    fontSize: 12.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  gameBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(250, 204, 21, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gameBadgeText: {
    color: "#facc15",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  userRow: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  userInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0284c7",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0a1024",
  },
  usernameText: {
    color: "#ffffff",
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  actionCol: {
    flexShrink: 0,
  },
  addFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  addFriendText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ec4899",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#ec4899",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  inviteBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "#22c55e",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  sentBadgeText: {
    color: "#22c55e",
    fontSize: 11.5,
    fontWeight: "800",
  },
  offlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    opacity: 0.5,
  },
  offlineBtnText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
});
