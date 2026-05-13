# AI Development Tracker

## Recent Updates (May 13 — Chapa 404 Root Cause, Mobile Lock, Diagnostics)

### 19. Fixed Chapa 404 Retry — Root Cause Bug (CRITICAL)
- **Date:** 2026-05-13
- **Issue:** Despite deploying the 3-retry logic in `verifyPendingPayouts.js`, the 404 errors were STILL flooding logs and pending withdrawals were never cleaned up.
- **Root Cause:** `getChapaTransferStatus()` in `Chapa.js` had a `catch` block that **swallowed** the 404 error by returning `null` instead of re-throwing. The retry logic in `verifyPendingPayouts.js` was in a `catch` block, so it never fired — the cron just saw `status = undefined` and logged "still pending" forever.
- **Fix:** Changed `Chapa.js` line 114 from `return null` to `throw err` so the error propagates to the cron's catch block where the retry counter and auto-refund logic lives.
- **Impact:** The 5 stuck pending withdrawals (yaya134, tasa, coster, yopro x2) will auto-resolve within ~2 minutes after deploy (3 retries → auto-refund).
- **Files Changed:** `xoet_backend/src/models/Chapa.js`

### 20. Fixed Mobile App Lock Bypass (Strict Enforcement)
- **Date:** 2026-05-13
- **Issue:** The old Expo app was still bypassing the lock because the frontend sends `x-platform: mobile` but the backend checked for `mobile-app`.
- **Fix:** Updated `Detection.js` to correctly block `platform === 'mobile'`.
- **Files Changed:** `xoet_backend/src/middleware/Detection.js`

### 21. Wiped Users Database Restoration (34 Users Restored)
- **Date:** 2026-05-13
- **Issue:** Users who won games with their signup bonus but had 0 deposits had their balance unfairly wiped to 0 by the old `recalculate_stats.js` script.
- **Result:** Ran a secure restoration script on the production database. Found 34 affected users. Calculated exact expected balance for each based on their total bets placed and total prizes won. Restored balances directly to `available_balance` and created `SYSTEM_RESTORE` ledger entries.
- **Top Restored Users:** `mkeske72` (595 ETB), `aymen` (136 ETB), `bella po` (145 ETB).

### 23. Frontend UI Updates: Room Gap Fix & Game Tracker
- **Date:** 2026-05-13
- **Fix:** Fixed the uneven vertical gaps between room commission chips in the gameplay popup by standardizing padding and heights.
- **Feature:** Added an `x/20` progress tracking pill to the top-right corner of Room 1 chips (e.g., `14/20`) to let users know how close they are to hitting the 20-game limit.
- **Files Changed:** `xoet-3/app/(authed)/home/gameplay.tsx`

### 24. Progressive Web App (PWA) Implementation
- **Date:** 2026-05-13
- **Feature:** Implemented full PWA capabilities so users can install the website to their home screen like a native app.
- **Details:** Created `manifest.json` for app metadata and a basic `service-worker.js` for offline catching. Added a floating `PwaInstallBanner` on the web frontend that listens for `beforeinstallprompt` to prompt users to install.
- **Files Changed:** `xoet-3/public/manifest.json`, `xoet-3/public/service-worker.js`, `xoet-3/app/_layout.tsx`, `xoet-3/components/PwaInstallBanner.tsx`

### 22. Fixed Double-Refund Race Condition (SECURITY)
- **Date:** 2026-05-13
- **Issue:** Found during security review of the Chapa fix. The cron job runs TWICE concurrently (1-minute cron schedule + 30-second setInterval in `cron.js`). With the new `throw err` fix, both workers could pick up the same PENDING transaction, both get 404 from Chapa, and both issue a refund — doubling the user's money.
- **Fix:** Added `FOR UPDATE SKIP LOCKED` to the SQL query in `verifyPendingPayouts.js`. This ensures only ONE worker can lock and process each PENDING row at a time. The other worker skips already-locked rows.
- **Files Changed:** `xoet_backend/src/cron/verifyPendingPayouts.js`

## Previous Updates (May 10-12 — SMS, Financial & Commission Fixes)

### 14. Fixed Duplicate SMS — Bulk, Deposit & Withdrawal (CRITICAL)
- **Date:** 2026-05-10
- **Issue:** Every deposit/withdrawal was sending 2-6 SMS to the same user, and bulk SMS campaigns were sending 7x duplicates per user, draining the GeezSMS balance completely.
- **Root Cause (Bulk SMS):** The SQL query `SELECT u.number FROM users LEFT JOIN wallets` had no `DISTINCT`, producing duplicate rows. Also, the "Yes, Send Now" confirm button had no loading state — clicking multiple times fired multiple complete campaigns.
- **Root Cause (Deposit/Withdrawal SMS):** Chapa retries webhooks if the server responds slowly, and the deposit verification cron also processed the same deposit concurrently. Both paths sent SMS independently with no idempotency check.
- **Fix:**
  - **Backend (`admin.js`):** Added `SELECT DISTINCT ON (u.number)` to bulk SMS query + `Set()` dedup in the sending loop.
  - **Backend (`webhook.controller.js`):** Deposit SMS now checks `alreadyCompleted` flag before sending. Withdrawal SMS now uses `RETURNING` on the UPDATE — if 0 rows changed, it skips SMS.
  - **Backend (`sms.js`):** Added a circuit breaker — after 5 consecutive SMS failures (e.g. "Insufficient amount"), all SMS is disabled for 10 minutes to prevent log flooding.
  - **Frontend (`ActionConfirmModal.tsx`):** Added `isLoading` prop to disable the confirm button during processing, preventing duplicate clicks.
  - **Frontend (`promotion-links.tsx`):** Passes `isLoading={smsSending}` to the bulk SMS confirm modal.
- **Files Changed:** `xoet_backend/src/routes/admin.js`, `xoet_backend/src/models/webhook.controller.js`, `xoet_backend/src/utils/sms.js`, `xoet-3/components/ActionConfirmModal.tsx`, `xoet-3/app/(authed)/admin/promotion-links.tsx`

### 15. Fixed CRON Ghost Game Cleanup — `games_status_check` Constraint Violation
- **Date:** 2026-05-10
- **Issue:** The cron job that cleans up stuck games was failing with `violates check constraint "games_status_check"` every 10 minutes.
- **Root Cause:** The cron was setting `status = 'abandoned'` but the production DB only allows `'completed'` as a valid status.
- **Fix:** Changed to `SET status = 'completed', winner = NULL, finished_at = NOW()` — marks stuck games as completed with no winner, properly refunding both players.
- **Files Changed:** `xoet_backend/src/cron.js`

### 16. Fixed Username Validation — Users Blocked from Using `@` and `.`
- **Date:** 2026-05-10
- **Issue:** Users were getting 400 errors when trying to set usernames like `@dave1d1d` or `user.name` because the regex rejected `@` and `.` characters.
- **Fix:** Updated regex to `/^[\p{L}\p{N}@._\- ]+$/u`. Also added safe regex to `display_name` to block injection characters like `&`.
- **Files Changed:** `xoet_backend/src/middleware/Validation.js`

### 17. Fixed Chapa Transfer 404 Log Spam — Endless Retry Loop
- **Date:** 2026-05-12
- **Issue:** The payout verification cron was retrying the same Chapa transfer verification every 30 seconds forever, even when Chapa returned 404 ("Transfer is not found"). This flooded the Railway logs with identical error messages.
- **Root Cause:** When Chapa's API returned 404 for a transfer that was never created (e.g. network failure during submission), the cron just logged the error and tried again next cycle — infinitely.
- **Fix:** Added a retry counter stored in the transaction's `meta` JSONB field. After 3 consecutive 404s, the transaction is automatically marked `FAILED`, the user's balance is refunded, and the cron stops retrying.
- **Files Changed:** `xoet_backend/src/cron/verifyPendingPayouts.js`

### 18. Standardized Commission Rate to 10% Across All Rooms
- **Date:** 2026-05-12
- **Issue:** Room 1 had 20% house cut (player wins 16 from 10 bet), Room 2 had 15% cut (player wins 170 from 100 bet), Room 3 had 10% cut. This was too aggressive for lower-stakes rooms.
- **Change:** All rooms now use a uniform 10% house cut per player (20% total from the pot):
  - Room 1: 10 ETB bet → winner gets **18 ETB** (was 16)
  - Room 2: 100 ETB bet → winner gets **180 ETB** (was 170)
  - Room 3: 1000 ETB bet → winner gets **1800 ETB** (unchanged)
- **Files Changed:** `xoet_backend/src/socket/game.js` (ROOMS_CONFIG), `xoet-3/app/(authed)/game/room.tsx` (calculateWinAmount)

## Previous Updates (Game Room & Invites Fixes)

### 1. Fixed "New Challenge" Modal Missing Info & Unresponsive Buttons
- **Issue:** The incoming friend invite popup (`IncomingInviteModal.tsx`) showed blank spaces for the username and bet amount, and clicking "Accept Game" or "Decline" did nothing.
- **Cause:** 
  1. The UI component was expecting `invite.fromUsername` and `invite.betAmount`, but the layout was passing `invite.username` and `invite.amount`.
  2. The buttons failed silently because the sender's User ID (`incomingInvite.id`) was resolving to `undefined`. This happened because the backend was reading `decoded.sub` from the JWT token, which is only present in Supabase tokens. Local development tokens store the user ID in `decoded.id`.
- **Fix:** 
  - Updated `IncomingInviteModal.tsx` to read `invite.username` and `invite.amount`.
  - Updated the backend (`game.js`) to actively fetch the sender's username from the database and include it in the `friend_invite` payload.
  - Modified the JWT decoding logic in `game.js` to support both `decoded.sub` and `decoded.id` (`const senderId = decoded.sub || decoded.id;`), ensuring compatibility for both local development and production environments.

### 2. Fixed Rematch / Friend Invite Visibility
- **Issue:** Winners were not receiving rematch requests when on the home page, and losers weren't receiving friend invites if they were still on the game results screen.
- **Cause:** 
  1. A CSS `zIndex` bug on the web platform caused the `GlobalInvitesGate` (which renders the popups) to be hidden underneath the main game view.
  2. The backend was prematurely deleting the `in_game` status from Redis the moment a game ended, causing the system to think players were fully "Online" (available) instead of still looking at the results screen.
- **Fix:** 
  - Moved `<GlobalInvitesGate />` to the bottom of the layout structure in `_layout.tsx` so it accurately overlays all content.
  - Removed `redis.del('in_game')` from the game cleanup logic in `game.js`. Added a new socket event `leave_room` that triggers when the user physically leaves the game page. The backend now accurately reports `status === 'in_game'` if the opponent is still looking at the game results screen, which correctly triggers the frontend message: `"⚠️ Player is currently in a game — they'll see your invite after"`.

### 3. State Accuracy Fixes
- **Issue:** Players viewing the result overlay (`ResultOverlay`) were technically not playing, but the frontend still considered them `isInGame` based purely on the URL path.
- **Fix:** Introduced a new global `isGameActive` state inside `SocketProvider` that becomes `true` when a match begins and `false` immediately when the match concludes (win, draw, forfeit). This accurately allows post-game popups and notifications to appear while still blocking disruptive popups during active gameplay.

### 4. Fixed Accept/Decline Buttons Still Not Working (Token Source Bug)
- **Date:** 2026-05-08
- **Issue:** Even after fix #1, both "Accept Game" and "Decline" buttons on the `IncomingInviteModal` remained completely unresponsive. The popup displayed correctly with the sender's name and bet amount, but clicking either button did nothing.
- **Cause:** In `GlobalInvitesGate` (`_layout.tsx`), the `token` was destructured from `useSocket()` — but `useSocket()` does NOT expose a `token` property! So `token` was always `undefined`. Every button handler had a guard: `if (!incomingInvite?.id || !token) return;` which silently aborted because `!undefined === true`.
- **Fix:** Changed `GlobalInvitesGate` to get `token` from `useAuth()` instead of `useSocket()`. This is the correct source — `useAuth()` holds the JWT token from login.
- **Files Changed:** `app/(authed)/_layout.tsx`

### 5. Added Decline Notification to Sender
- **Date:** 2026-05-08
- **Issue:** When the receiver declined a friend challenge, the sender got no feedback — they just saw the cooldown timer with no indication that the opponent refused.
- **Fix:** 
  - Updated the backend (`game.js` → `friend_invite_response`) to fetch the declining user's username from the DB and include it in the `friend_invite_declined` event payload as `byUsername`.
  - Updated `gameplay.tsx` to show a toast: **"YaredDM declined your challenge!"**
  - Updated `FriendMatchModal.tsx` to display: **"YaredDM doesn't want to play right now!"** in a red banner inside the modal.
- **Files Changed:** `xoet_backend/src/socket/game.js`, `app/(authed)/home/gameplay.tsx`, `components/game/FriendMatchModal.tsx`

### 6. Fixed Rematch Request Not Showing for Winner (JWT + All Socket Handlers)
- **Date:** 2026-05-08
- **Issue:** When the loser clicked "Play Again" (rematch), the winner on the home page saw nothing — no popup appeared. The loser just saw "Waiting for crossdagi to accept..." forever.
- **Cause:** The `rematch_request` and `rematch_response` handlers in `game.js` used `decoded.sub` without the `|| decoded.id` fallback, so the user ID resolved to `undefined` in local dev. Also fixed the same issue in `find_match`, `cancel_find`, and `socket connect` handlers — **every** JWT decode in `game.js` now has the fallback.
- **Fix:** Applied `decoded.sub || decoded.id` consistently across all 7 JWT decode locations in `game.js`.
- **Files Changed:** `xoet_backend/src/socket/game.js`

### 7. Fixed Draw Board Not Clearing for One Player
- **Date:** 2026-05-08
- **Issue:** When a game ended in a draw and auto-continued to round 2, one player's board cleared correctly but the other player still saw the old filled board from the last move.
- **Cause:** Race condition — the server emits `move_made` (with the 9th cell filled, completing the board) and then immediately emits `new_round` (with an empty board). For the player who made the 9th move, the `move_made` event sometimes arrived AFTER `new_round`, overwriting the freshly cleared board.
- **Fix:**
  - Added a `round` number to every `move_made` event from the server.
  - Added a `currentRoundRef` on the frontend that tracks which round we're in.
  - The `new_round` handler bumps the ref; the `move_made` handler ignores events from a previous round number.
  - Also explicitly set `boardRef.current` in the `new_round` handler for immediate consistency.
- **Files Changed:** `xoet_backend/src/socket/game.js`, `app/(authed)/game/room.tsx`

### 8. Updated Platform Rules
- **Date:** 2026-05-08
- **Issue:** The rules modal showed outdated information (e.g., "play 1 game to withdraw" instead of rollover, missing draw continuation rule, no AML mention).
- **Fix:** Updated `RulesModal.tsx` with current rules: wager-to-withdraw (1x rollover), draw continuation, room-specific timers, friend challenge, AML enforcement, and instant Chapa processing.
- **Files Changed:** `components/RulesModal.tsx`

### 9. Massively Sped Up Withdrawal Verification
- **Date:** 2026-05-08
- **Issue:** After a successful withdrawal to Chapa, the transaction stayed "Pending" for up to 2+ minutes because the verification cron only ran every 2 minutes, with a 30-second initial delay.
- **Fix:**
  - Reduced the initial check delay from 30 seconds to 10 seconds.
  - Added a `setInterval(30s)` alongside the cron for sub-minute polling.
  - Added an **immediate 8-second delayed verification** right after each Chapa submission in `payments.service.js`, so most withdrawals now confirm within ~10 seconds.
  - Reduced inter-request delay from 500ms to 200ms for batch verification.
- **Files Changed:** `xoet_backend/src/cron.js`, `xoet_backend/src/cron/verifyPendingPayouts.js`, `xoet_backend/src/models/payments.service.js`

### 10. Admin User Management Enhancements
- **Date:** 2026-05-08
- **Issue:** The "Create User" admin modal incorrectly asked for a starting balance (which shouldn't be done on creation), and lacked a Display Name field. The "Edit User" modal needed to pull the existing display name into the input for easy editing.
- **Fix:** 
  - Modified the Create User modal to remove the Balance input and add a "Full Name (Display Name)" input.
  - Modified the Edit User modal to pre-fill the "Full Name" input using the user's existing `display_name`.
- **Files Changed:** `xoet-3/app/(authed)/admin/users.tsx`

### 11. Game Board UI Modernization & Interaction Speed
- **Date:** 2026-05-08
- **Issue:** The game UI needed a more premium, modern feel with faster perceived interaction speeds without relying on unnecessary external libraries like `pretext`.
- **Fix:** 
  - Created a new `CellSymbol` component with `Animated.spring` physics. When X or O is placed, it now "pops" in with a satisfying bounce effect.
  - Upgraded the board's CSS styling (using glassmorphism for `boardContainer`, interactive hover pointer transitions, and cleaner borders) for a fast, modern look.
- **Files Changed:** `xoet-3/app/(authed)/game/room.tsx`

### 12. Fixed Loser Rematch Request Visibility
- **Date:** 2026-05-08
- **Issue:** The loser's rematch request was being sent successfully, but the winner was not seeing the popup.
- **Cause:** The `RematchTopPopup` was rendered inside a `<ScrollView>` in `room.tsx`, causing its `position: "absolute", top: 50` style to anchor to the scrollable content instead of the screen. If the user was scrolled down slightly, the popup rendered off-screen.
- **Fix:** Moved `<RematchTopPopup>` outside of the `<ScrollView>`, placing it as a direct child of the main layout wrapper so it floats consistently over all content.
- **Files Changed:** `xoet-3/app/(authed)/game/room.tsx`

### 13. Modernized System Maintenance UI (Lockout Screen)
- **Date:** 2026-05-08
- **Issue:** When the platform was under maintenance, users received a plain toast notification containing stringified JSON, which looked boring and unprofessional.
- **Fix:** 
  - Updated `login.tsx` to parse the `System Maintenance` error message.
  - Implemented a fullscreen glassmorphic overlay using `expo-linear-gradient` and neon styling.
  - The new UI features a glowing wrench icon, frosted glass background, and clear typography matching the provided modern UI references.
- **Files Changed:** `xoet-3/app/(auth)/login.tsx`
