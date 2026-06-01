// API connection — set EXPO_PUBLIC_API_URL in .env for each environment
// Development: http://localhost:2000
// Production:  Set via Vercel environment variables (never hardcode production URLs here)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:2000';
export const MIN_PAYOUT = Number(process.env.MIN_PAYOUT || 10);
export const MIN_DEPOSIT = Number(process.env.MIN_DEPOSIT || 10);

// Frontend URL — used for promo links and referral URLs
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://xoethiopia.com';