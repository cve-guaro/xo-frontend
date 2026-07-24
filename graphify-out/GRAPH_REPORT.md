# Graph Report - xoet-3  (2026-07-24)

## Corpus Check
- 127 files · ~336,088 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 846 nodes · 1387 edges · 116 communities (72 shown, 44 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ec4238d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- expo
- users.tsx
- devDependencies
- index.tsx
- NotificationsPopover.tsx
- _layout.tsx
- Category Breakdown
- manifest.json
- useToast
- gameplay.tsx
- authContext.tsx
- room.tsx
- _layout.tsx
- Preservation Property Test Results
- login.tsx
- useAuth
- ResultOverlay.tsx
- SvgIcons.tsx
- account.tsx
- leaderboard.tsx
- spin.tsx
- transactions.tsx
- include
- deposit.tsx
- history.tsx
- withdraw.tsx
- AdminTheme
- gameplayConstants.ts
- WebPressable.tsx
- index.tsx
- dependencies
- DesktopLayout.tsx
- haptcs.ts
- audit.tsx
- financial.tsx
- API_URL
- SpinWheel.tsx
- WebDepositModal.tsx
- controls.tsx
- waiting.tsx
- config.ts
- Category 1: Payment & Transaction Bugs
- ledger.tsx
- _layout.tsx
- EmojiBar.tsx
- FlashToast.tsx
- agora-rtc-sdk-ng
- FriendMatchModal.tsx
- PromotionPopup.tsx
- spin.tsx
- spin-history.tsx
- AnimatedList.web.tsx
- ForfeitPopup.tsx
- SpinRoomBrowser.tsx
- RulesModal.tsx
- WelcomeBonusModal.tsx
- spin-rooms.tsx
- demo.ts
- privacy.tsx
- terms.tsx
- spin-rooms.tsx
- AnimatedList.native.tsx
- AnimatedNotificationBell.tsx
- EmojiFloat.tsx
- expo
- RematchPopup.tsx
- useToast
- WelcomeTermsPopup.tsx
- ExitModal.tsx
- WebPressable.tsx
- Toast.tsx
- metro.config.js
- theme.ts
- vercel.json
- VoiceService
- expo-audio
- expo-blur
- expo-constants
- expo-dev-client
- expo-font
- expo-linear-gradient
- expo-linking
- logs.tsx
- expo-secure-store
- expo-splash-screen
- expo-status-bar
- @expo/vector-icons
- expo-web-browser
- SpinWheel.tsx
- phosphor-react-native
- primereact
- react-dom
- react-native
- @react-native-async-storage/async-storage
- react-native-reanimated
- react-native-safe-area-context
- react-native-web
- expo-audio
- react-native-worklets
- @react-navigation/native
- @sentry/react
- socket.io-client
- service-worker.js
- preservation-properties.test.ts
- LeaveGameConfirmation.tsx
- ProfileEditModal.tsx
- PwaInstallBanner.tsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 103 edges
2. `API_URL` - 45 edges
3. `useBackgroundMusic()` - 25 edges
4. `useToast()` - 18 edges
5. `expo` - 17 edges
6. `AdminTheme` - 17 edges
7. `WebDepositModal()` - 12 edges
8. `WebWithdrawModal()` - 12 edges
9. `haptics` - 12 edges
10. `useSocket()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AdminLeaderboardPage()` --calls--> `useAuth()`  [EXTRACTED]
  app/(authed)/admin/leaderboard.tsx → context/authContext.tsx
- `AdminLedger()` --calls--> `useAuth()`  [EXTRACTED]
  app/(authed)/admin/ledger.tsx → context/authContext.tsx
- `PromotionLinks()` --calls--> `useAuth()`  [EXTRACTED]
  app/(authed)/admin/promotion-links.tsx → context/authContext.tsx
- `PlayerBadge()` --calls--> `useAuth()`  [EXTRACTED]
  app/(authed)/game/room.tsx → context/authContext.tsx
- `GamesHistory()` --calls--> `useAuth()`  [EXTRACTED]
  app/(authed)/games/index.tsx → context/authContext.tsx

## Import Cycles
- None detected.

## Communities (116 total, 44 thin omitted)

### Community 0 - "expo"
Cohesion: 0.05
Nodes (36): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled, projectId, typedRoutes (+28 more)

### Community 1 - "users.tsx"
Cohesion: 0.07
Nodes (24): AdminLeaderboardPage(), C, FakeTicker, s, Snapshot, Standing, fmt(), s (+16 more)

### Community 2 - "devDependencies"
Cohesion: 0.07
Nodes (29): babel-plugin-transform-remove-console, fast-check, jest, devDependencies, babel-plugin-transform-remove-console, fast-check, jest, react-test-renderer (+21 more)

### Community 3 - "index.tsx"
Cohesion: 0.09
Nodes (21): chunkMoves(), computeWinner(), GameViewer(), LINES, Move, ParamPayload, RoundTab, safeParseMoves() (+13 more)

### Community 4 - "NotificationsPopover.tsx"
Cohesion: 0.38
Nodes (6): FilterTab, formatTimeAgo(), isToday(), NotificationItem(), NotificationsPopover(), s

### Community 5 - "_layout.tsx"
Cohesion: 0.13
Nodes (17): GlobalInvitesGate(), GlobalNotiGate(), MatchmakingGate(), ActionCtx, CombinedCtx, Msg, IMPORTANT: do NOT forceNew (it can churn engines on remount), SERVER_EVENTS (+9 more)

### Community 6 - "Category Breakdown"
Cohesion: 0.10
Nodes (19): Bug Condition Exploration Test Results, Category 1: Payment & Transaction Bugs (6 tests), Category 2: Internationalization Bugs (3 tests), Category 3: UI/UX Responsive Design Bugs (8 tests), Category 4: Game Configuration Bugs (2 tests), Category 5: Data Display & Admin Dashboard Bugs (7 tests), Category 6: Game Logic & Flow Bugs (4 tests), Category 7: Missing Features (4 tests) (+11 more)

### Community 7 - "manifest.json"
Cohesion: 0.11
Nodes (18): background_color, categories, description, display, icons, lang, name, orientation (+10 more)

### Community 8 - "useToast"
Cohesion: 0.25
Nodes (8): BoardDemo, styles, DEMO_BOARD, RoomConfig, ROOMS, SheetStep, RoomSheet, styles

### Community 9 - "gameplay.tsx"
Cohesion: 0.13
Nodes (10): getArcPath(), polarToCartesian(), SpinWheelSvg(), styles, IncomingInviteModal(), Props, s, LobbyHeader (+2 more)

### Community 10 - "authContext.tsx"
Cohesion: 0.16
Nodes (17): AuthContext, AuthProvider(), AuthUser, Ctx, fetchMe(), fetchMethodsFromApi(), fixAvatarUrl(), Language (+9 more)

### Community 11 - "room.tsx"
Cohesion: 0.13
Nodes (13): BoardCell, calculateWinAmount(), CELL, EMPTY_BOARD, GameRoom(), isXO(), PlayerBadge(), IMPORTANT: ref-only syncing gate (no UI) (+5 more)

### Community 12 - "_layout.tsx"
Cohesion: 0.22
Nodes (6): HapticStep, Impact, impactStyleMap, Notification, notificationTypeMap, Selection

### Community 13 - "Preservation Property Test Results"
Cohesion: 0.12
Nodes (16): Category 1: Payment & Transaction Preservation (3 tests), Category 2: Language & Localization Preservation (2 tests), Category 3: UI/UX Preservation (3 tests), Category 4: Game Logic Preservation (3 tests), Category 5: Data Display Preservation (2 tests), Category 6: Core Functionality Preservation (5 tests), Dependencies Added, Files Created (+8 more)

### Community 14 - "login.tsx"
Cohesion: 0.31
Nodes (8): s, WaitingScreen(), { width: SCREEN_W }, Landing(), LeaderboardScreen(), SpinGameScreen(), useBackgroundMusic(), useSocket()

### Community 15 - "useAuth"
Cohesion: 0.18
Nodes (6): AdminTheme, PromotionLink, PromotionLinks(), styles, s, s

### Community 16 - "ResultOverlay.tsx"
Cohesion: 0.16
Nodes (13): CARD_W, CONTENT_BG, END, LOSE_BADGE, ResultOverlay(), ResultOverlayProps, START, styles (+5 more)

### Community 17 - "SvgIcons.tsx"
Cohesion: 0.15
Nodes (12): styles, Index(), OfflineNoticeProps, styles, ArrowForwardIcon(), CheckmarkCircleIcon(), CloudOfflineIcon(), EllipseIcon() (+4 more)

### Community 18 - "account.tsx"
Cohesion: 0.21
Nodes (9): LeaderboardUser, PreviousWeekWin, s, ModalProps, styles, useModalAnim(), WebDepositModal(), useModalAnim() (+1 more)

### Community 20 - "spin.tsx"
Cohesion: 0.20
Nodes (4): formatMemberSince(), ProfileScreen(), s, ReferralModalProps

### Community 21 - "transactions.tsx"
Cohesion: 0.39
Nodes (7): AdminAudit(), AuditLog, formatDetails(), getActionColor(), glass(), styles, timeSince()

### Community 22 - "include"
Cohesion: 0.15
Nodes (12): ./*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths (+4 more)

### Community 23 - "deposit.tsx"
Cohesion: 0.18
Nodes (12): DepositScreen(), MethodCard, Notice, OneToast, PaymentMethod, PRESETS, styles, SUCCESS_URL_PATTERNS (+4 more)

### Community 24 - "history.tsx"
Cohesion: 0.31
Nodes (7): formatWhen(), Game, GamesHistory(), getBoardForStep(), getDuration(), Move, s

### Community 25 - "withdraw.tsx"
Cohesion: 0.18
Nodes (11): MethodCard, MethodKey, Notice, OneToast, PRESETS, styles, SUCCESS_URL_PATTERNS, ToastBucket (+3 more)

### Community 26 - "AdminTheme"
Cohesion: 0.33
Nodes (4): ModalProps, styles, MIN_DEPOSIT, MIN_PAYOUT

### Community 27 - "gameplayConstants.ts"
Cohesion: 0.14
Nodes (16): AdminLayout(), BottomTabItem(), NAV_ITEMS, NavGroup(), s, SideNavItem(), AdminSettings(), glass (+8 more)

### Community 28 - "WebPressable.tsx"
Cohesion: 0.33
Nodes (3): AuthedLayout(), colors, s

### Community 29 - "index.tsx"
Cohesion: 0.33
Nodes (5): AdminOverview(), fmt(), fmtK(), st, timeSince()

### Community 30 - "dependencies"
Cohesion: 0.14
Nodes (14): AuthGate(), BootSplash, styles, EmergencyLockoutScreen(), FeatureGate(), styles, { width, height }, ConstructIcon() (+6 more)

### Community 31 - "DesktopLayout.tsx"
Cohesion: 0.31
Nodes (6): DesktopLayoutProps, getArcPath(), LeaderboardEntry, polarToCartesian(), s, SpinWheelSvg()

### Community 32 - "haptcs.ts"
Cohesion: 0.50
Nodes (3): SearchingView, SearchingViewProps, styles

### Community 33 - "audit.tsx"
Cohesion: 0.14
Nodes (16): LoginScreen(), Maintenance(), s, GlobalToastContainer(), SingleToast, styles, VARIANT_CONFIG, AlertCircleIcon() (+8 more)

### Community 34 - "financial.tsx"
Cohesion: 0.36
Nodes (6): FinancialDashboard(), fmt(), fmtK(), st, TabKey, TimeRange

### Community 35 - "API_URL"
Cohesion: 0.22
Nodes (11): BonusTrackingLogModal, formatDate(), formatDateOnly(), formatTimeOnly(), normalizeStatus(), normalizeType(), s, styles (+3 more)

### Community 36 - "SpinWheel.tsx"
Cohesion: 0.20
Nodes (7): ds, RoundState, ScreenState, SpinPlayer, DIGITS, SlidingNumber(), SlidingNumberProps

### Community 38 - "controls.tsx"
Cohesion: 0.33
Nodes (5): AdminControls(), s, spinS, TEMPLATES, timeFmt()

### Community 40 - "config.ts"
Cohesion: 0.18
Nodes (7): s, XOControlsPage(), NotificationsScreen(), styles, BonusLogsModal, styles, API_URL

### Community 41 - "Category 1: Payment & Transaction Bugs"
Cohesion: 0.29
Nodes (6): Bug 1.1: Mobile Deposit/Withdraw Input Field Responsiveness, Bug 1.2: Payment Page Transaction Data Display, Bug 1.3: Mobile Navigation Loading States, Bug 1.4: Admin Platform Balance Accuracy, Category 1: Payment & Transaction Bugs, Manual Bug Exploration Checklist

### Community 42 - "ledger.tsx"
Cohesion: 0.33
Nodes (5): AdminLedger(), glass, styles, TABS, Tx

### Community 44 - "EmojiBar.tsx"
Cohesion: 0.33
Nodes (4): EMOJI_GIFS, EMOJIS, Props, styles

### Community 45 - "FlashToast.tsx"
Cohesion: 0.33
Nodes (5): MatchFoundToast, MatchFoundToastHandle, Payload, Props, styles

### Community 46 - "agora-rtc-sdk-ng"
Cohesion: 0.40
Nodes (3): BackgroundMusicContext, BackgroundMusicContextType, BackgroundMusicProvider()

### Community 47 - "FriendMatchModal.tsx"
Cohesion: 0.33
Nodes (4): BET_OPTIONS, FriendMatchModal(), Props, s

### Community 48 - "PromotionPopup.tsx"
Cohesion: 0.33
Nodes (5): AnimatedCircle, easeOut, PromotionPopup(), styles, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }

### Community 49 - "spin.tsx"
Cohesion: 0.60
Nodes (4): fmt(), s, SpinAdminPage(), timeFmt()

### Community 50 - "spin-history.tsx"
Cohesion: 0.60
Nodes (4): fmt(), s, SpinHistoryPage(), timeFmt()

### Community 52 - "ForfeitPopup.tsx"
Cohesion: 0.40
Nodes (3): Mode, Props, styles

### Community 53 - "SpinRoomBrowser.tsx"
Cohesion: 0.40
Nodes (3): SpinRoomBrowserProps, SpinRoomConfig, styles

### Community 54 - "RulesModal.tsx"
Cohesion: 0.40
Nodes (3): Props, RULES, styles

### Community 55 - "WelcomeBonusModal.tsx"
Cohesion: 0.40
Nodes (3): styles, WelcomeBonusModalProps, { width }

### Community 56 - "spin-rooms.tsx"
Cohesion: 0.67
Nodes (3): fmt(), s, SpinRoomsPage()

### Community 57 - "demo.ts"
Cohesion: 0.40
Nodes (3): demoGameHistory, demoUser, Game

### Community 65 - "RematchPopup.tsx"
Cohesion: 0.50
Nodes (3): Props, RematchTopPopup(), styles

### Community 69 - "WebPressable.tsx"
Cohesion: 0.22
Nodes (8): HeaderPill, InfoPill, styles, styles, WeeklyPodium, WeeklyPodiumProps, WebPressable(), WebPressableProps

### Community 73 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, headers, outputDirectory, rewrites

### Community 84 - "expo-font"
Cohesion: 0.22
Nodes (9): agora-rtc-sdk-ng, expo-font, motion, dependencies, agora-rtc-sdk-ng, expo-font, motion, react-native-webview (+1 more)

### Community 87 - "logs.tsx"
Cohesion: 0.17
Nodes (13): AdminLogs(), etb(), GameLog, glass(), initials2(), styles, timeSince(), RematchOfferModal() (+5 more)

### Community 93 - "SpinWheel.tsx"
Cohesion: 0.36
Nodes (7): getArcPath(), Player, polarToCartesian(), SLICE_COLORS, SpinWheel(), SpinWheelProps, styles

### Community 102 - "expo-audio"
Cohesion: 0.22
Nodes (6): plugins, styles, BackgroundMusicContext, BackgroundMusicContextType, BackgroundMusicProvider(), expo-audio

### Community 114 - "LeaveGameConfirmation.tsx"
Cohesion: 0.50
Nodes (3): LeaveGameConfirmation(), LeaveGameConfirmationProps, styles

### Community 115 - "ProfileEditModal.tsx"
Cohesion: 0.50
Nodes (3): ProfileEditModal(), ProfileEditModalProps, styles

### Community 116 - "PwaInstallBanner.tsx"
Cohesion: 0.50
Nodes (3): PwaInstallBanner(), styles, CloseIcon()

## Knowledge Gaps
- **397 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+392 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `gameplayConstants.ts` to `users.tsx`, `index.tsx`, `NotificationsPopover.tsx`, `_layout.tsx`, `gameplay.tsx`, `authContext.tsx`, `room.tsx`, `login.tsx`, `useAuth`, `SvgIcons.tsx`, `account.tsx`, `spin.tsx`, `transactions.tsx`, `deposit.tsx`, `history.tsx`, `withdraw.tsx`, `WebPressable.tsx`, `index.tsx`, `dependencies`, `haptcs.ts`, `audit.tsx`, `financial.tsx`, `API_URL`, `SpinWheel.tsx`, `controls.tsx`, `config.ts`, `ledger.tsx`, `agora-rtc-sdk-ng`, `FriendMatchModal.tsx`, `PromotionPopup.tsx`, `spin.tsx`, `spin-history.tsx`, `spin-rooms.tsx`, `RematchPopup.tsx`, `logs.tsx`, `expo-audio`, `LeaveGameConfirmation.tsx`, `ProfileEditModal.tsx`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Why does `dependencies` connect `expo-font` to `devDependencies`, `WebDepositModal.tsx`, `waiting.tsx`, `_layout.tsx`, `spin-rooms.tsx`, `expo`, `useToast`, `expo-audio`, `expo-blur`, `expo-constants`, `expo-dev-client`, `expo-linear-gradient`, `expo-linking`, `logs.tsx`, `expo-secure-store`, `expo-splash-screen`, `expo-status-bar`, `@expo/vector-icons`, `expo-web-browser`, `phosphor-react-native`, `primereact`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-web`, `react-native-worklets`, `@react-navigation/native`, `@sentry/react`, `socket.io-client`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Why does `react` connect `logs.tsx` to `config.ts`, `expo-font`, `login.tsx`, `dependencies`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _397 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `users.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07386363636363637 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._