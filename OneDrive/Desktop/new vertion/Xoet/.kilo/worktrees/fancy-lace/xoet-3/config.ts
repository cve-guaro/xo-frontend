const p1 = "xogpt-produc";
const p2 = "tion.up.railway.app";
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `https://${p1}${p2}`;
// export const API_URL = 'http://localhost:2000'; // Local Testing (Port 2000)
export const MIN_PAYOUT = Number(process.env.MIN_PAYOUT || 10);
export const MIN_DEPOSIT = Number(process.env.MIN_DEPOSIT || 10);