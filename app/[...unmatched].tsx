import { Redirect, useLocalSearchParams } from "expo-router";

export default function CatchAllPage() {
  const params = useLocalSearchParams();
  const searchParams = new URLSearchParams(params as Record<string, string>).toString();
  
  // Preserve all query parameters and redirect to login
  if (searchParams) {
    return <Redirect href={{ pathname: "/(auth)/login", params: params }} />;
  }
  
  return <Redirect href="/(auth)/login" />;
}