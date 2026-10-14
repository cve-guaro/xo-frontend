// context/authContext.tsx
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlayer } from "expo-audio";
// Remove expo-av import completely as audio stubs exist below
import { Platform, Alert, Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, Linking } from "react-native";
import { CheckmarkCircleIcon, AlertCircleIcon } from "../components/SvgIcons";
import { API_URL } from "../config"; // e.g. https://api.yourapp.com

/**
 * Global helper to fix Mixed Content (HTTP on HTTPS) and local development URLs.
 * Replaces http://localhost:9001 with the production API_URL.
 */
export const fixAvatarUrl = (url?: string | null) => {
  if (!url) return null;
  let resolvedUrl = String(url).trim();
  if (!resolvedUrl) return null;
  
  if (resolvedUrl.startsWith('/')) {
    resolvedUrl = `${API_URL}${resolvedUrl}`;
  }

  // Swap any local development host (localhost:9001, localhost:2000, 127.0.0.1:9001, etc.) for API_URL
  if (resolvedUrl.match(/https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?/i)) {
    resolvedUrl = resolvedUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?/gi, API_URL);
  }

  // Also replace any residual :9001 port if API_URL does not use port 9001
  if (resolvedUrl.includes(':9001') && !API_URL.includes(':9001')) {
    resolvedUrl = resolvedUrl.replace(/^https?:\/\/[^/]+:9001/, API_URL);
  }

  // Ensure HTTPS for production API calls
  if (resolvedUrl.startsWith('http://') && !resolvedUrl.includes('localhost') && !resolvedUrl.includes('127.0.0.1')) {
    resolvedUrl = resolvedUrl.replace('http://', 'https://');
  }

  return resolvedUrl;
};

type AuthUser = {
  id: string;
  username: string | null;
  number: string; // "251980808080"
  avatar: string | null;
  new_user: boolean;
  display_name: string | null;
  role: 'user' | 'admin' | 'superadmin' | 'maintenance' | 'maintenance_admin';
  room_1_wins: number;
  r1_10_wins: number;
  r1_15_wins: number;
  r1_25_wins: number;
  r1_50_wins: number;
  r1_99_wins: number;
  r2_100_wins: number;
  r3_1000_wins: number;
  bonus_balance: number;
  banned: boolean;
  available_balance: number;
  withdrawable_balance: number;
  total_games: number;
  total_wins: number;
  claimed_giveaway_version: number;
  created_at: string;
  sound_muted?: boolean;
};

// ---------------- Payment methods ----------------
export type PaymentMethod = {
  key: string;
  label: string;
  subtitle?: string;
  colors?: [string, string];
  icon?: string; // Ionicons name (kept as string for flexibility)
  imageUrl?: string;
};

// Language types
type Language = "en" | "am"; // English and Amharic
type TranslationKey = string;

type Translations = {
  [key in Language]: Record<string, string>;
};

const translations: Translations = {
  en: {
    welcome: "Welcome",
    play_now: "Play Now",
    balance: "Available Balance",
    deposit: "Deposit",
    withdraw: "Withdraw",
    history: "History",
    settings: "Settings",
    logout: "Logout",
    victory: "Victory! Prize credited.",
    defeat: "Defeat this time. Try again!",
    draw: "Round draw — continuing…",
    your_turn: "Your turn",
    opponent_turn: "Opponent's turn",
    leave_match: "Leave match?",
    rematch: "Rematch",
    accept: "Accept",
    decline: "Decline",
    error: "Error",
    success: "Success",
    loading: "Loading...",
    cancel: "Cancel",
    confirm: "Confirm",
    rank: "Rank",
    wins: "Wins",
    games_played: "Games Played",
    win_rate: "Win Rate",
    admin_overview: "Overview",
    admin_users: "Users",
    admin_transactions: "Transactions",
    admin_logs: "Game Logs",
    admin_back_home: "Back to Home",
    platform_balance: "Platform Balance",
    chapa_balance: "Chapa Balance",
    exit_confirm: "Are you sure?",
    exit_message: "Do you want to logout?",
    stay: "Stay",
    leave_confirm: "Leave Game",
    leave_message: "Are you sure you want to leave?",
    leave_loss_message: "You will lose ETB {amount} if you leave now.",
    forfeit_warning: "Warning: Leaving now will result in a forfeit!",
    room_1: "ROOM 1",
    room_2: "ROOM 2",
    room_3: "ROOM 3",
    select_amount: "Select Amount",
    confirm_amount: "Confirm Amount",
    insufficient_balance: "Insufficient Balance",
    searching: "Searching...",
    match_found: "Match Found!",
    waiting_opponent: "Waiting for opponent...",
    game_over: "Game Over",
    you_won: "You Won!",
    you_lost: "You Lost",
    play_again: "Play Again",
    back_to_home: "Back to Home",
    transactions: "Transactions",
    account: "Account",
    profile: "Profile",
    phone: "Phone",
    username: "Username",
    save: "Save",
    edit: "Edit",
    close: "Close",
    done: "Done",
    next: "Next",
    back: "Back",
    view_all: "View All",
    no_data: "No Data Available",
    loading_data: "Loading...",
    error_loading: "Error Loading Data",
    retry: "Retry",
    logout_confirm_title: "Are you sure?",
    logout_confirm_message: "Do you want to logout?",
    leave_game_confirm_title: "Leave Game?",
    leave_game_confirm_message: "Are you sure you want to leave?",
    leave_game_loss_warning: "You will lose ETB {amount} if you leave now.",
    room_1_desc: "30 Seconds • Beginner",
    room_2_desc: "30 Seconds • Intermediate",
    room_3_desc: "30 Seconds • Expert",
    outpace_outsmart_win: "OUTPACE. OUTSMART. WIN!",
    total_balance: "TOTAL BALANCE",
    add_funds: "ADD FUNDS",
    match_reward: "Match Reward",
    match_entry: "Match Entry",
    game_over_loss: "You lost ETB {amount}",
    game_over_win: "You won ETB {amount}",
    stay_game: "Stay",
    exit_game: "Exit",
    not_available: "Not Available",
    welcome_subtitle: "Sign in with your phone number",
    phone_number_label: "Phone Number",
    otp_code_label: "OTP Code",
    login_button: "Send OTP",
    verify_button: "Verify & Login",
    bonus_only_new_user: "Bonus is only available for new users.",
    platform_balance_label: "Platform Balance",
    real_wallet_position: "Wallet Net Position",
    giveaway_manager: "Giveaway Manager",
    active_campaigns: "Active Campaigns",
    create_campaign: "Create Campaign",
    match_archive: "Match Archive",
    active_matches: "Active Matches",
    total_stake_24h: "Total Stake (24h)",
    avg_game_time: "Avg Game Time",
    system_health: "System Health",
    nominal: "NOMINAL",
    financial_ledger: "Financial Ledger",
    total_volume: "Total Volume",
    pending_approval: "Pending Approval",
    recent_deposits: "Recent Deposit Requests",
    recent_withdrawals: "Recent Withdrawal Requests",
    see_receipt: "See Receipt",
    transaction_receipt: "Transaction Receipt",
    user_account: "User Account",
    internal_ref: "Internal Ref",
    provider_ref: "Provider Ref",
    method: "Method",
    timestamp: "Timestamp",
    download_receipt: "Download Receipt",
    security_protocols: "Security Protocols",
    app_status: "App Status",
    emergency_lockdown: "Emergency Lockdown",
    payout_gateway: "Payout Gateway",
    super_admin_only: "Super Admin Only",
    save_changes: "Save Changes",
    cancel_action: "Cancel",
    confirm_action: "Confirm",
    search_ledger: "Search ledger...",
    filter_status: "Status",
    audit_trail: "System Audit Trail",
    audit_subtitle: "Transparent immutable record of all administrative operations.",
    activity_logs: "Activity Logs",
    search_audit: "Search Action or Admin...",
    admin_label: "Admin",
    action_label: "Action",
    target_label: "Target",
    context_label: "Context/Details",
    rate_limited_title: "Too Many Attempts",
    rate_limited_message: "Please wait 15 minutes before requesting another code for your security.",
    player_matrix: "Player Matrix",
    search_users: "Search users...",
    status_all: "All",
    status_pending: "Pending",
    status_success: "Success",
    status_failed: "Failed",
    match_history: "Match History",
    filter_label: "Filter",
    participants: "Participants",
    stake_label: "Stake",
    result_label: "Result",
    match_id: "Match ID",
    x_won: "X WON",
    o_won: "O WON",
    draw_label: "DRAW",
    room1_tracker: "Room 1 Win Tracker",
    room1_tracker_sub: "25 wins cap per bet tier",
    wants_rematch: "wants a rematch!",
    waiting_response: "Waiting for response...",
    declined_invite: "doesn't want to play right now!",
    nah_skip: "Nah, skip",
    lets_go: "Let's Go!",
  },
  am: {
    welcome: "እንኳን ደህና መጡ",
    play_now: "አሁን ይጫወቱ",
    balance: "ቀሪ ሂሳብ",
    deposit: "ገንዘብ ያስገቡ",
    withdraw: "ገንዘብ ያውጡ",
    history: "ታሪክ",
    settings: "ቅንብሮች",
    logout: "ይውጡ",
    victory: "ድል! ሽልማት ተቀምጧል።",
    defeat: "ይቅርታ፣ በዚህ ጊዜ ተሸንፈዋል። እንደገና ይሞክሩ!",
    draw: "ተመሳሳይ ውጤት - በመቀጠል ላይ...",
    your_turn: "የእርስዎ ተራ",
    opponent_turn: "የተጫዋቹ ተራ",
    leave_match: "ጨዋታውን ለመተው?",
    rematch: "እንደገና ይጫወቱ",
    accept: "ተቀበል",
    decline: "ከልክል",
    error: "ስህተት",
    success: "ተሳክቷል",
    loading: "በመጫን ላይ...",
    cancel: "ሰርዝ",
    confirm: "አረጋግጥ",
    rank: "ደረጃ",
    wins: "ድሎች",
    games_played: "የጨዋታ ብዛት",
    win_rate: "የማሸነፍ ንፃሬ",
    admin_overview: "አጠቃላይ እይታ",
    admin_users: "ተጠቃሚዎች",
    admin_transactions: "ግብይቶች",
    admin_logs: "የጨዋታ ታሪኮች",
    admin_back_home: "ወደ መነሻ ይመለሱ",
    platform_balance: "የፕላትፎርም ቀሪ ሂሳብ",
    chapa_balance: "የቻፓ ቀሪ ሂሳብ",
    exit_confirm: "እርግጠኛ ነዎት?",
    exit_message: "መውጣት ይፈልጋሉ?",
    stay: "አቆይ",
    leave_confirm: "ጨዋታውን ተው",
    leave_message: "እርግጠኛ ነዎት መውጣት ይፈልጋሉ?",
    leave_loss_message: "ETB {amount} ካሁኑ ካወጡ ያጣሉ.",
    forfeit_warning: "ማስጠንቀቂያ፡ አሁን ከወጡ ይሸነፋሉ!",
    room_1: "ክፍል 1",
    room_2: "ክፍል 2",
    room_3: "ክፍል 3",
    select_amount: "መጠን ይምረጡ",
    confirm_amount: "መጠንን አረጋግጥ",
    insufficient_balance: "ቂ ሂሳብ የለዎትም",
    searching: "በመፈለግ ላይ...",
    match_found: "ተጫዋች ተገኝቷል!",
    waiting_opponent: "ተጫዋችን በመጠበቅ ላይ...",
    game_over: "ጨዋታው ተጠናቋል",
    you_won: "አሸነፉ!",
    you_lost: "ተሸነፉ",
    play_again: "እንደገና ይጫወቱ",
    back_to_home: "ወደ መነሻ ይመለሱ",
    transactions: "ግብይቶች",
    account: "ሂሳብ",
    profile: "የግል መረጃ",
    phone: "ስልክ",
    username: "የተጠቃሚ ስም",
    save: "አስቀምጥ",
    edit: "አስተካክል",
    close: "ዝጋ",
    done: "ጨርሰዋል",
    next: "ቀጥል",
    back: "ተመለስ",
    view_all: "ሁሉንም እይ",
    no_data: "ምንም ውሂብ የለም",
    loading_data: "በመጫን ላይ...",
    error_loading: "ውሂብ በማውረድ ስህተት",
    retry: "እንደገና ሞክር",
    logout_confirm_title: "እርግጠኛ ነዎት?",
    logout_confirm_message: "መውጣት ይፈልጋሉ?",
    leave_game_confirm_title: "ጨዋታውን ይተው?",
    leave_game_confirm_message: "እርግጠኛ ነዎት መውጣት ይፈልጋሉ?",
    leave_game_loss_warning: "አሁን ከወጡ ETB {amount} ያጣሉ።",
    room_1_desc: "30 ሰከንድ • ጀማሪ",
    room_2_desc: "30 ሰከንድ • መካከለኛ",
    room_3_desc: "30 ሰከንድ • ባለሙያ",
    outpace_outsmart_win: "በፍጥነት ይሂዱ። በብልሃት ይጫወቱ። ያሸንፉ!",
    total_balance: "ጠቅላላ ቀሪ ሂሳብ",
    add_funds: "ገንዘብ ይጨምሩ",
    match_reward: "የጨዋታ ሽልማት",
    match_entry: "የጨዋታ ክፍያ",
    game_over_loss: "ETB {amount} ተሸንፈዋል",
    game_over_win: "ETB {amount} አሸንፈዋል",
    stay_game: "ቆይ",
    exit_game: "ውጣ",
    not_available: "አይገኝም",
    welcome_subtitle: "በስልክ ቁጥርዎ ይግቡ",
    phone_number_label: "የስልክ ቁጥር",
    otp_code_label: "የኦቲፒ ኮድ",
    login_button: "ኦቲፒ ላክ",
    verify_button: "አረጋግጥ እና ግባ",
    bonus_only_new_user: "ቦነስ ለአዲስ ተጠቃሚዎች ብቻ የሚገኝ ነው።",
    platform_balance_label: "የፕላትፎርም ቀሪ ሂሳብ",
    real_wallet_position: "የኪስ ቦርሳ ትክክለኛ ሁኔታ",
    giveaway_manager: "የስጦታዎች አስተዳዳሪ",
    active_campaigns: "ንቁ ዘመቻዎች",
    create_campaign: "አዲስ ዘመቻ ፍጠር",
    match_archive: "የጨዋታዎች ማህደር",
    active_matches: "ንቁ ጨዋታዎች",
    total_stake_24h: "ጠቅላላ መያዣ (24ሰ)",
    avg_game_time: "አማካይ የጨዋታ ጊዜ",
    system_health: "የሲስተም ጤና",
    nominal: "ጥሩ",
    financial_ledger: "የፋይናንስ መዝገብ",
    total_volume: "ጠቅላላ ልውውጥ",
    pending_approval: "በጥበቃ ላይ ያለ",
    recent_deposits: "የቅርብ ጊዜ የተቀማጭ ጥያቄዎች",
    recent_withdrawals: "የቅርብ ጊዜ የወጪ ጥያቄዎች",
    see_receipt: "ደረሰኝ እይ",
    transaction_receipt: "የክፍያ ደረሰኝ",
    user_account: "የተጠቃሚ ሂሳብ",
    internal_ref: "የውስጥ መለያ",
    provider_ref: "የአቅራቢ መለያ",
    method: "መንገድ",
    timestamp: "ጊዜ",
    download_receipt: "ደረሰኝ አውርድ",
    security_protocols: "የደህንነት ፕሮቶኮሎች",
    app_status: "የመተግበሪያ ሁኔታ",
    emergency_lockdown: "የአደጋ ጊዜ መቆለፊያ",
    payout_gateway: "የክፍያ መተላለፊያ",
    super_admin_only: "ለሱፐር አድሚን ብቻ",
    save_changes: "ለውጦችን አስቀምጥ",
    cancel_action: "ሰርዝ",
    confirm_action: "አረጋግጥ",
    search_ledger: "መዝገብ ፈልግ...",
    filter_status: "ሁኔታ",
    audit_trail: "የሲስተም ኦዲት ታሪክ",
    audit_subtitle: "ሁሉንም አስተዳደራዊ እንቅስቃሴዎች የሚያሳይ ግልጽ መዝገብ።",
    activity_logs: "የእንቅስቃሴ ምዝግብ ማስታወሻዎች",
    search_audit: "ተግባር ወይም አስተዳዳሪ ይፈልጉ...",
    admin_label: "አስተዳዳሪ",
    action_label: "ተግባር",
    target_label: "ዒላማ",
    context_label: "ዝርዝር ሁኔታ",
    rate_limited_title: "ሙከራ በዝቷል",
    rate_limited_message: "ለደህንነትዎ ሲባል ሌላ ኮድ ከመጠየቅዎ በፊት እባክዎ 15 ደቂቃ ይጠብቁ።",
    player_matrix: "ተጫዋቾች ዝርዝር",
    search_users: "ተጫዋቾችን ፈልግ...",
    status_all: "ሁሉም",
    status_pending: "በጥበቃ ላይ",
    status_success: "ተሳክቷል",
    status_failed: "አልተሳካም",
    match_history: "የጨዋታ ታሪክ",
    filter_label: "አጣራ",
    participants: "ተሳታፊዎች",
    stake_label: "መያዣ",
    result_label: "ውጤት",
    match_id: "የጨዋታ መለያ",
    x_won: "X አሸነፈ",
    o_won: "O አሸነፈ",
    draw_label: "እኩል",
    room1_tracker: "የክፍል 1 አሸናፊዎች መከታተያ",
    room1_tracker_sub: "በእያንዳንዱ የውርርድ ደረጃ 25 የድል ጣሪያ",
    wants_rematch: "እንደገና መጫወት ይፈልጋል!",
    waiting_response: "ምላሽ በመጠባበቅ ላይ...",
    declined_invite: "አሁን መጫወት አይፈልግም!",
    nah_skip: "አይ፣ ይለፍ",
    lets_go: "እንሂድ!",
  },
};

type Ctx = {
  token: string | null;
  user: AuthUser | null;
  booting: boolean;
  offline: boolean;
  retry: () => Promise<void>;

  // OTP flow
  requestingOtp: boolean;
  verifyingOtp: boolean;
  pendingNumber: string | null; // the last number used in requestOtp
  requestOtp: (rawNumber: string) => Promise<void>;
  verifyOtp: (rawNumber: string, code: string, ref?: string, promo?: string) => Promise<void>;

  // Telegram login flow
  loginWithTelegram: () => Promise<void>;
  telegramLoading: boolean;

  // Direct token login (URL token hydration / deep link)
  loginWithToken: (token: string, refreshToken?: string) => Promise<void>;

  // Profile & session
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;

  // Payment methods
  paymentMethod: PaymentMethod[];
  fetchingMethods: boolean;
  fetchPaymentMethods: () => Promise<PaymentMethod[]>;
  refreshPaymentMethods: () => Promise<PaymentMethod[]>;
  isSuperAdmin: boolean;
  showAlert: (title: string, message: string) => void;
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  };
  closeAlert: () => void;

  // Sound methods
  playSuccessSound: () => Promise<void>;
  playErrorSound: () => Promise<void>;
  playClickSound: () => Promise<void>;

  // Language methods
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  switchLanguage: () => void;
  fixUrl: (url?: string | null) => string | null;
};

// ---------- helpers ----------

// Cross-platform storage: SecureStore on native, localStorage on web

const storage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        return null;
      }
      return null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

const KEY = "auth_v2_token";
const REFRESH_KEY = "auth_v2_refresh";
const LANGUAGE_KEY = "app_language";
const METHODS_KEY = "payment_methods_v1";
const USER_KEY = "auth_v2_user";

const normalizeTo251 = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (/^251\d{9}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return `251${digits.slice(1)}`;
  if (/^\d{9}$/.test(digits)) return `251${digits}`;
  throw new Error("INVALID_NUMBER");
};

async function fetchMe(token: string, opts?: { signal?: AbortSignal }): Promise<AuthUser> {
  const res = await fetch(`${API_URL}/user/me`, {
    method: "GET",
    headers: { 
      "Content-Type": "application/json", 
      Authorization: `Bearer ${token}`,
      "x-platform": Platform.OS === "web" ? "web" : "mobile"
    },
    signal: opts?.signal,
  });
  if (res.status === 429) {
    // Rate-limited: throw a specific error so callers can back off
    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter ? Number(retryAfter) * 1000 : 15000;
    const err: any = new Error(`RATE_LIMITED`);
    err.status = 429;
    err.retryAfterMs = waitMs;
    throw err;
  }
  if (res.status === 401) {
    const err: any = new Error(`UNAUTHORIZED`);
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Failed to fetch profile (${res.status})`);
  }
  return (await res.json()) as AuthUser;
}

function normalizeMethods(input: any): PaymentMethod[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m) => {
      const key = String(m?.key ?? "");
      const label = String(m?.label ?? "");
      if (!key || !label) return null;

      const colorsArr = Array.isArray(m?.colors) ? m.colors : [];
      const colors: [string, string] | undefined =
        colorsArr.length >= 2 ? [String(colorsArr[0]), String(colorsArr[1])] : undefined;

      return {
        key,
        label,
        subtitle: m?.subtitle ? String(m.subtitle) : undefined,
        colors,
        icon: m?.icon ? String(m.icon) : undefined,
        imageUrl: m?.imageUrl ? String(m.imageUrl) : undefined,
      } as PaymentMethod;
    })
    .filter(Boolean) as PaymentMethod[];
}

async function loadCachedMethods(): Promise<PaymentMethod[]> {
  try {
    const raw = await storage.getItemAsync(METHODS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeMethods(parsed);
  } catch {
    return [];
  }
}

async function saveCachedMethods(methods: PaymentMethod[]) {
  try {
    await storage.setItemAsync(METHODS_KEY, JSON.stringify(methods));
  } catch {}
}

async function fetchMethodsFromApi(token?: string | null, opts?: { signal?: AbortSignal }): Promise<PaymentMethod[]> {
  if (!token) return [];
  const res = await fetch(`${API_URL}/payments/methods`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-platform": Platform.OS === "web" ? "web" : "mobile"
    },
    signal: opts?.signal,
  });

  // 429 = rate-limited. Return empty silently — cached methods will be used.
  if (res.status === 429) return [];

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Failed to fetch methods (${res.status})`);
  }

  const data = await res.json().catch(() => []);
  return normalizeMethods(data);
}

// ---------- context ----------
const AuthContext = createContext<Ctx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [retrying, setRetrying] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [pendingNumber, setPendingNumber] = useState<string | null>(null);
  const [offline, setOffline] = useState<boolean>(false);
  const [telegramLoading, setTelegramLoading] = useState(false);

  // Language state
  const [language, setLanguageState] = useState<Language>("en");

  // Methods state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod[]>([]);
  const [fetchingMethods, setFetchingMethods] = useState(false);

  const refreshingRef = useRef<Promise<void> | null>(null);
  const methodsFetchingRef = useRef<Promise<PaymentMethod[]> | null>(null);

  // Sound effects players and methods using expo-audio
  const clickPlayer = useAudioPlayer(require("../assets/sounds/click.wav"));
  const winPlayer = useAudioPlayer(require("../assets/sounds/win.mp3"));
  const losePlayer = useAudioPlayer(require("../assets/sounds/lose.wav"));

  const playSuccessSound = async () => {
    if ((!user || !user.sound_muted) && clickPlayer) {
      try {
        await Promise.resolve(clickPlayer.play()).catch(() => {});
      } catch (_) {}
    }
  };
  const playErrorSound = async () => {
    if ((!user || !user.sound_muted) && losePlayer) {
      try {
        await Promise.resolve(losePlayer.play()).catch(() => {});
      } catch (_) {}
    }
  };
  const playClickSound = async () => {
    if ((!user || !user.sound_muted) && clickPlayer) {
      try {
        await Promise.resolve(clickPlayer.play()).catch(() => {});
      } catch (_) {}
    }
  };

  // Load saved language on boot
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = (await storage.getItemAsync(LANGUAGE_KEY)) as Language;
        if (savedLanguage && (savedLanguage === "en" || savedLanguage === "am")) {
          setLanguageState(savedLanguage);
        }
      } catch (error) {
        console.log("Error loading saved language:", error);
      }
    };
    loadSavedLanguage();
  }, []);

  // Translation function
  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  // Switch between languages
  const switchLanguage = useCallback(async () => {
    const newLanguage: Language = language === "en" ? "am" : "en";
    setLanguageState(newLanguage);
    await storage.setItemAsync(LANGUAGE_KEY, newLanguage);
    await playClickSound();
  }, [language]);

  const retry = async () => {
    setRetrying((prev) => !prev);
  };

  const testConnection = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${API_URL}/health`, {
        method: "GET",
        headers: { "x-platform": Platform.OS === "web" ? "web" : "mobile" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      // 429 means server IS reachable — just throttled. Don't mark offline.
      if (res.status === 429 || res.ok) {
        setOffline(false);
        return;
      }
      setOffline(true);
    } catch {
      clearTimeout(timeoutId);
      setOffline(true);
    }
  };

  // -------- payment methods fetch + cache --------
  const fetchPaymentMethods = useCallback(async (): Promise<PaymentMethod[]> => {
    // de-dupe concurrent calls
    if (methodsFetchingRef.current) return methodsFetchingRef.current;

    methodsFetchingRef.current = (async () => {
      setFetchingMethods(true);

      // 1) show cached immediately if empty (fast UI)
      try {
        const cached = await loadCachedMethods();
        if (cached.length && paymentMethod.length === 0) {
          setPaymentMethod(cached);
        }
      } catch {}

      // 2) fetch fresh
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const fresh = await fetchMethodsFromApi(token, { signal: controller.signal }).finally(() => {
          clearTimeout(timeoutId);
        });

        if (fresh.length) {
          setPaymentMethod(fresh);
          await saveCachedMethods(fresh);
        }
        return fresh;
      } catch (e) {
        // keep cached if fetch fails
        const cached = await loadCachedMethods();
        if (cached.length) {
          setPaymentMethod(cached);
          return cached;
        }
        // if nothing cached, return empty and let UI fallback
        return [];
      } finally {
        setFetchingMethods(false);
        methodsFetchingRef.current = null;
      }
    })();

    return methodsFetchingRef.current;
  }, [token, paymentMethod.length]);

  const refreshPaymentMethods = useCallback(async (): Promise<PaymentMethod[]> => {
    // force fetch (but still dedupe)
    return fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  // Boot: restore token and preload /me + methods in parallel (Non-blocking Speed Optimization!)
  useEffect(() => {
    (async () => {
      try {
        // Run health check in the background without blocking boot
        void testConnection();

        // 0) Check URL or deep link for incoming token (e.g. from Telegram login return)
        let incomingToken: string | null = null;
        let incomingRefresh: string | null = null;

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const t = urlParams.get('token') || urlParams.get('auth_token');
            const r = urlParams.get('refresh') || urlParams.get('refreshToken');
            if (t) {
              incomingToken = t;
              incomingRefresh = r;
            }
          } catch (_) {}
        }

        if (!incomingToken) {
          try {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const parsed = new URL(initialUrl);
              const t = parsed.searchParams.get('token') || parsed.searchParams.get('auth_token');
              const r = parsed.searchParams.get('refresh') || parsed.searchParams.get('refreshToken');
              if (t) {
                incomingToken = t;
                incomingRefresh = r;
              }
            }
          } catch (_) {}
        }

        // 1) Load cached tokens, cached user profile, and cached methods in parallel (near-instant)
        const [savedToken, cachedUserRaw, cachedMethods] = await Promise.all([
          storage.getItemAsync(KEY),
          storage.getItemAsync(USER_KEY),
          loadCachedMethods(),
        ]);

        if (cachedMethods.length) {
          setPaymentMethod(cachedMethods);
        }

        let cachedUser: AuthUser | null = null;
        if (cachedUserRaw) {
          try {
            cachedUser = JSON.parse(cachedUserRaw) as AuthUser;
          } catch {}
        }

        const effectiveToken = incomingToken || savedToken;

        if (incomingToken) {
          await storage.setItemAsync(KEY, incomingToken);
          if (incomingRefresh) {
            await storage.setItemAsync(REFRESH_KEY, incomingRefresh);
          }
          cachedUser = null; // Stale cache should not be used for a newly provided token
        }

        if (effectiveToken) {
          setToken(effectiveToken);
          if (cachedUser) {
            setUser(cachedUser);
            // Hide the splash screen instantly for users with valid cached session!
            setBooting(false);
          }

          try {
            if (!cachedUser) {
              // Blocking boot if no cache exists to prevent UI flicker
              const [profile] = await Promise.all([
                fetchMe(effectiveToken),
                fetchPaymentMethods(),
              ]);
              setUser(profile);
              await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
              setOffline(false);
              await playSuccessSound();

              // Clean up incoming token from URL bar so it doesn't linger in browser history
              if (incomingToken && Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
                try {
                  const cleanUrl = new URL(window.location.href);
                  cleanUrl.searchParams.delete('token');
                  cleanUrl.searchParams.delete('auth_token');
                  cleanUrl.searchParams.delete('refresh');
                  cleanUrl.searchParams.delete('refreshToken');
                  const newSearch = cleanUrl.searchParams.toString();
                  const target = cleanUrl.pathname + (newSearch ? `?${newSearch}` : '') + cleanUrl.hash;
                  window.history.replaceState({}, document.title, target);
                } catch (_) {}
              }
            } else {
              // Non-blocking background revalidation if cache exists (Perceived instant load!)
              void (async () => {
                try {
                  const [profile] = await Promise.all([
                    fetchMe(effectiveToken),
                    fetchPaymentMethods(),
                  ]);
                  setUser(profile);
                  await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
                  setOffline(false);
                } catch (err: any) {
                  console.warn("[boot background] Refresh failed:", err?.message);
                  if (err?.status === 401) {
                    const rt = await storage.getItemAsync(REFRESH_KEY);
                    if (rt) {
                      try {
                        const refRes = await fetch(`${API_URL}/auth/refresh`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ refreshToken: rt })
                        });
                        if (refRes.ok) {
                          const { token: newToken, refreshToken: newRt } = await refRes.json();
                          await storage.setItemAsync(KEY, newToken);
                          await storage.setItemAsync(REFRESH_KEY, newRt);
                          setToken(newToken);
                          
                          const [profile] = await Promise.all([
                            fetchMe(newToken),
                            fetchPaymentMethods(),
                          ]);
                          setUser(profile);
                          await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
                        } else {
                          await storage.deleteItemAsync(KEY);
                          await storage.deleteItemAsync(REFRESH_KEY);
                          await storage.deleteItemAsync(USER_KEY);
                          setToken(null);
                          setUser(null);
                        }
                      } catch {
                        await storage.deleteItemAsync(KEY);
                        await storage.deleteItemAsync(REFRESH_KEY);
                        await storage.deleteItemAsync(USER_KEY);
                        setToken(null);
                        setUser(null);
                      }
                    } else {
                      await storage.deleteItemAsync(KEY);
                      await storage.deleteItemAsync(USER_KEY);
                      setToken(null);
                      setUser(null);
                    }
                  }
                }
              })();
            }
          } catch (err: any) {
            if (err?.status === 401) {
              // Token expired — try silent refresh to keep user logged in
              console.warn("[boot] Token expired, attempting silent refresh…");
              const rt = await storage.getItemAsync(REFRESH_KEY);
              if (rt) {
                try {
                  const refRes = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: rt })
                  });
                  if (refRes.ok) {
                    const { token: newToken, refreshToken: newRt } = await refRes.json();
                    await storage.setItemAsync(KEY, newToken);
                    await storage.setItemAsync(REFRESH_KEY, newRt);
                    setToken(newToken);
                    
                    // Parallelize fresh profile and methods fetch after refresh
                    const [profile] = await Promise.all([
                      fetchMe(newToken),
                      fetchPaymentMethods(),
                    ]);
                    setUser(profile);
                    await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
                    setOffline(false);
                    await playSuccessSound();
                  } else {
                    console.warn("[boot] Refresh token invalid, clearing session");
                    await storage.deleteItemAsync(KEY);
                    await storage.deleteItemAsync(REFRESH_KEY);
                    await storage.deleteItemAsync(USER_KEY);
                    setToken(null);
                    setUser(null);
                  }
                } catch {
                  console.warn("[boot] Refresh request failed");
                  await storage.deleteItemAsync(KEY);
                  await storage.deleteItemAsync(REFRESH_KEY);
                  await storage.deleteItemAsync(USER_KEY);
                  setToken(null);
                  setUser(null);
                }
              } else {
                await storage.deleteItemAsync(KEY);
                await storage.deleteItemAsync(USER_KEY);
                setToken(null);
                setUser(null);
              }
            } else if (err?.status === 429) {
              console.warn("[boot] Rate-limited, waiting 5s…");
              await new Promise(r => setTimeout(r, 5000));
              try {
                const profile = await fetchMe(effectiveToken);
                setUser(profile);
                await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
                setOffline(false);
              } catch {
                console.warn("[boot] Retry also failed, continuing with cached state");
              }
            } else if (err?.name === "AbortError") {
              console.warn("Fetch timeout → offline mode");
              setOffline(true);
            } else {
              console.warn("Fetch failed:", err?.message);
              setOffline(true);
              await playErrorSound();
            }
          }
        } else {
          // 3) Anonymous guest / login page route: do not pre-fetch payment methods without authorization
        }
      } finally {
        setBooting(false);
      }
    })();
  }, [retrying]); // ← removed fetchPaymentMethods from deps: it changes on every render
                   //   due to paymentMethod.length, causing an infinite boot loop.

  // ---- public methods ----
  const requestOtp = async (rawNumber: string) => {
    const number = normalizeTo251(rawNumber);
    setRequestingOtp(true);
    try {
      await playClickSound();


      const res = await fetch(`${API_URL}/auth/request-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-platform": Platform.OS === "web" ? "web" : "mobile" 
        },
        body: JSON.stringify({ number }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("RATE_LIMITED");
        }
        const raw = await res.text().catch(() => "");
        await playErrorSound();
        // Prefer the server's friendly message field over the raw JSON body
        let friendly = raw;
        try {
          const parsed = JSON.parse(raw);
          friendly = parsed.message || parsed.error || raw;
        } catch {}
        throw new Error(friendly || `OTP request failed (${res.status})`);
      }
      setPendingNumber(number);
      await playSuccessSound();
    } finally {
      setRequestingOtp(false);
    }
  };

  const verifyOtp = async (rawNumber: string, code: string, ref?: string, promo?: string) => {
    const number = normalizeTo251(rawNumber);
    if (!/^\d{4,8}$/.test(code)) {
      await playErrorSound();
      throw new Error("INVALID_CODE");
    }

    setVerifyingOtp(true);
    try {
      await playClickSound();


      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-platform": Platform.OS === "web" ? "web" : "mobile" 
        },
        body: JSON.stringify({ number, code, ref, promo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        await playErrorSound();
        throw new Error(data?.message || data?.error || "VERIFY_FAILED");
      }

      const newToken = String(data.token);
      await storage.setItemAsync(KEY, newToken);
      if (data.refreshToken) {
        await storage.setItemAsync(REFRESH_KEY, String(data.refreshToken));
      }
      setToken(newToken);

      const profile = await fetchMe(newToken);
      setUser(profile);
      await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
      setPendingNumber(null);

      // fetch methods after login (in case endpoint requires auth)
      void fetchPaymentMethods();

      await playSuccessSound();
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Direct token login handler for deep links and URL params
  const loginWithToken = useCallback(async (newToken: string, newRefreshToken?: string) => {
    try {
      setBooting(true);
      await storage.setItemAsync(KEY, newToken);
      if (newRefreshToken) {
        await storage.setItemAsync(REFRESH_KEY, newRefreshToken);
      }
      setToken(newToken);

      const [profile] = await Promise.all([
        fetchMe(newToken),
        fetchPaymentMethods(),
      ]);
      setUser(profile);
      await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
      setOffline(false);
      await playSuccessSound();

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.replaceState) {
        try {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('token');
          cleanUrl.searchParams.delete('auth_token');
          cleanUrl.searchParams.delete('refresh');
          cleanUrl.searchParams.delete('refreshToken');
          const newSearch = cleanUrl.searchParams.toString();
          const target = cleanUrl.pathname + (newSearch ? `?${newSearch}` : '') + cleanUrl.hash;
          window.history.replaceState({}, document.title, target);
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('[loginWithToken] failed:', err?.message);
      if (err?.status === 401) {
        await storage.deleteItemAsync(KEY);
        await storage.deleteItemAsync(REFRESH_KEY);
        await storage.deleteItemAsync(USER_KEY);
        setToken(null);
        setUser(null);
      }
    } finally {
      setBooting(false);
    }
  }, [fetchPaymentMethods]);

  // Deep linking listener for runtime incoming URLs
  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      try {
        if (!url) return;
        const parsed = new URL(url);
        const t = parsed.searchParams.get('token') || parsed.searchParams.get('auth_token');
        const r = parsed.searchParams.get('refresh') || parsed.searchParams.get('refreshToken');
        if (t) {
          await loginWithToken(t, r || undefined);
        }
      } catch (_) {}
    });
    return () => sub.remove();
  }, [loginWithToken]);

  // ---- Telegram login ----
  const loginWithTelegram = useCallback(async () => {
    setTelegramLoading(true);
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    try {
      await playClickSound();

      // 1) Init session on backend — defaults to /home/gameplay
      const returnUrl = (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin)
        ? `${window.location.origin}/home/gameplay`
        : 'https://xo-frontend-gamma.vercel.app/home/gameplay';

      const initRes = await fetch(`${API_URL}/auth/telegram-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-platform': Platform.OS === 'web' ? 'web' : 'mobile',
        },
        body: JSON.stringify({ returnUrl }),
      });
      if (!initRes.ok) {
        throw new Error('Failed to start Telegram login');
      }
      const { sessionToken, deepLink } = await initRes.json();

      // 2) Open Telegram
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(deepLink, '_blank');
        } else {
          await Linking.openURL(deepLink);
        }
      } catch (openErr) {
        if (Platform.OS === 'web') {
          window.open(deepLink, '_blank');
        } else {
          await Linking.openURL(deepLink).catch(() => {});
        }
      }

      // 3) Poll for result every 2 seconds (max 5 min = 150 polls)
      let polls = 0;
      const maxPolls = 150;

      await new Promise<void>((resolve, reject) => {
        pollTimer = setInterval(async () => {
          polls++;
          if (polls > maxPolls) {
            if (pollTimer) clearInterval(pollTimer);
            reject(new Error('Login session expired. Please try again.'));
            return;
          }

          try {
            const pollRes = await fetch(
              `${API_URL}/auth/telegram-poll?session=${sessionToken}`,
              {
                headers: {
                  'x-platform': Platform.OS === 'web' ? 'web' : 'mobile',
                },
              }
            );
            if (!pollRes.ok) return; // Retry on next interval

            const data = await pollRes.json();

            if (data.status === 'done') {
              if (pollTimer) clearInterval(pollTimer);

              // Save tokens (same as verifyOtp)
              const newToken = String(data.token);
              await storage.setItemAsync(KEY, newToken);
              if (data.refreshToken) {
                await storage.setItemAsync(REFRESH_KEY, String(data.refreshToken));
              }
              setToken(newToken);

              // Fetch full profile
              const profile = await fetchMe(newToken);
              setUser(profile);
              await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
              setPendingNumber(null);

              // Fetch payment methods
              void fetchPaymentMethods();

              await playSuccessSound();
              resolve();
            } else if (data.status === 'expired') {
              if (pollTimer) clearInterval(pollTimer);
              reject(new Error('Session expired. Please try again.'));
            }
            // If status === 'waiting', continue polling
          } catch {
            // Network error during poll — just retry on next interval
          }
        }, 600);
      });
    } catch (err: any) {
      await playErrorSound();
      throw err;
    } finally {
      if (pollTimer) clearInterval(pollTimer);
      setTelegramLoading(false);
    }
  }, [fetchPaymentMethods]);

  // Cooldown: prevent refreshProfile from firing more than once every 5 seconds
  const lastRefreshRef = useRef<number>(0);
  const REFRESH_COOLDOWN_MS = 5000;

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'maintenance' || user?.role === 'maintenance_admin';

  const showAlert = (title: string, message: string) => {
    const isError = title.toLowerCase().includes('error') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('failed');
    
    setAlertConfig({
      visible: true,
      title: title || (isError ? 'Notice' : 'Success'),
      message,
      type: isError ? 'error' : 'success'
    });
  };

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const refreshProfile = useCallback(async () => {
    if (!token) throw new Error("NO_TOKEN");

    // Throttle: skip if called again within cooldown
    const now = Date.now();
    if (now - lastRefreshRef.current < REFRESH_COOLDOWN_MS && refreshingRef.current) {
      return refreshingRef.current;
    }

    if (!refreshingRef.current) {
      lastRefreshRef.current = now;
      refreshingRef.current = (async () => {
        try {
          let activeToken = token;
          try {
            const profile = await fetchMe(activeToken);
            setUser(profile);
            await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
          } catch (profileErr: any) {
            // ✅ Military-Grade: Transparent Token Rotation on 401
            if (profileErr?.status === 401) {
              const rt = await storage.getItemAsync(REFRESH_KEY);
              if (!rt) throw profileErr; // No refresh token -> drop to logout

              const refRes = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: rt })
              });

              if (!refRes.ok) throw profileErr;

              const { token: newToken, refreshToken: newRt } = await refRes.json();
              await storage.setItemAsync(KEY, newToken);
              await storage.setItemAsync(REFRESH_KEY, newRt);
              setToken(newToken);
              activeToken = newToken;

              // Retry profile fetch with new access token
              const profile = await fetchMe(activeToken);
              setUser(profile);
              await storage.setItemAsync(USER_KEY, JSON.stringify(profile));
            } else {
              throw profileErr;
            }
          }

          await playSuccessSound();

          // After profile loads, spawn a background check to rescue any dropped webhooks
          fetch(`${API_URL}/payments/verify-pending`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(async data => {
               if (data && data.completedCount > 0) {
                  const updatedProfile = await fetchMe(token);
                  setUser(updatedProfile);
                  await storage.setItemAsync(USER_KEY, JSON.stringify(updatedProfile));
               }
            })
            .catch(() => {});

        } catch (error: any) {
          // Silently swallow 429 — don't propagate to callers (prevents retry storms)
          if (error?.status === 429) {
            console.warn('[refreshProfile] Rate-limited, backing off');
            return;
          }
          await playErrorSound();
          throw error;
        } finally {
          refreshingRef.current = null;
        }
      })();
    }
    return refreshingRef.current;
  }, [token]);

  const logout = async () => {
    await playClickSound();
    
    // Attempt backend revocation
    try {
      const activeToken = await storage.getItemAsync(KEY);
      const activeRefresh = await storage.getItemAsync(REFRESH_KEY);
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
        },
        body: JSON.stringify({ refreshToken: activeRefresh })
      }).catch(() => {});
    } catch {}

    await storage.deleteItemAsync(KEY);
    await storage.deleteItemAsync(REFRESH_KEY);
    await storage.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
    setPendingNumber(null);
    await playSuccessSound();
  };

  // Setter that persists language
  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await storage.setItemAsync(LANGUAGE_KEY, lang);
    await playClickSound();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      offline,
      retry,

      requestingOtp,
      verifyingOtp,
      pendingNumber,
      requestOtp,
      verifyOtp: verifyOtp as any,
      loginWithTelegram,
      telegramLoading,
      loginWithToken,

      refreshProfile,
      logout,

      // Methods
      paymentMethod,
      fetchingMethods,
      fetchPaymentMethods,
      refreshPaymentMethods,

      // Sounds
      playSuccessSound,
      playErrorSound,
      playClickSound,

      // Language
      language,
      setLanguage,
      t,
      switchLanguage,
      fixUrl: fixAvatarUrl,
      isSuperAdmin,
      showAlert,
      alertConfig,
      closeAlert,
    }),
    [
      token,
      user,
      booting,
      offline,
      requestingOtp,
      verifyingOtp,
      pendingNumber,
      telegramLoading,
      loginWithTelegram,
      loginWithToken,
      language,
      paymentMethod,
      fetchingMethods,
      fetchPaymentMethods,
      refreshPaymentMethods,
      setLanguage,
      t,
      switchLanguage,
      isSuperAdmin,
      showAlert,
      alertConfig,
      closeAlert,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999999, // Ensure it's on top of everything
  },
  alertContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0c0c1f',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(68,68,107,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10
  },
  alertIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  alertTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center'
  },
  alertMessage: {
    color: '#a8a7d4',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32
  },
  alertBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00daf3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  alertBtnText: {
    color: '#0c0c1f',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1
  }
});

/**
 * Root-level container for global modals and alerts.
 * Render this in your _layout.tsx to ensure alerts are always on top.
 */
export const GlobalUIComponents = () => {
  const { alertConfig, closeAlert } = useAuth();
  
  if (!alertConfig.visible) return null;

  return (
    <Modal
      visible={alertConfig.visible}
      transparent
      animationType="fade"
      onRequestClose={closeAlert}
    >
      <Pressable style={styles.alertOverlay} onPress={closeAlert}>
        <Pressable style={styles.alertContent}>
          <View style={[styles.alertIconBg, { backgroundColor: alertConfig.type === 'error' ? 'rgba(253,111,133,0.15)' : 'rgba(0,218,243,0.15)' }]}>
            {alertConfig.type === 'error' ? (
              <AlertCircleIcon size={40} color="#fd6f85" />
            ) : (
              <CheckmarkCircleIcon size={40} color="#00daf3" />
            )}
          </View>
          
          <Text style={styles.alertTitle}>{alertConfig.title}</Text>
          <Text style={styles.alertMessage}>{alertConfig.message}</Text>
          
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={closeAlert}
            style={[styles.alertBtn, { backgroundColor: alertConfig.type === 'error' ? '#fd6f85' : '#00daf3' }]}
          >
            <Text style={styles.alertBtnText}>OKAY</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const useAuth = (): Ctx => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    console.warn("[useAuth] Warning: useAuth called outside AuthProvider. Using fallback.");
    return {
      token: null,
      user: null,
      booting: false,
      retrying: false,
      loginWithPhone: async () => {},
      verifyPhoneOtp: async () => ({ ok: false }),
      loginWithTelegramData: async () => ({ ok: false }),
      logout: async () => {},
      refreshProfile: async () => {},
      setSoundMuted: async () => {},
      requestOtp: async () => ({ ok: false }),
      verifyOtp: async () => ({ ok: false }),
      updateAvatar: async () => ({ ok: false }),
      updateUsername: async () => ({ ok: false }),
      requestWithdraw: async () => ({ ok: false }),
      showAlert: () => {},
      closeAlert: () => {},
      playSuccessSound: async () => {},
      playErrorSound: async () => {},
      playClickSound: async () => {},
      language: "en",
      setLanguage: () => {},
      t: (key: string) => key,
      switchLanguage: () => {},
      fixUrl: (url?: string | null) => url || null,
    } as any;
  }
  return ctx;
};
