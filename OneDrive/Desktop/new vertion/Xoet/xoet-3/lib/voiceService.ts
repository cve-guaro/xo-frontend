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
        if (!this.rtcClient) {
          this.rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

          // Listen for remote users publishing audio
          this.rtcClient.on("user-published", async (user: any, mediaType: string) => {
            try {
              await this.rtcClient.subscribe(user, mediaType);
              if (mediaType === "audio") {
                user.audioTrack?.play();
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
        }
        this.isInitialized = true;
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
        await this.rtcClient.join(this.appId, channelName, token || null, uid);
        this.isJoined = true;

        // Turn microphone on if requested
        try {
          if (!this.localAudioTrack) {
            this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          }
          await this.rtcClient.publish([this.localAudioTrack]);
          this.localAudioTrack.setEnabled(!this.muted);
        } catch (micErr) {
          console.warn("[VoiceService] Microphone access / publish notice:", micErr);
        }

        console.log(`[VoiceService] Web client joined channel "${channelName}" as UID ${uid}`);
        return true;
      } catch (err) {
        console.error("[VoiceService] Web joinChannel error:", err);
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
    if (this.engine) {
      try {
        const numUid = typeof uid === "number" ? uid : this.stringToUid(String(uid));
        this.engine.muteRemoteAudioStream(numUid, muted);
      } catch (err) {
        console.error(`[VoiceService] Mute remote user ${uid} failed:`, err);
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
