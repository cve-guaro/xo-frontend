# PROJECT_CONTEXT — XO-ET Platform Master Handbook

## 1. Project Overview
XO-ET is a **real-money Tic-Tac-Toe (XO) betting platform** built for the Ethiopian market. Two players wager Ethiopian Birr (ETB) on a head-to-head XO match. The winner takes the combined pot minus a house cut. The platform handles user wallets, deposits via Chapa, withdrawals to mobile money (Telebirr, CBE Birr, M-Pesa), and provides a full Admin dashboard for platform operators.

**Live URLs:**
- Frontend (Vercel): Deployed as an Expo Web app
- Backend (Railway): `https://xogpt-production.up.railway.app`

---

## 2. Tech Stack & Infrastructure
| Layer | Technology | Deployment |
|-------|-----------|------------|
| **Frontend** | Expo (React Native for Web) + TypeScript | Vercel |
| **Backend** | Node.js + Express + Socket.IO | Railway |
| **Database** | PostgreSQL (Supabase + PgBouncer) | Supabase |
| **Cache/Queue** | Upstash Redis (ioredis) | Upstash |
| **Payments** | Chapa API (deposits + webhook verification) | Chapa |
| **Charting** | PrimeReact Charts (admin dashboard only) | NPM |

---

## 3. User Experience — Complete Flow

### 3.1 First-Time User Journey
1. **Registration**: User signs up with their Ethiopian phone number. The system sends an OTP for verification.
2. **Profile Setup**: After login, the user lands on the Profile page and is prompted to enter a **Username** and **Display Name**. A banner at the top says "Complete your Profile" until these are filled.
<!-- OUTDATED (Welcome Bonus via Modal Timing): 
3. **Welcome Bonus**: If the admin has activated Welcome Bonuses (via the Settings page), a modal automatically pops up within 2.5 seconds of landing for brand-new users (within 24 hours of registration). The bonus amount (default: **10 ETB**) is credited to the user's `bonus_balance`. This modal only appears once per session (controlled by `sessionStorage` on web).
-->
**CURRENT UPDATE (Post-Login Hook)**: 
3. **Welcome Bonus & Referrals**: All new-user giveaways and referral tracking credits (e.g. 10 ETB welcome bonus) are now processed silently via a fire-and-forget `setImmediate` background task *after* the user's OTP is successfully verified. This ensures the core login transaction remains fast and cannot be rolled back by promo errors.
4. **First Game**: The user can immediately play their first match using the 10 ETB bonus. They select Room 1 → 10 ETB stake.
5. **Withdrawal Gate**: Users **must play at least 1 game** before they can withdraw any funds. The Withdraw page enforces this with an inline notice: "You need to play at least one game to enable withdraw."

### 3.2 Platform Differences: Mobile Web vs Desktop Web
The app is a single Expo (React Native Web) codebase that adapts its layout based on viewport width.

#### Mobile Web (< 768px)
- **Bottom Tab Navigation**: 4 tabs — Home (Gameplay Hub), Transactions, Profile/Account, Deposit
- **Full-screen pages**: Each page takes the entire screen with a back button in the header
- **Room Selection**: Opens as a sliding bottom sheet (80ms open, 60ms close animations)
- **Deposit/Withdraw**: Full-screen flow with a back chevron to return to gameplay
- **Android Back Button**: Triggers a custom exit confirmation modal

#### Desktop Web (≥ 1024px)
- **Left Sidebar Navigation**: Persistent sidebar with 7 items — Gameplay (home), Transactions, Wallet, Profile, Game History. Includes sound toggle, language switch, and deposit/withdraw buttons at the top.
- **Right Sidebar**: Shows on non-gameplay/non-admin pages. Displays recent transaction history.
- **Top Header Bar**: Shows user avatar, balance (ETB), sound toggle button, language toggle (EN/AM), and deposit/withdraw quick-action pills.
- **Deposit/Withdraw Modals**: On desktop, these open as centered slide-up modals (`WebDepositModal`, `WebWithdrawModal`) instead of navigating to separate pages. Clicking "Proceed" opens the Chapa checkout in a **new browser tab** (`window.open`).
- **Room Selection**: Same bottom sheet component but rendered within the central content area.

#### Tablet Web (768px–1023px)
- Hybrid layout: Collapsed icon-only sidebar + full content area.

### 3.3 Sound & Haptics System
- **Background Music**: Managed by `BackgroundMusicProvider` context. Plays a looping background track. Toggle via the sound button (speaker icon) in the header/sidebar. State persists via `AsyncStorage` key `xoet_bg_music_enabled`.
- **Click Sound**: Every interactive button triggers a `click.wav` sound effect via `expo-av`. The sound only plays if background music is enabled (`bgMusicPlaying === true`).
- **Haptic Feedback**: All buttons trigger haptic feedback via `expo-haptics` — `tap()` for primary actions, `selection("soft")` for navigation, `warning()` for errors, `heavy()` for CTA buttons. Gracefully falls back on web where haptics are unavailable.
- **Audio Unlock (Web)**: On first user click/touchstart, the system calls `unlockAudio()` to bypass browser autoplay restrictions.

### 3.4 Language System
- **Bilingual**: Full English and Amharic (ኣማርኛ) support.
- **Toggle**: Single button in header/sidebar cycles between `en` and `am`.
- **Translation Function**: `t(key)` from `useAuth()` context returns the localized string. Used across all pages including admin.

---

## 4. Game System — Rooms, Rules & Matchmaking

### 4.1 Room Configuration (Backend: `ROOMS_CONFIG` in `game.js`)

| Room | Name | Valid Bet Amounts (ETB) | House Cut | Turn Timer |
|------|------|------------------------|-----------|------------|
| **Room 1** | Beginner | 10, 25, 50, 99 | 20% | 30 sec |
| **Room 2** | Intermediate | 100, 250, 500, 999 | 15% | 30 sec |
| **Room 3** | Advanced | 1000, 2500, 5000, 7500, 10000+ | 10% | 30 sec |

### 4.2 Prize Calculation
```
totalPot = betAmount × 2
prize = floor(totalPot × (1 - houseCutPercent / 100))
```
Example: Two players bet 100 ETB each → Total Pot = 200 ETB → House Cut 15% = 30 ETB → Winner gets **170 ETB**.

### 4.3 Matchmaking Flow
1. User selects Room → selects Bet Amount → clicks "Play"
2. Frontend emits `find_match` via Socket.IO with `{ token, betAmount }`
3. **Backend validation chain** (in order):
   - JWT token verification
   - **Strict payload sanitization**: `betAmount` is cast to `Number`, checked via `Number.isFinite()`, and must be `> 0`. Invalid payloads (NaN, objects, strings, arrays, negative numbers) are immediately rejected.
   - Room determination via `determineRoomByBetAmount()`
   - Mobile app lockout check (if `mobile_app_lockout` global setting is true)
   - Active game check (`in_game:{userId}` Redis key) — if found, reconnects to existing match instead
   - Room 1 stake-lock: After 25 wins at a specific bet amount in Room 1, that stake is locked
   - **Balance check**: `available_balance + bonus_balance >= betAmount` from PostgreSQL
4. User enters Redis matchmaking queue (`queue:{betAmountCents}`)
5. When two players are in the same queue → `match_found` event fires
6. Both navigate to `/game/room` with match parameters
7. **Queue timeout**: 2 minutes. If no opponent found, user is removed from queue.

### 4.4 Gameplay (Room Page)
- **Board**: Standard 3×3 Tic-Tac-Toe grid
- **Turn Timer**: 30 seconds per move (all rooms, all platforms). Timer resets each turn.
- **Forfeit on Timeout**: If a player doesn't make a move within the timer, they automatically forfeit.
- **Disconnect Grace Period**: If a player disconnects mid-game, the server waits **10 seconds** for reconnection before declaring a forfeit.
- **Rematch System**: After a game ends, both players can request a rematch via `rematch_request`/`rematch_response` socket events. Rematch offers expire in 30 seconds.

### 4.5 Financial Settlement
<!-- OUTDATED (Simple Settlement):
- Bets are deducted from the player's wallet at match start (inside a PostgreSQL transaction with `FOR UPDATE` row-level locks)
- On game end, the winner's wallet is credited via `creditPrize()` function
- The house cut remains in the platform's earnings (tracked in `wallet_transactions`)
-->
**CURRENT UPDATE (Strict Bonus & Profit Separation)**:
- Bets are deducted at match start inside a `FOR UPDATE` transaction. Critically, the system calculates and logs *exactly how much `bonus_balance` each player wagered* directly into the `games` table columns (`bonus_used_x`, `bonus_used_o`).
- On game end, when distributing winnings (`finishAndPayout`), the platform reads the `bonus_used` by the winner.
- The original bonus wager is explicitly refunded back into their `bonus_balance`.
- Only the pure mathematical profit (`total prize - bonus_used`) is injected into their `withdrawable_balance`. This ensures users cannot convert admin-issued bonuses directly into withdrawable cash by simply playing and winning a single game.
- The frontend UI `ResultOverlay` dynamically renders the full actual payout (`amount * 1.6`) directly on the victory screen for clarity.
---

## 5. Wallet & Financial System

### 5.1 Balance Types
| Balance | Description | Can Withdraw? |
|---------|------------|---------------|
| `available_balance` | All funds (deposits + winnings) | Only the `withdrawable_balance` portion |
| `withdrawable_balance` | Only real deposits + game winnings | ✅ Yes |
| `bonus_balance` | Admin-injected bonuses (welcome bonus, promotions) | ✅ Yes (after playing at least 1 game) |

### 5.2 Deposit Flow
1. User enters amount (minimum: **10 ETB**, no maximum shown)
2. Preset quick-buttons: +50, +100, +200, +500
3. Payment method: **Chapa** (auto-selected, only provider)
4. On submit → Backend creates Chapa checkout session → returns `checkout_url`
5. **Mobile**: Opens in-app WebView modal. On success URL pattern match, triggers verify + refresh
6. **Desktop**: Opens in new browser tab via `/payments/chapa-bounce?url=...` redirect
7. **Webhook**: Chapa sends POST to `/payments/webhook` with HMAC signature. Backend verifies raw buffer signature with `crypto.createHmac('sha256', secret)`. On valid → credits wallet via idempotent transaction (uses `idempotency_key` to prevent double-credit).

### 5.3 Withdrawal Flow
1. User enters amount (minimum: **10 ETB**, maximum: **100,000 ETB**)
2. Preset quick-buttons: +10, +50, +100, +200, +500
3. **Payout Provider Selection**: Telebirr, CBE Birr, or M-Pesa (cards with gradient branding)
4. **Phone/Account Number**: Pre-filled with user's registered phone number
5. **Validation Checks**:
   - Must have played at least 1 game (`total_games > 0`)
   - Amount must be within limits
   - Amount must not exceed `withdrawable_balance + bonus_balance`
   - Account number must be at least 7 characters
6. On submit → Backend processes withdrawal request and debits wallet

### 5.4 Transaction History Page
- Accessible via "Transactions" tab (mobile) or sidebar (desktop)
- Shows **Total Deposits** and **Total Withdrawals** as summary cards at top
- **Filter tabs**: All, Deposits, Withdrawals
- Each transaction card shows: Type (Deposit/Withdrawal/Prize), Amount, Method, Status (Success/Pending/Failed), Reference ID, Date
- Refresh button for manual pull-to-refresh
- Fetches from `GET /account/transactions`

**[NEW UPDATE] 5.5 Referral System**
- **Link Generation**: Users are assigned a referral link `?ref=first_8_chars_of_uuid`.
- **Pipeline Preservation**: When a new user clicks the link, Next.js Expo Router detects the `ref` query parameter and securely hands it over to the `/login` route.
- **Credit Processing**: The frontend feeds the `ref` attribute to the OTP verification POST payload. The backend securely searches for the referrer, prevents self-referral, tracks the event in the `referrals` junction table, and issues a standard `bonusAmount` (configurable in settings, default 2 ETB) to the referrer's `available_balance` and `bonus_balance`.

---

## 6. User Profile Page

### 6.1 Information Displayed
- **Avatar**: Circle avatar with gradient ring. Camera icon (disabled — no upload yet)
- **Display Name** and **Username**: Editable text fields
- **Phone Number**: Read-only, displayed with `+` prefix
- **Rank Badge**: Computed from win rate and total wins:
  - **Silver**: Default rank (< 50% win rate AND < 100 wins)
  - **Gold**: ≥ 50% win rate OR ≥ 100 wins
  - **Platinum**: ≥ 70% win rate OR ≥ 200 wins
- **Stats Strip**: Games Played, Total Wins, Win Rate (%)
- **Save Changes Button**: Sends `PATCH /account/profile` with `{ username, display_name, avatar }`

### 6.2 Quick Actions (Mobile Only)
- **Admin Dashboard**: Only visible if user role is `admin` or `superadmin`. Navigates to `/admin`.
- **Game History**: Navigates to `/games` to view past match results
- **Security**: Placeholder — shows "Coming soon" alert

### 6.3 Desktop Profile Specifics
- Two-column layout: Account Info form on left, Preferences panel on right
- Preferences panel has: Game History button, Admin Dashboard button (if admin), Logout button

---

## 7. Admin Dashboard — Complete Page-by-Page Documentation

The Admin Dashboard is accessible only to users with `role = 'admin'` or `role = 'superadmin'`. It has its own dedicated layout with a sidebar (desktop) or bottom tabs + hamburger drawer (mobile).

### 7.1 Admin Layout & Navigation

**Desktop Sidebar Navigation (7 items):**
1. **Overview** (`/admin`) — Dashboard home with KPI cards and charts
2. **Users** (`/admin/users`) — Player management matrix
3. **Transactions** (`/admin/ledger`) — Full financial ledger
4. **Game Logs** (`/admin/logs`) — Match history and game audit
5. **Audit Logs** (`/admin/audit`) — Admin action tracking
6. **Settings** (`/admin/settings`) — Platform configuration
7. **Back To Home** — Returns to gameplay hub

**Top Bar (Desktop):**
- Search bar (visual placeholder)
- Platform Balance display (ETB total profit)
- Wallet Net Position (Super Admin only — shows real Chapa balance)
- Sound toggle button
- Language toggle (EN/AM)
- User chip with avatar, username, and role label

**Mobile:**
- Bottom tabs: Overview, Users, Transactions, Game Logs
- Hamburger menu (☰) opens a left drawer with all 7 nav items + Logout button

---

### 7.2 Overview Page (`/admin/index.tsx`)
**Purpose**: Real-time performance dashboard showing the platform's financial health and activity at a glance.

**KPI Stat Cards (4 cards):**
| Card | Metric | Data Source |
|------|--------|------------|
| Total Volume | 24-hour trading volume (ETB) | `volume24h` |
| Active Matches | Currently running games | `activeGames` / `totalGames` |
| Total Users | Registered player count | `totalUsers` |
| Pending/Failed | Failed withdrawal count | `failedWithdrawals` |

**Buttons:**
- **Retry (Refresh)**: Re-fetches all dashboard data from `/admin/dashboard-data` and `/admin/metrics/recent`
- **Timeframe Selector**: 3 toggle buttons — "24 HOURS", "7 DAYS", "30 DAYS". Changes the `range` query parameter for the dashboard data API.

**Chart Section:**
- PrimeReact line chart showing "Real Wallet Position" over time
- Data comes from `graphData` array returned by the dashboard API
- Only renders on web platform (shows "Charts unsupported on mobile runtime" on native)

**Recent Activity Section (2 panels):**
- **Left Panel — Recent Transactions**: Shows last 5-10 transactions with user, amount, type (deposit/withdrawal), status badge, and time since
- **Right Panel — New Users**: Table showing username, phone, role, time since registration, and balance. Clicking a user row navigates to `/admin/users`.

---

### 7.3 Users Page (`/admin/users.tsx`)
**Purpose**: Complete user management system — search, inspect, edit, ban, delete, and create users.

**Table View (Player Matrix):**
- **Columns**: Entity ID (first 8 chars of UUID), User Identity (avatar + username + phone), Balance (ETB), Status (Active/Suspended), Last Active, Action (eye icon)
- **Pagination**: 100 users per page with Back/Next buttons and "Showing X-Y of Z" counter
- **Search**: Real-time search with 350ms debounce. Searches by username or phone number.
- **Filters**:
  - **Role Dropdown**: All Roles, User, Admin, Superadmin
  - **Status Dropdown**: All Status, Active, Banned

**Buttons & Actions:**
| Button | Function | Permission |
|--------|----------|------------|
| **New Entity** | Opens create user modal | Admin |
| **Eye Icon** (on row) | Opens User 360 detail modal | Admin |
| **Ban/Unban** (in 360 modal) | Toggles user's `banned` status via `PATCH /admin/users/:id/ban` | Admin |
| **Delete** (in 360 modal) | Permanently deletes user via `DELETE /admin/users/:id` | Admin (with confirmation) |
| **Edit Profile** (in 360 modal) | Opens edit modal | Admin |

**User 360 Detail Modal:**
- Large profile header with avatar, username, ID, and 3 balance displays (Available, Withdrawable, Bonus)
- 3 stat cards: Total Games, Wins, Losses
- **Room Prizes**: Shows per-stake win counts for Room 1 (10/25/50/99 ETB) with progress toward 25-win stake lock
- **Game History**: Scrollable list of recent matches showing Win/Loss, opponent, bet amount, precise `prize_amount` payout, and time
- **Banking Activity**: Timeline of deposits/withdrawals with status indicators and amounts. *Note: Admin balance adjustments are automatically injected here as `DEPOSIT` or `WITHDRAW_SETTLED` to ensure full transparency.*

**Create User Modal Fields:**
- Username (required), Phone Number (required), Initial Balance, Role (User/Admin toggle)

**Edit User Modal Fields:**
- Username, Phone Number, Available Balance (Super Admin only), Bonus Balance (Super Admin only), Role selector (Super Admin only)

---

### 7.4 Transaction Ledger (`/admin/ledger.tsx`)
**Purpose**: Full financial audit trail of every deposit, withdrawal, and game reward across the platform.

**Features:**
- Complete transaction list with type, amount, user, status, method, reference, and date
- Filter by transaction type and status
- Search by user or reference
- Pagination for large datasets

---

### 7.5 Game Logs (`/admin/logs.tsx`)
**Purpose**: Detailed log of every match played on the platform.

**Data Shown:**
- Match ID, Players (X and O), Bet Amount, Winner, Game Duration, Room, Timestamp
- Helps admins investigate disputes or suspicious gameplay patterns

---

### 7.6 Audit Logs (`/admin/audit.tsx`)
**Purpose**: Tracks all administrative actions for accountability.

**Logged Events:**
- User bans/unbans, role changes, balance edits, setting changes, user deletions
- Each log entry includes: Admin who performed the action, action type, target user, timestamp, and IP address

---

### 7.7 Settings Page (`/admin/settings.tsx`)
**Purpose**: Global platform configuration panel. Controls financial limits, bonuses, and system security.

**Configuration Sections:**

#### Financial Controls
| Setting | Description | Default |
|---------|------------|---------|
| Welcome Bonus Amount | ETB credited to new users | 10 ETB |
| Welcome Bonus Active | Toggle on/off | Active |
| Minimum Withdrawal | Lowest allowed withdraw amount | 50 ETB |
| Minimum Deposit | Lowest allowed deposit amount | 50 ETB |

#### System Security Switches
| Switch | Function |
|--------|----------|
| **Emergency System Lockout** | Shuts down the entire platform. No user can access any feature. |
| **Mobile App Lockout** | Blocks mobile app users while allowing web users. Used when forcing migration. |
| **Show Online Count** | Toggle whether to show active player count on the frontend |

#### Giveaway Management
- **Create Giveaway**: Form with Title, Description, Amount, Type (NEW_USER / PROMOCODE), Promo Code, Start Date, End Date
- **Active Giveaways List**: Shows all giveaways with claims count and delete button
- **View Claims**: Opens modal showing which users claimed each giveaway
- **Delete Giveaway**: Removes the giveaway (Admin level — no longer requires Super Admin)

#### Bonus Activity Log
- Shows recent bonus distributions with user, amount, and timestamp

---

### 7.8 System Control Center (SCC)
**Purpose**: A unified, high-level management interface exclusively available to **Maintenance Admins (Level 3)**. It provides deep system control beyond standard administrative functions.

**Organized into Four Specific Modules:**
1. **Security Module**: Manage IP bans, execute encryption key rotations, refresh JWT secrets, and monitor live firewall status.
2. **Feature Module**: Dynamic feature flagging to toggle platform capabilities without deployment (e.g., Enable/Disable CBE Birr, Enable/Disable specific game rooms, toggle web checkout).
3. **States Module**: Control the global platform status (Live, Maintenance Mode, or Emergency Lockout).
4. **Records Module**: Centralized, immutable access to all Audit Logs, high-value transaction history, and critical system event records.

---

## 8. Role-Based Access Control

### 8.1 Admin Role Hierarchy & Permissions
The platform utilizes a strict, multi-tiered hierarchy for administrative access:

| Role | Access Level | Lockout Status |
|------|-------------|----------------|
| `maintenance_admin` | **Level 3 (Highest)**: Possesses full system control, exceeding Super Admin capabilities. Has exclusive access to the "System Control Center" for critical infrastructure changes. | Operational |
| `superadmin` | **Level 2**: Can manage users, edit user balances, change user roles, verify withdrawals, and view platform stats. | Operational |
| `admin` | **Level 1**: Restricted visibility. Can only see basic operational pages (e.g., User Matrix or Game Logs). Cannot access the System Control Center or high-level security settings. | Locked Out |
| `user` | Standard player. Can play games, deposit, withdraw, view profile and history. | Locked Out |

### 8.2 Specific Permission Boundaries
- **System Control Center**: Exclusively restricted to `maintenance_admin`.
- **Balance Editing**: Restricted to `superadmin` and above. When a superadmin changes a balance, the system calculates the exact difference (delta) and logs the adjustment in `wallet_transactions` (for available balance) and `bonus_logs` (for bonus balance).
- **Role Changing**: Restricted to `superadmin` and above. The role selector is disabled for regular admins.
- **Promocode/Giveaway Management**: Both `admin` and `superadmin` can create and delete promocodes and giveaways.

---

## 9. Security Architecture

### 9.1 Authentication
<!-- OUTDATED (Basic JWT):
- **JWT-based**: Tokens issued on OTP verification, stored in `AsyncStorage` (mobile) and `localStorage` (web)
- **Token Verification**: Every API call includes `Authorization: Bearer <token>`, verified via `jwt.verify()` with `JWT_SECRET`
- **Socket Authentication**: `find_match` and other socket events require a valid JWT token in the payload
-->
**CURRENT UPDATE (Military-Grade Auth & Redis Sessions)**:
- **JWT & Redis Refresh Tokens**: The system generates a short-lived (15m) JWT access token and a 7-day cryptographic refresh token stored in Upstash Redis. 
- **Transparent Token Rotation**: The frontend intercepts `401 Unauthorized` responses and silently requests a fresh access token from `/auth/refresh` without user interruption.
- **Strict Blacklisting**: Logging out securely invalidates the refresh token and stores the current access token in a Redis blacklist (`jwt_bl:${token}`) with a TTL matching its expiration, ensuring stolen tokens are immediately dead.
- **OTP Rate Limiting**: OTP generation is throttled to 3 requests per 15 minutes per phone number.

### 9.2 Rate Limiting
| Route Group | Limit | Window |
|------------|-------|--------|
| Default | 100 requests | 15 minutes |
| Auth routes | 200 requests | 15 minutes |
| Payment routes | 5 requests | 1 minute |

### 9.3 Financial Security
- **Webhook HMAC Verification**: Chapa webhooks are verified by computing `crypto.createHmac('sha256', webhookSecret)` over the raw buffer body and comparing against `x-chapa-signature` header
- **Idempotency**: All deposit transactions use `idempotency_key` and `provider_ref` to prevent double-crediting
- **Database Locks**: Wallet operations use PostgreSQL `FOR UPDATE` row-level locks via PL/pgSQL functions (`fn_wallet_apply_tx`) to prevent race conditions
- **Socket Payload Sanitization**: `find_match` uses `Number.isFinite()` and positive boundary checks to reject NaN, Infinity, negative, string, array, or object payloads before they reach any game logic

### 9.4 Admin Security
- **Proxy Trust**: `app.set('trust proxy', 1)` for accurate IP tracking behind Railway load balancer
- **System Alerts Table**: Logs security events with severity and IP addresses
- **Admin Audit Logs**: All admin mutations are tracked in `admin_audit_logs` table. Every ban, role change, balance edit, and delete is permanently recorded.

### 9.5 Emergency Lockout Protocol
The platform includes a global "System Lockout" state (controlled via the System Control Center) to protect the platform during critical incidents or maintenance.
- **Backend Enforcement**: When a System Lockout is active, the backend API explicitly rejects all authentication and interaction attempts **except** for accounts tagged with `maintenance_admin` or `superadmin` roles.
- **Frontend Enforcement**: The frontend detects the lockout state and instantly redirects all `user` and `admin` roles (or unauthenticated visitors) to a dedicated "System Unavailable" or "Maintenance" landing page, preventing any interaction with the platform UI.

---

## 10. Core Database Schema

| Table | Purpose |
|-------|---------|
| `users` / `app_users` | User identity: UUID, phone, username, display_name, avatar, game stats, role, sound_muted, created_at |
| `wallets` | Monetary state: `available_balance`, `withdrawable_balance`, `bonus_balance`. Row-level `FOR UPDATE` locks. |
| `wallet_transactions` | Full ledger: deposits, wagers, prizes, withdrawals, and admin adjustments. Has `idempotency_key`, `provider_ref`, `tx_type`, `status` |
| `matches` / `games` | Game records: players, bet_amount, `prize_amount` (actual payout), winner, board state, timestamps |
| `promocodes` | Promotion campaigns: code, amount, target_type, usage_limit, expires_at |
| `giveaways` | Welcome/promotional bonus definitions with version tracking |
| `giveaway_claims` | Junction table preventing users from claiming the same giveaway twice |
| `system_alerts` | Security event log with severity and IP |
| `admin_audit_logs` | Admin action tracking |
| `global_settings` | Key-value config store (min_withdraw_amount, welcome_bonus_active, system_emergency_lockout, etc.) |

---

## 11. Environment Variables

### Backend (.env)
```env
DATABASE_URL=          # PostgreSQL connection (via PgBouncer)
DIRECT_URL=            # Direct PostgreSQL connection (for migrations)
JWT_SECRET=            # Token signing secret
CHAPA_SECRET_KEY=      # Chapa API secret
CHAPA_PUBLIC_KEY=      # Chapa public key
CHAPA_ENCRYPTION_KEY=  # Chapa webhook encryption
CHAPA_WEBHOOK_URL=     # Webhook callback URL
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REDIS_URL=             # ioredis connection string
PORT=                  # Server port (default: 2000)
FRONTEND_URL=          # Vercel frontend URL (CORS)
NEXT_PUBLIC_APP_URL=   # Public app URL
```

### Frontend (.env)
```env
EXPO_PUBLIC_API_URL=       # Backend API URL
EXPO_PUBLIC_SOCKET_URL=    # Socket.IO URL (same as API URL)
EXPO_PUBLIC_CHAPA_PUBLIC_KEY=
NODE_ENV=                  # production / development
JWT_SECRET=                # For client-side token operations
```

---

## 12. Performance & Speed Guidelines
- **Animation Targets**: All UI sliding animations (sheets, modals) must complete within **80–120ms**. No animation should exceed 150ms.
- **Sound Latency**: Click sounds fire asynchronously (`await playClick()`) — the UI does not wait for sound completion before proceeding with navigation.
- **Debounced Search**: Admin user search uses a 350ms debounce to prevent excessive API calls.
- **Memoization**: All list items, stat cards, and form components use `React.memo()` to prevent unnecessary re-renders.
- **Stable Callbacks**: All event handlers wrapped in `useCallback()` with proper dependency arrays.
- **Native Driver**: All animations use `useNativeDriver: true` on mobile and fall back to JS driver on web (`Platform.OS !== 'web'`).
- **Console Optimization**: Benign React Native Web deprecation warnings (e.g. `shadow`, `pointerEvents`) are intercepted and suppressed in the browser console (`_layout.tsx`) to keep dev tools clean.

---

## 13. Security Review: Identified Leaked Data and Sensitive Information

This document consolidates all identified instances of leaked data, exposed API endpoints, and potentially sensitive keys discovered during the security analysis of the XO ET platform. This information should be reviewed immediately to mitigate risks.

### 13.1 Exposed API Endpoints

The following API endpoints were identified as publicly accessible or discoverable through frontend analysis:

- Backend Base URL: https://xogpt-production.up.railway.app
- Health Check: https://xogpt-production.up.railway.app/health
- OTP Request: https://xogpt-production.up.railway.app/auth/request-otp
- OTP Verify: https://xogpt-production.up.railway.app/auth/verify-otp
- Account Wallet (Authenticated): https://xogpt-production.up.railway.app/account/wallet (Requires authentication, but endpoint path is exposed)
- Account Profile (Authenticated): https://xogpt-production.up.railway.app/account/profile (Requires authentication, but endpoint path is exposed)
- Account Withdraw (Authenticated): https://xogpt-production.up.railway.app/account/withdraw (Requires authentication, but endpoint path is exposed)
- Account Deposit (Authenticated): https://xogpt-production.up.railway.app/account/deposit (Requires authentication, but endpoint path is exposed)
- Admin Endpoints (Authenticated): https://xogpt-production.up.railway.app/admin/* (e.g., /admin/users, /admin/ledger, /admin/settings - paths are exposed, require authentication)

### 13.2 Sensitive Keys and Information Exposed in Frontend

During static analysis of the frontend JavaScript bundle, the following sensitive (or potentially sensitive) information was found to be directly exposed:

- `CHAPA_PUBLIC_KEY`: This key is exposed in the frontend, which is generally acceptable for client-side payment initiation. However, it highlights the importance of ensuring the corresponding CHAPA_SECRET_KEY is *never* exposed client-side and is securely managed on the backend.
- `API_URL`: The backend API base URL (https://xogpt-production.up.railway.app) is hardcoded and exposed in the frontend bundle. While this is common, it means the backend's location is public knowledge.

### 13.3 Actionable Recommendations

1.  Review Chapa Keys: Ensure that only the CHAPA_PUBLIC_KEY is exposed in the frontend. Verify that the CHAPA_SECRET_KEY is securely stored as an environment variable on the backend and is never transmitted to the client.
2.  Monitor Exposed Endpoints: Implement strict rate limiting and monitoring on all exposed endpoints, particularly /auth/request-otp and /auth/verify-otp, to prevent abuse.
3.  Secure Internal Documentation: The PROJECT_CONTEXT.md handbook contains highly sensitive architectural details. Ensure this document and similar internal resources are strictly access-controlled and not publicly accessible.
4.  Rotate Secrets (Precautionary): If there is any suspicion that backend environment variables or database credentials have been compromised, rotate them immediately.
