import { Redirect, useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Platform } from "react-native";
import { useAuth } from "../context/authContext";

import LoginScreen from "./(auth)/login";
import OfflineNotice from "../components/OfflineNotice";

export default function Index() {
  const { user, booting, offline, retry, loginWithToken } = useAuth();
  const { ref, promo, token: urlToken, refresh: urlRefresh } = useLocalSearchParams<{ref?: string, promo?: string, token?: string, refresh?: string}>();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (urlToken && !user && loginWithToken) {
      void loginWithToken(urlToken, urlRefresh);
    }
  }, [urlToken, urlRefresh, user, loginWithToken]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  useEffect(()=>{
    console.log("offline status: ",offline)
  },[offline])

  const renderContent = () => {
    if (booting && !user) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#060614" }}>
          <ActivityIndicator color="#00daf3" />
        </View>
      );
    }

    if (offline) {
       return <OfflineNotice
        onRetry={handleRetry}
        isRetrying={retrying}
        message="You're offline"
        details="We couldn't reach the server. Check your connection and try again."
        lastChecked={new Date()}
        tips={["Reconnect to Wi-Fi", "Disable airplane mode", "Try again in a moment"]}
      />
    }

    if (!user) {
      return <LoginScreen />;
    }
    
    if (user.role === 'admin') {
      return <Redirect href="/(authed)/admin" />;
    }
    return <Redirect href="/(authed)/home/gameplay" />;
  };

  return (
    <>
      {Platform.OS === 'web' && (
        <Head>
          <title>XO Ethiopia - Play Tic-Tac-Toe for Real Money</title>
          <meta name="title" content="XO Ethiopia - Play Tic-Tac-Toe for Real Money" />
          <meta name="description" content="Play Tic-Tac-Toe for real money on XO Ethiopia. Join tournaments, play with friends, and win cash prizes daily! Easy withdrawals via Telebirr." />
        </Head>
      )}
        {renderContent()}
    </>
  );
}
