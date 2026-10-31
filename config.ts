// API connection — set EXPO_PUBLIC_API_URL in .env for each environment
// Development: http://localhost:2000
// Production:  Set via Vercel environment variables (never hardcode production URLs here)
import { Platform } from 'react-native';

const LIVE_BACKEND_URL = 'https://xo-backend-production-286e.up.railway.app';

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_USE_LOCAL_BACKEND === 'true') {
    return 'http://localhost:2000';
  }
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') && !envUrl.includes('onrender.com') && !envUrl.includes('render.com')) {
    return envUrl;
  }
  return LIVE_BACKEND_URL;
};

export const API_URL = getApiUrl();
console.log('[Config] Active API_URL:', API_URL);
export const MIN_PAYOUT = Number(process.env.MIN_PAYOUT || 10);
export const MIN_DEPOSIT = Number(process.env.MIN_DEPOSIT || 10);

// Frontend URL — used for promo links and referral URLs
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://xoethiopia.com';

// Agora credentials
export const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || 'ba52d09d3e204851af7ddbe4340b38a2';