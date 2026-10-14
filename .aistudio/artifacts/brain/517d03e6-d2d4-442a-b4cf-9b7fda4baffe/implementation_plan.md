# StrikePoint Terminal: Layout Realignment, Account Privacy & Screen Auto-Fit

A unified enhancement plan to move the Probability Cone and related analytical tools directly beside the Watchlist tab on the left, introduce comprehensive account privacy features (balance masking, stealth mode toggle, and privacy screen overlay), and scale the terminal viewport dynamically to fit any display without scrolling.

## User Review & Critical Decisions

> [!IMPORTANT]
> The plan unifies all four user requirements into an integrated workflow. Please review the confirmed choices and defaults below before approving:

- **Confirmed Decision 1 (Tab & Gadget Positioning)**: Move the **PROBABILITY CONE** tab to position #2 in the main workspace tab bar—directly beside the **WATCHLIST** tab—along with a direct quick-launch button in the left sidebar header beside the Watchlist controls, giving instant side-by-side access.
- **Confirmed Decision 2 (Account Privacy Features)**: Implement a universal **Privacy / Stealth Mode** toggle in the top header and bottom status footer. When active, all account balances (Cash, Net Liq, Buying Power, Margin Requirement, Canadian account balances, and position P&L) are masked with dots (`$••••••`) with individual hover/click unmasking, plus a rapid **Panic Screen Blur** shortcut (`Alt+P` / button).
- **Confirmed Decision 3 (Screen Auto-Fit Scaling)**: Implement an intelligent **Auto-Fit to Screen** engine that calculates the optimal zoom/scale ratio to guarantee the full terminal interface fits edge-to-edge within any screen height and width without page-level scrollbars.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Tab & Spatial Reorganization**: Positions the Probability Cone (`<CONE>`) and related analytical controls directly adjacent to the Watchlist tab on the far left of the workspace tab bar and inside the sidebar quick-launch strip.
  2. **Comprehensive Account Privacy**: Equips institutional traders with a multi-tiered privacy system to hide sensitive capital figures (Net Liq, Cash, Margin BP, TFSA/RRSP balances, and active position P&L) during screen sharing, live streaming, or public environments.
  3. **Viewport Auto-Fit Engine**: Introduces dynamic viewport-aware screen fitting that scales typography, data grids, and component containers cleanly to eliminate cutoffs or unnecessary scroll bars on any monitor, laptop, or split-screen window.
- **Target Audience / Persona**: Active retail & proprietary options traders who work across varying display setups (13" laptops to 4K multi-monitors) and frequently share screens or trade in public spaces.
- **Key Value**: Ergonomic proximity between watchlists and probability modeling, total control over financial privacy, and pixel-perfect screen fitting across all display formats.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Watchlist to Probability Cone Workflow**:
   - The user opens the terminal. The left sidebar hosts the institutional watchlist.
   - Directly beside the **WATCHLIST** tab in the main tab bar sits the newly repositioned **PROBABILITY CONE** tab (followed by OPTION CHAIN, OPTIONS EXPIRATION, etc.).
   - A single click on either the tab or the companion sidebar button immediately transitions the central workspace to the Probability Cone and Expected Move bands for the active watchlist ticker.

2. **Account Privacy / Stealth Mode Activation**:
   - The trader clicks the new **Stealth / Privacy (Eye)** button in the top header (adjacent to BP & Net Liq) or presses `Alt+P`.
   - Instantly, all financial metrics switch to obscured representations:
     - Header BP & Net Liq: `$••••••` / `$***,***`
     - Canadian account balances (TFSA, RRSP, Margin): `$••••••`
     - Bottom footer margin BP & Net Liq: `$••••••`
     - Position Monitor marks, unrealized P&L, and quantity totals: `$••••••`
   - Hovering or clicking any individual badge reveals the value momentarily with a discreet lock indicator.
   - An optional **Screen Privacy Blur** curtain can be engaged with a single click for instantaneous total screen masking when stepping away.

3. **Screen Auto-Fit Scaling Flow**:
   - The trader clicks the prominent **FIT SCREEN** button in the header toolbar or opens Display Settings.
   - The terminal computes the exact aspect ratio and dimensions of the current browser window, calculating an optimal scale factor (e.g., `0.85` or `0.92`) that preserves crisp monospace typography while fitting 100% of the UI inside the viewport height.
   - A toggle for "Auto-Fit on Window Resize" ensures the terminal automatically adapts if the user resizes their browser window or moves it between displays.

### Visual Identity & Theme

- **Aesthetic Direction**: Ultra-precise, high-density institutional financial terminal (Bloomberg / thinkorswim style) with neutral dark slate background (`#0a0e17`), hairline borders (`#1a2333`), and neon cyber-amber accents (`#ff9900`, `#00d2ff`, `#00e676`).
- **Color Tokens**:
  - Canvas: `#0a0e17`
  - Structural Surfaces: `#0f1523` / `#141d2e`
  - Privacy Accents: Lavender / Cyan privacy badge (`#818cf8` / `#38bdf8`) with crisp open/closed eye glyphs (`Eye` / `EyeOff`).
  - Active Tab Accent: Vivid amber `#ff9900` with subtle glow.
- **Typography**: Clean monospace tabular figures (`font-mono tabular-nums`) for all numbers and metrics, paired with `Plus Jakarta Sans` for labels and headers.
- **Interactive Feedback**: 120ms micro-transitions on tab switches and scale adjustments; auditory key-click chimes on privacy and scaling toggles.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Tab Order Reconfiguration**:
  - *Chosen Approach*: Reorder the primary tab bar to place `WATCHLIST` at position 0 and `PROBABILITY CONE` at position 1 (immediately adjacent), with secondary access buttons in the sidebar header.
  - *Why*: Eliminates long mouse travel across the wide screen between the left watchlist and the probability cone, fulfilling the user's explicit layout request.
  - *Alternative Considered*: Moving Probability Cone permanently inside the 240px left sidebar drawer. Rejected because the multi-strike probability cone and volatility curves require substantial horizontal resolution (minimum 600px) to render legible strike distributions.

- **Decision 2: Comprehensive Multi-Surface Privacy State**:
  - *Chosen Approach*: Centralize privacy mode in React state with persistent `localStorage` backing (`strikepoint_account_privacy: true | false`), propagating to all 5 display surfaces: Header, Left Sidebar Acct Bar, Canadian Accounts Selector, Position Monitor table, and Footer status bar.
  - *Why*: Privacy leaks occur when one component hides numbers while another footer or sidebar gadget reveals them. A single coordinated state ensures complete data shielding.

- **Decision 3: Dual CSS Zoom & Viewport Height Fit Math**:
  - *Chosen Approach*: Calculate fit scale using `Math.min(window.innerWidth / BASE_WIDTH, (window.innerHeight - HEADER_FOOTER_OFFSET) / BASE_HEIGHT)`, applying the scale via CSS `--ui-scale` and `zoom` with flex/grid containment.
  - *Why*: Prevents any vertical scrollbar from ever appearing on standard 1080p or laptop displays while preserving full interactive click targets and clean SVG canvas rendering.

---

## 4. Technical Architecture & Data Strategy

### System Layout & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TOP NAVIGATION HEADER                           │
│  [WATCHLIST]  [FIT SCREEN] [SCALE]  [PRIVACY EYE]  BP: $••••  NET: $••••│
├────────────────────────────────┬───────────────────────────────────────┤
│          LEFT SIDEBAR          │             CONTENT AREA              │
│  ┌──────────────────────────┐  │  ┌─────────────────────────────────┐  │
│  │ Watchlist Gadget         │  │  │ Tab Bar:                        │  │
│  │ · US / CAD / CME Tabs    │  │  │ [WATCHLIST] [PROBABILITY CONE]  │  │
│  │ · Quick Launch [CONE] ───┼──┼──> [OPTION CHAIN] [EXP] [GREEKS]...│  │
│  ├──────────────────────────┤  │  ├─────────────────────────────────┤  │
│  │ Options Analysis Gadget  │  │  │ Active View Canvas:             │  │
│  │ Earnings Calendar Gadget │  │  │ · ProbabilityConeCONE           │  │
│  ├──────────────────────────┤  │  │   (Expected Move, 1σ/2σ/3σ,     │  │
│  │ Account Status           │  │  │    Historical distribution)     │  │
│  │ Pos: 3 · [Reset Acct]    │  │  │ · Option Chain / Greeks         │  │
│  │ [Privacy Mask: Active]   │  │  │ · Position Monitor              │  │
│  └──────────────────────────┘  │  └─────────────────────────────────┘  │
├────────────────────────────────┴───────────────────────────────────────┤
│                        BOTTOM STATUS FOOTER                            │
│  [TICKERS]  MARGIN BP: ($••••)  NET LIQ: $••••  [PRIVACY TOGGLE]  TIME │
└────────────────────────────────────────────────────────────────────────┘
```

### State Store & Privacy Mapping

```typescript
interface AccountPrivacyState {
  isPrivate: boolean;               // Global balance masking toggle
  isScreenBlurred: boolean;         // Instant panic privacy blur curtain
  revealedItemIds: Set<string>;     // Ephemeral set of single-clicked peeked items
  autoLockMinutes: number;          // 0 = disabled, 2, 5, 10 minutes inactivity
}

// Helper formatter used across all balance displays:
const formatPrivateCurrency = (
  value: number,
  isPrivate: boolean,
  isPeeked: boolean = false
): string => {
  if (isPrivate && !isPeeked) return '$••••••';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
```

### Files to Modify in Execution Phase

1. **`src/App.tsx`**:
   - Reorder workspace tabs: place `PROBABILITY CONE` directly beside `WATCHLIST`.
   - Add global `isAccountPrivacyEnabled` and `isScreenBlurred` state hooks with localStorage persistence.
   - Insert privacy toggle button with `Eye` / `EyeOff` icons in Header and Footer.
   - Enhance `handleFitToScreen` with dynamic dual-axis viewport calculation (`window.innerWidth` & `window.innerHeight`).
   - Add keyboard shortcut listener (`Alt+P` for privacy mode toggle, `Alt+F` for fit screen).
2. **`src/components/PositionMonitorView.tsx`**:
   - Connect `isAccountPrivacyEnabled` to position table columns (Mark, Cost Basis, Unrealized P&L, Daily P&L, Account Total Net Liq).
   - Add click-to-peek interaction on individual masked cells.
3. **`src/components/WatchlistSidebarGadget.tsx`**:
   - Add quick-jump button to Probability Cone right beside the watchlist title/tab controls.
4. **`src/components/DisplaySettingsModal.tsx`**:
   - Add "Screen Auto-Fit" toggle and "Account Privacy & Stealth Mode" preference controls.
5. **`src/index.css`**:
   - Add `.privacy-blur-curtain` utility and fine-tune `.tos-app-shell` scaling styles to prevent outer scroll overflow.
