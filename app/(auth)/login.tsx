import { Ionicons } from "@expo/vector-icons";
import { ServerIcon, ConstructIcon } from "../../components/SvgIcons";
import { LinearGradient } from "expo-linear-gradient";
import Head from "expo-router/head";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui";
import { colors, radius, space } from "../../theme/tokens";
import { useLoginFlow } from "../../hooks/useLoginFlow";
import { useBackgroundMusic } from "../../context/BackgroundMusicProvider";

export default function LoginScreen() {
  const flow = useLoginFlow();
  const { isPlaying, toggleMusic } = useBackgroundMusic();
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768 && Platform.OS === 'web';
  const mobileBannerHeight = Math.min(Math.max(Math.round(width * 0.75), 240), 340);

  const {
    step, setStep, loginMode, setLoginMode, resendTimer,
    maintenanceData, setMaintenanceData,
    guestModalVisible, setGuestModalVisible, guestLoading,
    national, otpParts, inputsRef,
    fullPhone, canSend, canVerify, isTestLoginAllowed,
    requestingOtp, verifyingOtp, telegramLoading, language, t, router,
    handleOtpChange, handleOtpKeyPress, onSend, onVerify, resend,
    handleTelegramLogin, handleGuestLogin, onNationalChange, formatPhone,
  } = flow;

  const BANNER_IMAGE = isDesktop
    ? require("../../assets/images/login-banner-desktop.webp")
    : require("../../assets/images/login-banner-mobile.webp");

  const isAm = language === 'am';
  const welcomeTitle = isAm ? 'እንኳን ደህና መጡ' : 'Welcome back';
  const welcomeSub = isAm
    ? 'ለመጫወት እና ለማሸነፍ የመግቢያ መንገድ ይምረጡ'
    : 'Secure login to play & win real cash';

  const renderChoiceButtons = () => (
    <View style={{ gap: space.md, width: '100%' }}>
      {/* Telegram — primary */}
      <Button
        label={isAm ? 'በቴሌግራም ቦት ግባ' : 'Continue with Telegram'}
        variant="telegram"
        icon="paper-plane"
        onPress={handleTelegramLogin}
        disabled={telegramLoading}
        size="lg"
        fullWidth
        style={styles.choiceButton}
      />
      {telegramLoading && (
        <Text style={styles.loadingTipText}>
          {isAm
            ? 'ቴሌግራምን ይክፈቱ እና ስልክ ቁጥርዎን ያጋሩ...'
            : 'Open Telegram and tap Share Contact...'}
        </Text>
      )}

      {/* Phone SMS — secondary */}
      <Button
        label={isAm ? 'በስልክ ቁጥር (SMS OTP) ግባ' : 'Continue with Phone (SMS OTP)'}
        variant="ghost"
        icon="call-outline"
        onPress={() => setLoginMode("sms")}
        size="lg"
        fullWidth
        style={styles.choiceButton}
      />

      {/* Test guest (dev only) */}
      {isTestLoginAllowed && (
        <Button
          label={isAm ? 'በእንግዳ አካውንት ግባ (ፈጣን መግቢያ)' : 'Test guest accounts (skip login)'}
          variant="outlineGold"
          icon="flash-outline"
          onPress={() => setGuestModalVisible(true)}
          size="lg"
          fullWidth
          style={styles.choiceButton}
        />
      )}
    </View>
  );

  const renderPhoneInput = () => (
    <View>
      <TouchableOpacity
        onPress={() => setLoginMode("choice")}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.lg }}
      >
        <Ionicons name="arrow-back" size={16} color={colors.dangerSoft} />
        <Text style={{ color: colors.dangerSoft, fontSize: 13, fontWeight: '700' }}>
          {isAm ? 'ወደ መግቢያ አማራጮች ተመለስ' : 'Back to login'}
        </Text>
      </TouchableOpacity>

      <View style={styles.phoneInputGrid}>
        <View style={styles.countryPicker}>
          <Text style={styles.countryCode}>+251</Text>
        </View>
        <View style={styles.phoneInputWrap}>
          <TextInput
            placeholder="9xx / 7xx xxx xxx"
            placeholderTextColor={colors.textFaint}
            style={styles.mainInput}
            keyboardType="number-pad"
            value={national}
            onChangeText={onNationalChange}
            maxLength={9}
          />
        </View>
      </View>

      <Button
        label={isAm ? 'የማረጋገጫ ኮድ ላክ' : 'Send Verification Code'}
        variant="telegram"
        onPress={onSend}
        disabled={!canSend}
        size="lg"
        fullWidth
        style={{ marginTop: space.xl, ...styles.phoneButton }}
      />

      {isTestLoginAllowed && (
        <Button
          label={isAm ? 'ይዝለሉ — በሙከራ እንግዳ ይግቡ' : 'Skip Login — Play as Test Guest'}
          variant="outlineGold"
          icon="flash-outline"
          onPress={() => setGuestModalVisible(true)}
          size="md"
          fullWidth
          style={{ marginTop: space.md, ...styles.phoneButton }}
        />
      )}
    </View>
  );

  const renderOtpInput = () => (
    <View>
      <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: space.lg }}>
        {isAm ? 'ወደ ስልክዎ የተላከውን 4-ዲጂት ኮድ ያስገቡ' : `Enter the 4-digit code sent to ${formatPhone(fullPhone)}`}
      </Text>
      <View style={styles.otpInputGridWrapper}>
        <View style={styles.otpInputGrid}>
          {[0, 1, 2, 3].map((i) => (
            <TextInput
              key={i}
              ref={(r) => { inputsRef.current[i] = r; }}
              keyboardType="number-pad"
              value={otpParts[i]}
              onChangeText={(t) => handleOtpChange(i, t)}
              onKeyPress={(e) => handleOtpKeyPress(i, e)}
              maxLength={1}
              style={[styles.otpInput, otpParts[i] ? styles.otpInputActive : null]}
            />
          ))}
        </View>
      </View>

      <Button
        label={t("verify_button")}
        variant="telegram"
        icon="checkmark-circle"
        onPress={onVerify}
        disabled={!canVerify}
        size="lg"
        fullWidth
        style={{ marginTop: space.xxl, ...styles.verifyButton }}
      />

      <View style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
        <TouchableOpacity onPress={() => setStep("number")}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Edit number</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={resend} disabled={requestingOtp || resendTimer > 0}>
          <Text style={{ color: (requestingOtp || resendTimer > 0) ? colors.textFaint : colors.dangerSoft, fontSize: 13, fontWeight: '700' }}>
            {requestingOtp ? 'Sending...' : (resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderForm = () => (
    <>
      {step === "number" ? (
        <View style={{ marginTop: space.xxl }}>
          {loginMode === "choice" ? renderChoiceButtons() : renderPhoneInput()}
        </View>
      ) : (
        <View style={{ marginTop: space.xxl }}>{renderOtpInput()}</View>
      )}
    </>
  );

  const renderFooter = () => (
    <View style={styles.cardFooter}>
      <Text style={styles.footerInfo}>
        By continuing, you agree to our{" "}
        <Text style={styles.footerLink} onPress={() => router.push('/(auth)/terms')}>Terms of Service</Text> and{" "}
        <Text style={styles.footerLink} onPress={() => router.push('/(auth)/privacy')}>Privacy Policy</Text>
      </Text>
    </View>
  );

  return (
    <View style={styles.backgroundImage}>
      {Platform.OS === 'web' && (
        <Head>
          <title>XO Ethiopia - Play Tic-Tac-Toe & Spin for Real Money</title>
          <meta name="title" content="XO Ethiopia - Play Tic-Tac-Toe & Spin for Real Money" />
          <meta name="description" content="Play Tic-Tac-Toe and Spin games for real cash on XO Ethiopia. Instant deposit and withdrawal." />
        </Head>
      )}
      <LinearGradient colors={["#04040a", "#090918", "#04040a"]} style={StyleSheet.absoluteFill} />
      {/* Top-Right Sound Control */}
      <View style={styles.topRightControls}>
        <TouchableOpacity
          onPress={toggleMusic}
          activeOpacity={0.8}
          style={[styles.topRightBtn, isPlaying && styles.topRightBtnActive]}
          accessibilityLabel={isPlaying ? "Mute background music" : "Unmute background music"}
        >
          <Ionicons
            name={isPlaying ? "volume-high" : "volume-mute"}
            size={18}
            color={isPlaying ? "#00daf3" : "rgba(229, 227, 255, 0.6)"}
          />
        </TouchableOpacity>
      </View>
      <SafeAreaView
        style={styles.safe}
        edges={isDesktop ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {isDesktop ? (
            <View style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
              <View style={styles.desktopContainer}>
                {/* Left: Banner */}
                <View style={styles.desktopBannerCard}>
                  <Image source={BANNER_IMAGE} style={styles.bannerImg} resizeMode="cover" />
                  <LinearGradient
                    colors={["transparent", "rgba(4, 4, 10, 0.2)", "rgba(4, 4, 10, 0.9)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.desktopBannerFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Image
                        source={require("../../assets/brand/PNG/app-icons/xo-app-rounded-square-512.png")}
                        style={{ width: 30, height: 30, borderRadius: 8 }}
                        // @ts-ignore
                        {...(Platform.OS === 'web' ? { fetchPriority: "high" } : {})}
                      />
                      <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 1 }}>XO ETHIOPIA</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
                      Play Tic-Tac-Toe & Win Real Cash
                    </Text>
                  </View>
                </View>

                {/* Right: Form */}
                <View style={styles.desktopFormWrap}>
                  <Text style={styles.cardTitle}>{welcomeTitle}</Text>
                  <Text style={styles.cardSub}>{welcomeSub}</Text>
                  {renderForm()}
                  {renderFooter()}
                </View>
              </View>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.mobileScrollContent}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.mobileBannerWrap, { height: mobileBannerHeight }]}>
                <Image
                  source={BANNER_IMAGE}
                  style={[styles.bannerImg, Platform.OS === 'web' ? ({ objectPosition: 'top center' } as any) : {}]}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(4, 4, 10, 0.15)", "rgba(4, 4, 10, 0.7)", "#04040a"]}
                  locations={[0, 0.42, 0.78, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              <View style={styles.mobileBody}>
                <View style={styles.mobileHeaderWrap}>
                  <Text style={styles.mobileTitle}>{welcomeTitle}</Text>
                  <Text style={styles.mobileSub}>{welcomeSub}</Text>
                </View>
                <View style={styles.mobileBottomSection}>
                  {step === "number" ? (
                    <View style={styles.mobileActionsWrap}>
                      {loginMode === "choice" ? renderChoiceButtons() : renderPhoneInput()}
                    </View>
                  ) : (
                    <View style={styles.mobileActionsWrap}>{renderOtpInput()}</View>
                  )}
                  {renderFooter()}
                </View>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Maintenance Overlay */}
      {maintenanceData && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6, 6, 20, 0.9)' }]} />
          {Platform.OS === 'web' && (
            <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} />
          )}
          <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <View style={{
                width: '100%', maxWidth: 420,
                backgroundColor: 'rgba(23, 23, 50, 0.7)',
                borderRadius: 32, padding: 32, paddingTop: 40,
                borderWidth: 1, borderColor: 'rgba(166,140,255,0.2)',
                alignItems: 'center'
              }}>
                <View style={{
                  width: 120, height: 120, borderRadius: 60,
                  backgroundColor: 'rgba(0, 218, 243, 0.1)',
                  borderWidth: 1, borderColor: 'rgba(0, 218, 243, 0.3)',
                  justifyContent: 'center', alignItems: 'center', marginBottom: 32,
                }}>
                <ServerIcon size={54} color="#00daf3" />
                <View style={{ position: 'absolute', bottom: -5, right: -5, width: 44, height: 44, borderRadius: 22, backgroundColor: '#0c0c1f', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(0, 218, 243, 0.4)' }}>
                  <ConstructIcon size={20} color="#00daf3" />
                </View>
              </View>
              <Text style={{
                color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 16, letterSpacing: 0.5,
                textShadowColor: 'rgba(0, 218, 243, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10
              }}>
                Maintenance
              </Text>
              <Text style={{
                color: 'rgba(229, 227, 255, 0.7)', fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 40, paddingHorizontal: 10
              }}>
                We are currently working on providing you a better service. Please check back later.
              </Text>
              <Button
                label="Close"
                variant="primary"
                onPress={() => setMaintenanceData(null)}
                size="lg"
                fullWidth
              />
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* Test Guest Modal (dev only) */}
      <Modal
        visible={isTestLoginAllowed && guestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <View style={styles.guestOverlay}>
          <Pressable style={styles.guestBackdrop} onPress={() => setGuestModalVisible(false)} />
          <View style={styles.guestCard}>
            <View style={styles.guestHeader}>
              <View style={styles.guestHeaderIcon}>
                <Ionicons name="flash" size={24} color="#facc15" />
              </View>
              <View>
                <Text style={styles.guestHeaderTitle}>Select Test Guest</Text>
                <Text style={styles.guestHeaderSub}>
                  Instant testing • 1,000 ETB included
                </Text>
              </View>
              <TouchableOpacity onPress={() => setGuestModalVisible(false)} style={styles.guestCloseBtn}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.guestHint}>
              Choose one of the test accounts to bypass login. Guest 5 includes Admin Center access:
            </Text>

            <View style={styles.guestList}>
              {[
                { index: 1, name: "Guest 1 (Abebe)" },
                { index: 2, name: "Guest 2 (Sara)" },
                { index: 3, name: "Guest 3 (Dawit)" },
                { index: 4, name: "Guest 4 (Tigist)" },
                { index: 5, name: "Guest 5 (Admin)" },
              ].map((g) => {
                const isLoadingThis = guestLoading === g.index;
                return (
                  <TouchableOpacity
                    key={g.index}
                    disabled={guestLoading !== null}
                    onPress={() => handleGuestLogin(g.index)}
                    style={[styles.guestItem, guestLoading !== null && styles.guestItemDisabled]}
                    activeOpacity={0.85}
                  >
                    <View style={styles.guestItemLeft}>
                      <View style={styles.guestAvatar}>
                        <Ionicons name="person" size={20} color="#facc15" />
                      </View>
                      <View>
                        <Text style={styles.guestItemName}>{g.name}</Text>
                        <Text style={styles.guestItemStatus}>Ready to Play</Text>
                      </View>
                    </View>
                    {isLoadingThis ? (
                      <ActivityIndicator size="small" color="#facc15" />
                    ) : (
                      <View style={styles.guestItemEnter}>
                        <Text style={styles.guestItemEnterText}>Enter →</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setGuestModalVisible(false)}
              size="md"
              fullWidth
              style={styles.guestCancelBtn}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: "100%", height: "100%", backgroundColor: "#04040a" },
  safe: { flex: 1, backgroundColor: "transparent" },

  desktopContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    maxWidth: 920, width: '92%', alignSelf: 'center', gap: 48,
  },
  desktopBannerCard: {
    width: 380, height: 540, borderRadius: 28, overflow: 'hidden',
    position: 'relative', backgroundColor: '#0c0c16',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  desktopBannerFooter: { position: 'absolute', bottom: 24, left: 24, right: 24 },
  desktopFormWrap: { flex: 1, maxWidth: 420, justifyContent: 'center' },

  mobileScrollContent: { flexGrow: 1, minHeight: '100%', backgroundColor: '#04040a' },
  mobileBannerWrap: { width: '100%', position: 'relative', backgroundColor: '#04040a', overflow: 'hidden' },
  mobileBody: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, width: '100%', maxWidth: 440, alignSelf: 'center' },
  mobileHeaderWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 8 },
  mobileTitle: { color: '#ffffff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  mobileSub: { color: colors.textSoft, fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  mobileBottomSection: { width: '100%', marginTop: 18 },
  mobileActionsWrap: { width: '100%', marginBottom: 16 },

  bannerImg: { width: '100%', height: '100%' },

  cardTitle: { color: '#ffffff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  cardSub: { color: colors.textSoft, fontSize: 14, marginTop: 8, lineHeight: 20 },

  loadingTipText: { color: colors.dangerSoft, fontSize: 12, textAlign: 'center', marginTop: 2, fontWeight: '600' },

  phoneInputGrid: { flexDirection: 'row', gap: 10 },
  countryPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#13131c', borderRadius: radius.xl, paddingHorizontal: space.lg,
    height: 54, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  countryCode: { color: '#fff', fontSize: 15, fontWeight: '800' },
  phoneInputWrap: {
    flex: 1, backgroundColor: '#13131c', borderRadius: radius.xl, paddingHorizontal: 20,
    height: 54, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' } as any) : {}),
  },
  mainInput: {
    flex: 1, color: '#fff', fontSize: 16, fontWeight: '600',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' } as any) : {}),
  },

  otpInputGridWrapper: { alignItems: 'center', width: '100%' },
  otpInputGrid: { flexDirection: 'row', justifyContent: 'center', gap: 14, maxWidth: 320, width: '100%' },
  otpInput: {
    flex: 1, height: 64, maxWidth: 60, backgroundColor: '#13131c', borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    textAlign: 'center', color: '#fff', fontSize: 26, fontWeight: '900',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' } as any) : {}),
  },
  otpInputActive: {
    borderColor: colors.dangerSoft, backgroundColor: 'rgba(255, 59, 92, 0.08)',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' } as any) : {}),
  },

  cardFooter: { marginTop: 32, alignItems: 'center' },
  footerInfo: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footerLink: { color: colors.dangerSoft, fontWeight: '700' },

  /* ── Choice buttons (login mode selector) ── */
  choiceButton: { width: '100%' },
  phoneButton: { width: '100%' },
  verifyButton: { width: '100%' },

  /* ── Test Guest Modal ── */
  guestOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }
      : {}),
  },
  guestBackdrop: StyleSheet.absoluteFillObject,
  guestCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#0d1326",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 28,
  },
  guestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  guestHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.3)",
  },
  guestHeaderTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 2,
  },
  guestHeaderSub: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  guestCloseBtn: {
    padding: 6,
  },
  guestHint: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  guestList: {
    gap: 10,
    marginBottom: 24,
  },
  guestItem: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  guestItemDisabled: {
    opacity: 0.5,
  },
  guestItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  guestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.2)",
  },
  guestItemName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  guestItemStatus: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "800",
  },
  guestItemEnter: {
    backgroundColor: "rgba(250, 204, 21, 0.12)",
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.3)",
  },
  guestItemEnterText: {
    color: "#facc15",
    fontSize: 12,
    fontWeight: "900",
  },
  guestCancelBtn: {
    width: '100%',
  },
  topRightControls: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topRightBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(17, 17, 21, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', cursor: 'pointer' } as any : {}),
  },
  topRightBtnActive: {
    borderColor: 'rgba(0, 218, 243, 0.5)',
    backgroundColor: 'rgba(0, 218, 243, 0.15)',
  },
});