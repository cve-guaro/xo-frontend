// lib/voiceService.ts
// ────────────────────────────────────────────────────────────────────────────
// Voice chat service wrapper for Agora RTC.
// Supports Agora Web RTC SDK (agora-rtc-sdk-ng) and react-native-agora.
// ────────────────────────────────────────────────────────────────────────────
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_URL, AGORA_APP_ID } from "../config";

async function getStoredAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem("auth_v2_token");
      }
    } catch {}
    return null;
  }
  try {
    return await SecureStore.getItemAsync("auth_v2_token");
  } catch {
    return null;
  }
}

let AgoraRTC: any = null;
async function getAgoraRTC(): Promise<any> {
  if (Platform.OS !== "web") return null;
  if (AgoraRTC) return AgoraRTC;
  try {
    const mod = await import("agora-rtc-sdk-ng");
    AgoraRTC = mod?.default || mod;
    return AgoraRTC;
  } catch {
    // Optional web fallback: agora-rtc-sdk-ng not installed
    return null;
  }
}

let RNSearchAgora: any = null;
if (Platform.OS !== "web") {
  try {
    RNSearchAgora = require("react-native-agora");
  } catch (e) {
    // Fallback
  }
}

class VoiceService {
  private rtcClient: any = null;
  private localAudioTrack: any = null;
  private engine: any = null;
  private isInitialized = false;
  private isJoined = false;
  private currentChannel = "";
  private currentUid: number | string = 0;
  private muted = true;
  private appId = AGORA_APP_ID || "";
  private joinRetryCount = 0;
  private maxJoinRetries = 2;
  private voiceDisabledOnServer = false;
  private speakingListeners: Array<(speakers: string[]) => void> = [];
  private locallyMutedUids = new Set<string>();
  private allRemoteMuted = false;
  private joinAttemptId = 0;

  onSpeaking(callback: (speakers: string[]) => void) {
    this.speakingListeners.push(callback);
    return () => {
      this.speakingListeners = this.speakingListeners.filter(fn => fn !== callback);
    };
  }

  async fetchToken(roomId: string, uid: string | number, authToken?: string): Promise<{ token: string; channel: string; uid: any; appId?: string } | null> {
    if (this.voiceDisabledOnServer) return null;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const bearer = authToken || (await getStoredAuthToken());
      if (bearer) {
        headers["Authorization"] = `Bearer ${bearer}`;
      }

      const res = await fetch(`${API_URL}/voice/token`, {
        method: "POST",
        headers,
        body: JSON.stringify({ roomId, uid }),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      if (res.status === 503 || res.status === 501) {
        this.voiceDisabledOnServer = true;
      }
    } catch (e) {
      console.warn("[VoiceService] fetchToken failed:", e);
    }
    return null;
  }

  async initialize(appId?: string): Promise<boolean> {
    this.appId = appId || AGORA_APP_ID || "";
    if (!this.appId) {
      console.warn("[VoiceService] AGORA_APP_ID is not configured. Running in Fallback / Disabled Voice mode.");
      this.isInitialized = false;
      return false;
    }

    const rtc = Platform.OS === "web" ? await getAgoraRTC() : null;
    if (Platform.OS === "web" && rtc) {
      try {
        // Always create a fresh client to avoid stale state after leave/rejoin
        if (this.rtcClient) {
          try { await this.rtcClient.leave(); } catch (_) {}
          this.rtcClient = null;
        }
        if (this.localAudioTrack) {
          try { this.localAudioTrack.stop(); this.localAudioTrack.close(); } catch (_) {}
          this.localAudioTrack = null;
        }

        this.rtcClient = rtc.createClient({ mode: "rtc", codec: "vp8" });

        this.rtcClient.enableAudioVolumeIndicator();
        this.rtcClient.on("volume-indicator", (volumes: any[]) => {
          const activeSpeakers = volumes
            .filter(v => v.level > 5)
            .map(v => (v.uid === 0 || v.uid === "0") && this.currentUid ? String(this.currentUid) : String(v.uid));
          this.speakingListeners.forEach(fn => fn(activeSpeakers));
        });

        // Listen for remote users publishing audio
        this.rtcClient.on("user-published", async (user: any, mediaType: string) => {
          try {
            await this.rtcClient.subscribe(user, mediaType);
            if (mediaType === "audio") {
              user.audioTrack?.play();
              const uidStr = String(user.uid);
              const numUidStr = String(this.stringToUid(uidStr));
              if (this.allRemoteMuted || this.locallyMutedUids.has(uidStr) || this.locallyMutedUids.has(numUidStr)) {
                user.audioTrack?.setVolume(0);
              }
              console.log(`[VoiceService] Playing remote audio from UID ${user.uid}`);
            }
          } catch (err) {
            console.warn("[VoiceService] Remote audio subscribe failed:", err);
          }
        });

        this.rtcClient.on("user-unpublished", (user: any) => {
          try {
            user.audioTrack?.stop();
          } catch (err) {}
        });

        this.isInitialized = true;
        this.isJoined = false;
        this.joinRetryCount = 0;
        console.log("[VoiceService] Agora Web RTC Client initialized successfully.");
        return true;
      } catch (err) {
        console.error("[VoiceService] Web AgoraRTC init failed:", err);
      }
    }

    if (Platform.OS !== "web" && RNSearchAgora) {
      try {
        this.engine = RNSearchAgora.createAgoraRtcEngine();
        this.engine.initialize({ appId: this.appId });
        this.engine.enableAudio();
        this.engine.setChannelProfile(RNSearchAgora.ChannelProfileType.ChannelProfileCommunication);
        this.isInitialized = true;
        console.log("[VoiceService] Agora Native RTC Engine initialized successfully.");
        return true;
      } catch (err) {
        console.error("[VoiceService] Native Agora init failed:", err);
      }
    }

    console.warn("[VoiceService] Running in Fallback / Socket Audio mode.");
    return false;
  }

  async joinChannel(channelId: string, uid: number | string, customToken?: string, authToken?: string): Promise<boolean> {
    if (this.voiceDisabledOnServer) return false;

    const attemptId = ++this.joinAttemptId;
    const channelName = channelId.startsWith("spin_room_") ? channelId : `spin_room_${channelId}`;
    this.currentChannel = channelName;
    this.currentUid = uid;

    // Request Agora Token from backend
    let token = customToken;
    if (!token) {
      const tokenRes = await this.fetchToken(channelId, uid, authToken);
      if (attemptId !== this.joinAttemptId) return false;
      if (tokenRes?.token) {
        token = tokenRes.token;
      }
    }

    if (!token || attemptId !== this.joinAttemptId) return false;

    if (Platform.OS === "web" && this.rtcClient) {
      try {
        const state = this.rtcClient.connectionState;
        if (state === "CONNECTED" || state === "CONNECTING") {
          console.log(`[VoiceService] Web client already in ${state} state, skipping join.`);
          this.isJoined = true;
          return true;
        }

        await this.rtcClient.join(this.appId, channelName, token || null, uid);
        if (attemptId !== this.joinAttemptId) {
          try { await this.rtcClient.leave(); } catch (_) {}
          this.isJoined = false;
          return false;
        }
        this.isJoined = true;
        this.joinRetryCount = 0;
        console.log(`[VoiceService] Web client joined channel "${channelName}" as UID ${uid}`);

        // Only publish AFTER join succeeds — prevents "haven't joined yet" error
        try {
          if (!this.localAudioTrack) {
            const rtcClientSdk = await getAgoraRTC();
            if (attemptId !== this.joinAttemptId) return false;
            if (rtcClientSdk) {
              this.localAudioTrack = await rtcClientSdk.createMicrophoneAudioTrack();
            }
          }
          if (attemptId !== this.joinAttemptId) {
            try { this.localAudioTrack?.stop(); this.localAudioTrack?.close(); } catch (_) {}
            this.localAudioTrack = null;
            return false;
          }
          if (this.isJoined && this.rtcClient && this.localAudioTrack) {
            await this.rtcClient.publish([this.localAudioTrack]);
            this.localAudioTrack.setEnabled(!this.muted);
          }
        } catch (micErr: any) {
          // Microphone access denied or publish failed — non-fatal
          // User can still HEAR others even if mic publish fails
          console.warn("[VoiceService] Microphone access / publish notice:", micErr?.message || micErr);
        }

        return true;
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (attemptId !== this.joinAttemptId || err?.code === "OPERATION_ABORTED" || msg.includes("OPERATION_ABORTED") || msg.includes("cancel token")) {
          this.isJoined = false;
          return false;
        }
        if (err?.code === "INVALID_OPERATION" || msg.includes("connecting/connected")) {
          console.log("[VoiceService] Client already connecting/connected, treating as success.");
          this.isJoined = true;
          return true;
        }

        console.warn("[VoiceService] Web joinChannel notice:", err?.message || err);
        this.isJoined = false;

        // Auto-retry once after a brief delay (handles transient Agora edge server issues)
        if (this.joinRetryCount < this.maxJoinRetries) {
          this.joinRetryCount++;
          console.log(`[VoiceService] Retrying join (attempt ${this.joinRetryCount}/${this.maxJoinRetries})...`);
          await new Promise(r => setTimeout(r, 1500));
          if (attemptId !== this.joinAttemptId) return false;
          try {
            return await this.joinChannel(channelId, uid, token || undefined);
          } catch {
            return false;
          }
        }
        return false;
      }
    }

    if (Platform.OS !== "web" && this.isInitialized && this.engine) {
      try {
        const numUid = typeof uid === "number" ? uid : this.stringToUid(String(uid));
        this.engine.joinChannel(token || "", channelName, "", numUid);
        this.engine.muteLocalAudioStream(this.muted);
        this.isJoined = true;
        console.log(`[VoiceService] Native joined channel "${channelName}" as UID ${numUid}`);
        return true;
      } catch (err) {
        console.error("[VoiceService] Native joinChannel failed:", err);
      }
    }

    this.isJoined = true;
    console.log(`[VoiceService] Joined channel "${channelName}" (fallback mode)`);
    return true;
  }

  async leaveChannel(): Promise<boolean> {
    this.joinAttemptId++;
    this.locallyMutedUids.clear();
    this.allRemoteMuted = false;
    const isConnectingWeb = Platform.OS === "web" && this.rtcClient && (this.rtcClient.connectionState === "CONNECTING" || this.rtcClient.connectionState === "CONNECTED");
    if (!this.isJoined && !isConnectingWeb) return true;

    if (Platform.OS === "web" && this.rtcClient) {
      try {
        if (this.localAudioTrack) {
          this.localAudioTrack.stop();
          this.localAudioTrack.close();
          this.localAudioTrack = null;
        }
        await this.rtcClient.leave();
        this.isJoined = false;
        this.rtcClient = null; // Force fresh client on next initialize()
        console.log("[VoiceService] Web client left channel.");
        return true;
      } catch (err) {
        console.error("[VoiceService] Web leaveChannel failed:", err);
      }
    }

    if (this.engine) {
      try {
        this.engine.leaveChannel();
        this.isJoined = false;
        return true;
      } catch (err) {
        console.error("[VoiceService] Native leaveChannel failed:", err);
      }
    }

    this.isJoined = false;
    return true;
  }

  async setMute(muted: boolean): Promise<void> {
    this.muted = muted;

    if (Platform.OS === "web") {
      if (!muted && !this.localAudioTrack) {
        const rtc = await getAgoraRTC();
        if (rtc) {
          try {
            this.localAudioTrack = await rtc.createMicrophoneAudioTrack();
            if (this.isJoined && this.rtcClient) {
              await this.rtcClient.publish([this.localAudioTrack]);
            }
          } catch (e: any) {
            console.warn("[VoiceService] Create mic track on unmute:", e?.message || e);
          }
        }
      }
      if (this.localAudioTrack) {
        try {
          await this.localAudioTrack.setEnabled(!muted);
          console.log(`[VoiceService] Web local microphone state set to: ${!muted ? "UNMUTED" : "MUTED"}`);
        } catch (e) {
          console.warn("[VoiceService] setEnabled error:", e);
        }
      }
      return;
    }

    if (this.engine) {
      try {
        this.engine.muteLocalAudioStream(muted);
      } catch (err) {
        console.error("[VoiceService] Native mute mic failed:", err);
      }
    }
  }

  async muteRemoteUser(uid: number | string, muted: boolean): Promise<void> {
    const numUid = typeof uid === "number" ? uid : this.stringToUid(String(uid));
    if (muted) {
      this.locallyMutedUids.add(String(uid));
      this.locallyMutedUids.add(String(numUid));
    } else {
      this.locallyMutedUids.delete(String(uid));
      this.locallyMutedUids.delete(String(numUid));
    }

    if (Platform.OS === "web" && this.rtcClient) {
      try {
        const remoteUsers = this.rtcClient.remoteUsers || [];
        const user = remoteUsers.find((u: any) => 
          String(u.uid) === String(numUid) || 
          String(u.uid) === String(uid) ||
          this.stringToUid(String(u.uid)) === numUid
        );
        if (user && user.audioTrack) {
          user.audioTrack.setVolume(muted ? 0 : 100);
          console.log(`[VoiceService] Web remote user ${uid} volume set to: ${muted ? 0 : 100}`);
        }
      } catch (err) {
        console.warn(`[VoiceService] Web mute remote user ${uid} failed:`, err);
      }
      return;
    }

    if (this.engine) {
      try {
        this.engine.muteRemoteAudioStream(numUid, muted);
      } catch (err) {
        console.error(`[VoiceService] Native mute remote user ${uid} failed:`, err);
      }
    }
  }

  async muteAllRemoteUsers(muted: boolean): Promise<void> {
    this.allRemoteMuted = muted;
    if (Platform.OS === "web" && this.rtcClient) {
      try {
        const remoteUsers = this.rtcClient.remoteUsers || [];
        remoteUsers.forEach((u: any) => {
          if (u.audioTrack) {
            u.audioTrack.setVolume(muted ? 0 : 100);
          }
        });
        console.log(`[VoiceService] Web all remote users volume set to: ${muted ? 0 : 100}`);
      } catch (err) {
        console.warn("[VoiceService] Web mute all remote users failed:", err);
      }
      return;
    }

    if (this.engine) {
      try {
        this.engine.muteAllRemoteAudioStreams(muted);
      } catch (err) {
        console.error("[VoiceService] Native mute all failed:", err);
      }
    }
  }

  stringToUid(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 100000000;
  }
}

export const voiceService = new VoiceService();
