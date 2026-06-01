# XOET Platform — Comprehensive Technical Guide & Project Context

> Last updated: 2026-05-09
> **Production Status: READY** (Security Rating: 10/10 🌟)

This document serves as the primary technical manual for the XOET platform. It details every feature, how it operates, the underlying technical flow, and the security constraints applied. It is designed to help debug issues and onboard new developers.

---

## 1. System Architecture

The XOET platform is a real-time multiplayer Tic-Tac-Toe betting game.

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native (Expo) compiled for Web (Next.js/Webpack) and Mobile |
| **Backend** | Node.js / Express |
| **Real-time** | Socket.io with Redis Adapter (for scalable matchmaking) |
| **Database** | PostgreSQL (hosted via Supabase) |
| **Cache & State** | Upstash Redis |
| **Payments** | Chapa API (Ethiopian Payment Gateway) |
| **SMS/OTP** | GeezSMS API |

---

## 2. Authentication & Roles

Users authenticate using phone numbers and OTPs (via GeezSMS). The system uses JWT (JSON Web Tokens) for stateless authentication.

### User Roles
1. **User (`user`)**: Standard player. Can deposit, play games, withdraw, and manage their profile.
2. **Maintenance Admin (`maintenance_admin`)**: Limited admin. Can access the admin dashboard but primarily manages the platform's global settings (like maintenance mode, referral toggles) and views basic stats. Cannot edit balances.
3. **Admin (`admin`)**: Full admin. Can view all users, manage promotion links, send bulk SMS, and view financial data. Cannot edit balances manually (due to Anti-Money Laundering logic).
4. **Superadmin (`superadmin`)**: Highest tier. Has all admin privileges plus the ability to bypass 2FA and override system lockouts.

**Admin 2FA Security:**
When an admin or superadmin logs into the frontend, they must pass a secondary OTP check via SMS before accessing the `/admin` routes. This session lasts 2 hours.

---

## 3. Financial System & AML Logic (Ground Truth)

The financial integrity of the platform is strictly maintained using PostgreSQL transactions and a "1x Rollover" Anti-Money Laundering (AML) rule.

### Balance Types
- `available_balance`: The total amount of money the user can see and bet with.
- `withdrawable_balance`: The amount of money the user can actually withdraw to their bank.
- `bonus_balance`: Promotional money that cannot be withdrawn.

### The 1x Rollover Rule (AML)
To prevent users from depositing money and immediately withdrawing it (money laundering), deposits are **NOT** immediately withdrawable. 
- When a user deposits 100 ETB, their `available_balance` increases by 100, but their `withdrawable_balance` does not.
- The user must wager this money in the game.
- When they **win**, the prize money is deemed "clean" and is added to **both** `available_balance` and `withdrawable_balance`.
- This ensures that 100% of withdrawn funds are legitimately won through gameplay.

### Financial Transactions (`wallet_transactions` table)
Every change in balance is recorded immutably.
- `DEPOSIT`: Increases available balance.
- `MATCH_STAKE`: Deducts from available balance.
- `PRIZE`: Increases available AND withdrawable balance.
- `WITHDRAW_REQUEST`: Deducts from available AND withdrawable balance.
- `BONUS`: Increases available balance only.

---

## 4. Game Engine & Matchmaking (`src/socket/game.js`)

The real-time game engine uses Socket.io.

### Matchmaking Flow
1. User clicks "Play" in a specific room (e.g., Room 1: 10 ETB).
2. The frontend emits `join_matchmaking` with the `betAmount`.
3. The backend checks if the user has enough `available_balance`.
4. If valid, the user is added to a Redis queue for that specific bet amount.
5. A background cron job (`processMatchmaking`) pairs two users in the same queue.
6. A game record is created in PostgreSQL (`status: 'playing'`), and both users' balances are deducted (`MATCH_STAKE`).
7. Users receive `match_found` and the game begins.

### Gameplay Logic
- **Turns**: Server validates every move. If it's not the user's turn, or the cell is taken, the move is rejected.
- **Winning**: The server checks for a Tic-Tac-Toe line. If found, it declares a winner, updates the DB to `completed`, and credits the `PRIZE` to the winner. The prize is (Bet * 2) minus the platform fee (10%-20% depending on the room).
- **Draw**: If the board is full with no winner, the game is `draw`. Both users receive a `REFUND` of their original bet to their `available_balance` (but not withdrawable).
- **Disconnection/Timeout**: If a user leaves or closes the app, the server detects the disconnect. After a 15-second grace period, if they don't reconnect, the opponent is awarded the win via forfeit.

---

## 5. Administrative Tools (`/admin` routes)

The Admin Dashboard is the control center for the platform.

### User Management (`/admin/users`)
- **Access**: `admin`, `superadmin`.
- **Function**: Search for users by phone number or username. View their balances, win rates, and total games played. View their financial transaction history.
- **Restrictions**: Admins cannot manually edit balances. This was removed to enforce strict AML compliance and financial integrity.

### Promotion Links (`/admin/promotion-links`)
- **Access**: `admin`, `superadmin`.
- **Function**: Create shareable links (e.g., `xoethiopia.com/?promo=SUMMER26`) that grant new users a starting bonus.
- **Tracking**: The system tracks how many people registered using the link and how much bonus was paid out. Admins can view exactly which phone numbers claimed the link.

### Promotion Popup Config
- **Access**: `admin`, `superadmin`.
- **Function**: Configures an image popup that appears when a user logs in. Stored in `global_settings` table as JSON. Requires an image URL, duration, and active toggle. To optimize performance and user experience, the popup is fetched and launched strictly on initial app mount, page refreshes, and direct logins, rather than during routine tab-to-tab navigation focus shifts.

### Targeted Bulk SMS (`/admin/bulk-sms`)
- **Access**: `admin`, `superadmin`.
- **Function**: Send promotional text messages to users via the GeezSMS API.
- **Filters**: Admins can target users based on Role, Balance Range, or a Specific Phone Number.
- **History**: All sent campaigns are logged in the `bulk_sms_history` table, showing the filters used, target count, success count, and the admin who sent it.

### System Settings (`/admin/settings`)
- **Access**: `maintenance_admin`, `admin`, `superadmin`.
- **Function**: Toggles global feature flags stored in `global_settings`.
  - `feature_deposits`: Enable/disable user deposits.
  - `feature_withdrawals`: Enable/disable user withdrawals.
  - `referral_enabled`: Toggle the visibility of the "Share & Earn" system.
  - `system_emergency_lockout`: A "kill switch" that instantly kicks all users out of the platform and displays a maintenance screen. Only `superadmin` and explicitly whitelisted IPs can bypass this.

### Weekly Leaderboard Controller (`/admin/leaderboard`)
- **Access**: `admin`, `superadmin`.
- **Function**: Manages the weekly leaderboard prize payouts and historical snapshots.
  - **Live Countdown Timer**: Displays a real-time countdown timer tracking the exact remaining time until the next Sunday midnight weekly reset.
  - **Automated Payouts (`autoApprove`)**: When enabled, a Sunday midnight cron job automatically distributes prize pools into the top 3 users' `available_balance`, logs the action in `bonus_logs`, and sends a celebratory SMS. To prevent administrative errors, the admin panel automatically hides manual override buttons (snapshot capture, individual approve, bulk approve) and shows a green "Automatic Distribution Active" status badge.
  - **Manual Payouts & Console Redesign**: When disabled, the cron captures the top 3 snapshot and leaves them "PENDING". The admin panel displays all manual controls: the snapshot creator button, individual approvals, and the **"Approve All Pending" (Checkmate)** button to process the entire week at once. Includes a highly redesigned, professional manual console featuring click-to-adjust suggestions (`+50`, `+100`, `Reset`) right below prize inputs, and clickable template variable tags (`{username}`, `{rank}`, `{prize}`) that automatically append into the SMS template textarea for extreme ease of use. Tapping **"Send & Snapshot"** triggers the backend `/leaderboard/send-giveaway` endpoint to dynamically credit winner wallets, create approved snapshot rows, log bonus updates, dispatch GeezSMS alerts, and postcelebration card notifications in real-time. The action button uses a dark label text on its bright cyan background for premium readability.
  - **Grouped Past Snapshots**: Past leaderboard winners are grouped and sectioned by their respective weekly start and end date ranges, sorted ascendingly by rank.
  - **Leaderboard Payout Notifications**: Both automated payouts and manual admin approvals emit consistent `leaderboard_award` notifications that encapsulate performance metadata (wins count, rank, prize, and week start/end dates) to render a premium celebratory victory card with gold styling in the client.

### Live Winner Ticker Priority Logic
- **Endpoint**: `GET /leaderboard/ticker`
- **Logic**: Implements configurable, priority-merged winner display:
  - If **Show Real** is ON and **Show Fake** is OFF: Returns only real winner data sorted by `g.finished_at DESC` so the absolute most recently completed games are shown first in real-time. If empty, the frontend hides the ticker container completely.
  - If **Show Real** is OFF and **Show Fake** is ON: Returns only fake entries configured by admins (randomly shuffled).
  - If **Both** are ON: Combines both, prioritizing real winners first and then appending fake entries (up to 30 total).

---

## 6. Payment Processing (Chapa)

### Deposits
1. User requests to deposit X amount.
2. Backend generates a unique `tx_ref` and creates a `PENDING` record in `transactions` table.
3. Backend calls Chapa API to generate a checkout URL.
4. User completes payment on Chapa.
5. Chapa fires a webhook to `/payments/webhook`.
6. Backend verifies the webhook HMAC signature, marks the transaction as `SUCCESS`, and credits the user's `available_balance`.

### Withdrawals
1. User requests to withdraw X amount to a specific bank account.
2. Backend verifies the user has enough `withdrawable_balance`.
3. Backend deducts the amount from both `available` and `withdrawable` balances immediately to prevent double-spending.
4. An admin physically reviews the withdrawal in the Chapa dashboard or it triggers an automated payout.
5. If successful, user receives an SMS notification via GeezSMS with a localized Amharic message and Telegram link.

---

## 7. Security Mechanisms

- **Anomaly Monitor**: Monitors for suspicious activity (e.g., rapid login failures, malformed JSON payloads). Auto-bans IP addresses that trigger too many anomalies.
- **Rate Limiting**: Strict limits on API endpoints. 5 payment requests/min, 60 profile fetches/min.
- **Concurrency Protection**: All financial updates (`fn_wallet_apply_tx`) use PostgreSQL `SERIALIZABLE` isolation to ensure no race conditions occur if a user clicks rapidly.
- **Socket Spoofing**: Users cannot send "fake" moves. The server holds the absolute state of the board and verifies every `make_move` event against the stored turn and board state.

---

## 8. Development & Deployment

- **Frontend Environment**: Uses `.env` for `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_APP_URL`. Deployed via Vercel or similar static hosting.
- **Backend Environment**: Uses `.env` for `DATABASE_URL`, `REDIS_URL`, `CHAPA_SECRET_KEY`, `JWT_SECRET`, etc. Requires Node.js and PM2 for process management in production.
- **Running Locally**:
  ```bash
  # Start Backend
  cd xoet_backend
  npm install
  npm run dev

  # Start Frontend
  cd xoet-3
  npm install
  npx expo start --web
  ```

---

## 9. Weekly Leaderboard & Prize Distribution

The platform features a weekly competitive leaderboard with prize distribution.

### Architecture
- **User-facing routes** (`/leaderboard/*`): Weekly standings, podium top-3, live ticker feed, prize claiming
- **Admin routes** (`/admin/leaderboard/*`): Current standings with phone numbers, snapshots, giveaway distribution, fake ticker management
- **Cron job** (`weeklyLeaderboard.js`): Fires at midnight every Sunday to auto-distribute prizes if `leaderboard_auto_approve` is enabled

### Settlement Modes
1. **Automatic Protocol**: At week end (Sunday midnight UTC), the cron job automatically snapshots top-3 winners, credits `available_balance` (via `bonus_balance`), sends SMS via GeezSMS, and creates in-app notifications.
2. **Manual Console**: Admin manually triggers distribution via "Send & Snapshot" button. Supports custom prize amounts per winner, SMS template customization with `{username}`, `{rank}`, `{prize}` variables, and dry-run previews before committing.

### Key Endpoints
| Route | Method | Purpose |
|-------|--------|---------|
| `/leaderboard/weekly` | GET | Top 50 + current user rank + previous week win |
| `/leaderboard/podium` | GET | Top 3 for home widget |
| `/leaderboard/ticker` | GET | Live winner feed (real + fake entries, priority rules) |
| `/leaderboard/claim` | POST | User marks a prize notification as claimed |
| `/admin/leaderboard/giveaway-status` | GET | Top-3 winners with phone numbers for manual console |
| `/admin/leaderboard/send-giveaway` | POST | Full prize distribution (snapshot + wallet + SMS + notifications) |

### Ticker Priority Rules
- **Real ON, Fake OFF**: Only real winners shown (from `games` table)
- **Real OFF, Fake ON**: Only fake entries shown (from `fake_ticker_entries` table)
- **Both ON**: Real winners first, then fake entries (up to 30 total)
- **Both OFF**: Ticker hidden on home page

### Prize Flow (available_balance only)
All leaderboard prizes are credited to `available_balance` and `bonus_balance` (NOT `withdrawable_balance`), ensuring prizes follow the standard 1x rollover AML rule.
