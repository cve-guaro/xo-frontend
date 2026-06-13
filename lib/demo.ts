export const demoUser = {
  id: "user_123",
  username: "abel",
  phone: "+251 9XX XXX XXX",
  balance: 12450.75,
  avatar: "https://i.pravatar.cc/200?img=12", // demo avatar; replace with your CDN or local asset if needed
};

export type Game = {
  id: string;
  room: string | number;
  mode: "Classic" | "Blitz" | "Ranked";
  result: "WIN" | "LOSS";
  delta: number;            // ETB change
  playedAt: string;         // ISO
};

export const demoGameHistory: Game[] = [
  { id: "g1", room: 101, mode: "Classic", result: "WIN",  delta: 250,  playedAt: new Date(Date.now()- 1*3600_000).toISOString() },
  { id: "g2", room: 202, mode: "Blitz",   result: "LOSS", delta: -100, playedAt: new Date(Date.now()- 5*3600_000).toISOString() },
  { id: "g3", room: 303, mode: "Ranked",  result: "WIN",  delta: 400,  playedAt: new Date(Date.now()- 13*3600_000).toISOString() },
  { id: "g4", room: 404, mode: "Classic", result: "LOSS", delta: -50,  playedAt: new Date(Date.now()- 26*3600_000).toISOString() },
  { id: "g5", room: 505, mode: "Blitz",   result: "WIN",  delta: 120,  playedAt: new Date(Date.now()- 48*3600_000).toISOString() },
];

export function formatMoney(n: number) {
  // ETB formatting; tweak to your locale as needed
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ETB`;
}
