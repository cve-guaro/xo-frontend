// API connection — set EXPO_PUBLIC_API_URL in .env for each environment
// Development: http://localhost:2000
// Production:  Set via Vercel environment variables (never hardcode production URLs here)
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.')) {
      return 'https://xogpt-production.up.railway.app';
    }
  }
  return 'http://localhost:2000';
};

export const API_URL = getApiUrl();
export const MIN_PAYOUT = Number(process.env.MIN_PAYOUT || 10);
export const MIN_DEPOSIT = Number(process.env.MIN_DEPOSIT || 10);

// Frontend URL — used for promo links and referral URLs
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://xoethiopia.com';