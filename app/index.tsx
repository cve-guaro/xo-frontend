import OfflineNotice from "../components/OfflineNotice";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/authContext";

export default function Index() {
  const { user, booting, offline, retry } = useAuth();
  const { ref, promo } = useLocalSearchParams<{ref?: string, promo?: string}>();
  const [retrying, setRetrying] = useState(false);

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
    if (ref || promo) return <Redirect href={{ pathname: "/(auth)/login", params: { ref, promo } }} />;
    return <Redirect href="/(auth)/login" />;
  }
  
  if (user.role === 'admin') {
    return <Redirect href="/(authed)/admin" />;
  }
  return <Redirect href="/(authed)/home/gameplay" />;
}
