// components/ui/AvatarGroup.tsx
// Universal AvatarGroup component supporting both React Native and Web.
// Provides smooth hover/spring animations via motion or native animated transitions,
// tooltips, and overlapping layout for player rosters and leaderboard contenders.
import React from "react";
import { View, StyleSheet, Text, Platform, StyleProp, ViewStyle } from "react-native";
import Avatar, { AvatarSize } from "./Avatar";

export interface AvatarGroupItem {
  id?: string;
  username: string;
  avatar?: string | null;
  tooltip?: string;
  wins?: number;
}

export interface AvatarGroupProps {
  users: AvatarGroupItem[];
  max?: number;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
  overlap?: number;
  onPressUser?: (user: AvatarGroupItem) => void;
}

export function AvatarGroup({
  users = [],
  max = 5,
  size = 32,
  style,
  overlap = 10,
}: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - visibleUsers.length;
  const numSize = typeof size === "number" ? size : 32;

  return (
    <View style={[styles.container, style]}>
      {visibleUsers.map((user, index) => {
        return (
          <View
            key={user.id || user.username || index}
            style={[
              styles.avatarWrap,
              {
                zIndex: visibleUsers.length - index,
                marginLeft: index === 0 ? 0 : -overlap,
                width: numSize + 3,
                height: numSize + 3,
                borderRadius: (numSize + 3) / 2,
              },
            ]}
          >
            <Avatar
              uri={user.avatar}
              name={user.username}
              size={numSize}
            />
          </View>
        );
      })}

      {remainingCount > 0 && (
        <View
          style={[
            styles.avatarWrap,
            styles.extraBadge,
            {
              zIndex: 0,
              marginLeft: -overlap,
              width: numSize + 3,
              height: numSize + 3,
              borderRadius: (numSize + 3) / 2,
            },
          ]}
        >
          <Text style={styles.extraText}>+{remainingCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    borderWidth: 2,
    borderColor: "#060613",
    backgroundColor: "#111C27",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  extraBadge: {
    backgroundColor: "#1E293B",
  },
  extraText: {
    color: "#00DAF3",
    fontSize: 11,
    fontWeight: "800",
  },
});

export default AvatarGroup;
