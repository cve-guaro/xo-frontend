// lib/voiceService.ts
// ────────────────────────────────────────────────────────────────────────────
// Voice chat service wrapper for Agora RTC.
// Supports Agora Web RTC SDK (agora-rtc-sdk-ng) and react-native-agora.
// ────────────────────────────────────────────────────────────────────────────
import { Platform } from "react-native";
import { API_URL, AGORA_APP_ID } from "../config";

let AgoraRTC: any = null;
if (Platform.OS === "web") {
  try {
    AgoraRTC = require("agora-rtc-sdk-ng");
  } catch (e) {
    console.warn("[VoiceService] agora-rtc-sdk-ng package not found for web fallback.");
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
  private appId = AGORA_APP_ID || "ba52d09d3e204851af7ddbe4340b38a2";
  private joinRetryCount = 0;
  private maxJoinRetries = 2;
  private speakingListeners: Array<(speakers: string[]) => void> = [];

  onSpeaking(callback: (speakers: string[]) => void) {
    this.speakingListeners.push(callback);
    return () => {
      this.speakingListeners = this.speakingListeners.filter(fn => fn !== callback);
    };
  }

  async fetchToken(roomId: string, uid: string | number): Promise<{ token: string; channel: string; uid: any } | null> {
    try {
      const res = await fetch(`${API_URL}/voice/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, uid }),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn("[VoiceService] fetchToken failed:", e);
    }
    return null;
  }

  async initialize(appId?: string): Promise<boolean> {
    this.appId = appId || AGORA_APP_ID || "ba52d09d3e204851af7ddbe4340b38a2";

    if (Platform.OS === "web" && AgoraRTC) {
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

        this.rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

        this.rtcClient.enableAudioVolumeIndicator();
        this.rtcClient.on("volume-indicator", (volumes: any[]) => {
          const activeSpeakers = volumes.filter(v => v.level > 5).map(v => String(v.uid));
          this.speakingListeners.forEach(fn => fn(activeSpeakers));
        });

        // Listen for remote users publishing audio
        this.rtcClient.on("user-published", async (user: any, mediaType: string) => {
          try {
            await this.rtcClient.subscribe(user, mediaType);
            if (mediaType === "audio") {
              user.audioTrack?.play();
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

  async joinChannel(channelId: string, uid: number | string, customToken?: string): Promise<boolean> {
    const channelName = channelId.startsWith("spin_room_") ? channelId : `spin_room_${channelId}`;
    this.currentChannel = channelName;
    this.currentUid = uid;

    // Request Agora Token from backend
    let token = customToken;
    if (!token) {
      const tokenRes = await this.fetchToken(channelId, uid);
      if (tokenRes?.token) {
        token = tokenRes.token;
      }
    }

    if (Platform.OS === "web" && this.rtcClient) {
      try {
        const state = this.rtcClient.connectionState;
        if (state === "CONNECTED" || state === "CONNECTING") {
          console.log(`[VoiceService] Web client already in ${state} state, skipping join.`);
          this.isJoined = true;
          return true;
        }

        await this.rtcClient.join(this.appId, channelName, token || null, uid);
        this.isJoined = true;
        this.joinRetryCount = 0;
        console.log(`[VoiceService] Web client joined channel "${channelName}" as UID ${uid}`);

        // Only publish AFTER join succeeds — prevents "haven't joined yet" error
        try {
          if (!this.localAudioTrack) {
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          }
          if (this.isJoined && this.rtcClient) {
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
        if (err?.code === "INVALID_OPERATION" || String(err?.message || "").includes("connecting/connected")) {
          console.log("[VoiceService] Client already connecting/connected, treating as success.");
          this.isJoined = true;
          return true;
        }

        console.warn("[VoiceService] Web joinChannel failed:", err?.message || err);
        this.isJoined = false;

        // Auto-retry once after a brief delay (handles transient Agora edge server issues)
        if (this.joinRetryCount < this.maxJoinRetries) {
          this.joinRetryCount++;
          console.log(`[VoiceService] Retrying join (attempt ${this.joinRetryCount}/${this.maxJoinRetries})...`);
          await new Promise(r => setTimeout(r, 1500));
          return this.joinChannel(channelId, uid, token || undefined);
        }
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
    if (!this.isJoined) return true;

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
        } else {
          console.warn(`[VoiceService] Remote user ${uid} audio track not found among remote users:`, remoteUsers.map((u: any) => u.uid));
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
