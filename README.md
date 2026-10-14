# StrikePoint Options Terminal

> Institutional-grade derivatives trading, Black-Scholes Greeks analysis, multi-leg strategy modeling, Net Gamma (GEX) engine, and Canadian registered account compliance terminal built in React, TypeScript, and Tailwind CSS.

---

## ⚡ Quick Start

### 1. Prerequisites
Ensure you have the following installed on your workstation:
- **Node.js**: v18.0.0 or later (v20+ LTS recommended)
- **Package Manager**: `npm` (v9+), `pnpm`, `yarn`, or `bun`

### 2. Installation
Clone the repository or navigate to the project root directory, then install project dependencies:

```bash
npm install
```

*(Alternatively with bun: `bun install` or pnpm: `pnpm install`)*

### 3. Environment Configuration
Copy the provided `.env.example` file to create your local `.env`:

```bash
cp .env.example .env
```

The environment variables are optional for core simulation and pricing:
```env
# Optional Gemini AI key for AI-assisted macro insights (if enabled)
GEMINI_API_KEY="your_api_key_here"

# Application host URL (defaults to localhost:3000)
APP_URL="http://localhost:3000"
```

### 4. Running the Development Server
Start the local Vite development server:

```bash
npm run dev
```

The terminal will launch at:
```
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://0.0.0.0:3000/
```

### 5. Type Checking & Verification
Validate all TypeScript typings and syntax:

```bash
npm run lint
```

### 6. Production Build & Preview
To create an optimized production bundle:

```bash
# Build production bundle to /dist
npm run build

# Preview production build locally
npm run preview
```

---

## 🖥️ Terminal Navigation & Function Keys

The terminal supports classic Bloomberg / Thinkorswim F-Key navigation and quick command execution:

| Key | Terminal Code | Module / Screen Name | Description |
| :--- | :--- | :--- | :--- |
| **F1** | `HELP` | **Terminal Help & Reference** | Command syntax cheat sheet, shortcuts, and mathematical models |
| **F2** | `OMON` | **Options Chain & Matrix** | Live strikes, Bid/Ask, Delta, Gamma, Theta, Vega, IV, and GEX bars |
| **F3** | `OVME` | **Options Valuation & Strategy** | Multi-leg strategy builder, individual leg IV & price modeling, Greeks |
| **F4** | `CONE` | **Probability Cone** | Standard deviation distribution cone (1σ, 2σ, 3σ) across expirations |
| **F5** | `SCEN` | **Scenario Matrix** | P&L stress testing across price shifts (±15%) and implied volatility shifts |
| **F6** | `FLOW` | **Unusual Flow Tape** | Institutional order flow, block trades, sweeps, and dark pool alerts |
| **F7** | `VOLS` | **3D Vol Surface & Vol Lab** | Interactive Three.js volatility smile, skew, and term structure surface |
| **F8 / F10** | `CHART` | **Technical Charts** | Candlesticks, moving averages, Bollinger Bands, and Volume profiling |
| **F9** | `PORT` | **Portfolio & Canadian Suite** | Paper blotter, margin stats, and Canadian registered accounts manager |
| **F11** | `PCR` | **Put/Call Ratio & Walls** | Open Interest distributions, Call/Put walls, and Max Pain calculations |
| **F12** | `OPEC` | **OPEC+ & Energy Macro** | Crude oil quotas, geopolitical meeting calendars, and energy risk |
| — | `DEFCON` | **DEFCON Geopolitical Monitor** | Real-time threat levels (DEFCON 1-5), US Combatant Commands, defense primes |
| — | `TRFF` | **Tariff Tracker** | International trade tariffs, dutiable sectors, and supply chain impacts |

---

## ⌨️ Command Bar Syntax (`<GO>` Engine)

Enter commands directly into the top command bar and press `Enter` or click `<GO>`:

- `AAPL OMON <GO>` – Open Apple options chain
- `NVDA OVME <GO>` – Open NVIDIA strategy evaluation & Greeks
- `SPY GEX <GO>` or `GAMMA <GO>` – Launch Net Gamma (Dealer Exposure) Matrix
- `DEFCON <GO>` – Open DEFCON OSINT & Geopolitical Threat Command
- `TFSA <GO>` or `RRSP <GO>` or `CANADIAN <GO>` – Open Canadian Accounts Suite & Norbert's Gambit
- `MOVE <GO>` or `EXP MOVE <GO>` – Open Expected Price Move probability calculator
- `CATALOG <GO>` – Browse 40+ pre-built multi-leg options strategy presets
- `GEO <GO>` – Launch Global Country Risk Heatmap & sovereign debt analysis
- `RESET <GO>` – Reset paper trading portfolio to initial $500,000 cash

---

## 🚀 Core Features & Institutional Capabilities

### 1. Black-Scholes-Merton Options Engine & Greeks
- Real-time continuous analytical calculation for European and American options approximations.
- Full primary Greeks: **Delta**, **Gamma**, **Theta**, **Vega**, and **Rho**.
- Higher-order Greeks: **Charm** (delta decay over time) and **Vanna** (delta sensitivity to volatility).

### 2. Multi-Leg Strategy Builder & Risk Profile Simulated Trades with Individual Leg IV Modeling
- Construct up to 8-leg synthetic combinations (Iron Condors, Straddles, Butterflies, Ratio Spreads, Calendars, Diagonals, Risk Reversals, Collars).
- **Risk Profile Simulated Trades Table**:
  - Interactive stepper (`-1%`, `+1%`) and direct numeric inputs for individual leg implied volatility.
  - Real-time **Theoretical Price (Theo Price)** and leg P&L calculation using Black-Scholes formulas.
  - Modeled Greek sensitivities per simulated leg: **Delta (Δ)**, **Vega (ν)**, and **Theta (Θ)**.
  - Quick volatility shock presets: **Post-Earnings IV Crush (-25% relative IV)** and **Pre-Event Vol Expansion (+25% relative IV)**.
  - Per-leg reset button (`↺`) and global **Reset All IVs** button to return to baseline chain IVs.
  - Dynamic payoff curve updating in real time across T+0 Today, Expiration (T), and simulated date horizons.
- **Volatility Skew Engine for Calendar & Double Diagonal Spreads**:
  - Full term structure and strike skew modeling across multi-expiration positions.
  - Automatic detection of **Calendar Spreads** (Call/Put Calendars, Double Calendars) and **Double Diagonal Spreads** (4 legs across 2 strikes & 2 expirations).
  - Quantitative Skew Regimes:
    - **Double Diagonal Wing Skew** (+4.5% Contango, -20% Put Slope, Asymmetric Put Wing Bias)
    - **Normal Contango** (+3.5% Back IV)
    - **Earnings Inversion / Backwardation** (-18% Front Spike)
    - **Post-Event Crush** (-12% Back Drop)
    - **Steep Crash Put Skew** (-32% Slope)
    - **Flat Zero Skew** (Classical Black-Scholes baseline)
  - 6 Parameter Controls: Term Structure Skew ($\Delta IV_{term}$), Strike Skew Slope ($\frac{\partial IV}{\partial m}$), Quadratic Smile Curvature ($\alpha$), Post-Front Expiration Vol Shock ($\Delta IV_{back}$ at $T_{front}$), Double Diagonal Put Wing Bias, and Skew Dynamics (**Sticky Moneyness / Floating** vs. **Sticky Strike / Fixed**).
  - **Flat-Vol Baseline Overlay**: Side-by-side dashed reference curve comparing actual skew-calibrated payoff vs classical flat-vol Black-Scholes.
  - **Hover Inspector HUD Skew Alpha**: Real-time display of skew alpha ($\Delta PnL_{skew}$) and flat-vol baseline P&L.
  - **Simulated Trades Breakdown**: Displays strike skew offset, term skew offset, and modeled theoretical price of surviving back-month legs at front-month expiration (`@ T_front`).
- Interactive payoff diagram with break-even points, maximum profit, maximum loss, and return on capital.

### 3. Net Gamma Exposure (GEX) & Dealer Hedging Analytics
- Calculation of aggregate Market Maker / Dealer Gamma Exposure (`Call GEX - Put GEX`).
- Detection of the **Gamma Flip Price** and market regime:
  - **Positive Gamma Regime**: Dealer counter-trend hedging dampens market volatility (mean-reverting).
  - **Negative Gamma Regime**: Dealer trend-following hedging amplifies price moves (accelerating volatility).
- Strike-by-strike GEX distribution, Call Wall, Put Wall, and Absolute Gamma Wall identification.

### 4. 🇨🇦 Canadian Accounts Suite & CRA Compliance Engine
- Built-in multi-account architecture:
  - **TFSA** (Tax-Free Savings Account)
  - **RRSP** (Registered Retirement Savings Plan)
  - **FHSA** (First Home Savings Account)
  - **RESP** (Registered Education Savings Plan)
  - **Non-Registered Margin (CAD & USD)**
- **CRA Compliance Rule Enforcement**: Automatic warning and restriction alerts when attempting forbidden strategies in registered accounts (e.g., naked short calls, naked puts, borrowing on margin).
- **Norbert's Gambit FX Engine**: Dual-listed interlisted stock journaling arbitrage (`DLR.TO` / `DLR.U.TO`) to bypass standard 1.5%–2.5% bank FX conversion fees.
- **US-Canada Tax Treaty Article XXI Matrix**: Real-time dividend withholding tax rules (0% withholding in RRSP vs. 15% non-recoverable withholding in TFSA/FHSA).

### 5. 🛡️ DEFCON Geopolitical Threat Engine (defconlevel.com)
- Active DEFCON alert monitor (DEFCON 1 through 5).
- Status tracking across US Unified Combatant Commands:
  - **USCENTCOM** (Middle East & Central Asia)
  - **USEUCOM** (Europe & Eastern Flank)
  - **USINDOPACOM** (Indo-Pacific & Taiwan Strait)
  - **USSTRATCOM** (Strategic Deterrence & Nuclear Triad)
  - **USCYBERCOM** (Critical Infrastructure & Cyber Defense)
- Live defense primes ticker monitoring: `LMT`, `RTX`, `NOC`, `GD`, `BA`.

### 6. DMA Brokers & Execution Desk
- Multi-broker Direct Market Access routing simulator (Interactive Brokers DMA, TD Direct Investing, Questrade, CIBC Investor's Edge, RBC Direct Investing).
- Limit, Market, Stop-Limit, and Mid-Market price routing.
- Real-time blotter with unrealized and realized P&L, portfolio delta, and purchasing power.

---

## 📁 Repository Structure

```
├── .env.example              # Environment variables template
├── index.html                # Entry HTML shell with Terminal theme
├── metadata.json             # Applet capabilities & metadata
├── package.json              # Project scripts & npm dependencies
├── tsconfig.json             # TypeScript compiler settings
├── vite.config.ts            # Vite build configuration & plugins
└── src/
    ├── App.tsx               # Main terminal coordinator & layout
    ├── index.css             # Tailwind CSS & custom terminal styles
    ├── main.tsx              # React DOM mounting entry point
    ├── components/           # Screen views, modals & terminal gadgets
    │   ├── CanadianAccountsModal.tsx   # TFSA/RRSP rules & Norbert's Gambit
    │   ├── DefconLevelView.tsx         # Geopolitical threat level monitor
    │   ├── ExpectedMoveModal.tsx       # Standard deviation expected move
    │   ├── NetGammaModal.tsx           # Institutional GEX exposure matrix
    │   ├── OptionsChainView.tsx        # Responsive options chain view
    │   ├── OptionsMatrixOMON.tsx       # Bloomberg OMON-style options chain
    │   ├── OptionsValuationOVME.tsx    # Strategy builder & payoff charts
    │   ├── PositionsPortfolioView.tsx  # Institutional blotter & accounts
    │   ├── ProbabilityConeCONE.tsx     # Probability cone visualization
    │   ├── PutCallRatioView.tsx        # Put/Call ratios & Gamma Walls
    │   ├── RiskProfileView.tsx         # Deep payoff & Greek sensitivity
    │   ├── ScenarioMatrixSCEN.tsx      # Scenario stress test matrix
    │   ├── StrategyCatalogModal.tsx    # 40+ multi-leg preset catalog
    │   ├── TariffTrackerView.tsx       # Tariff tracker & trade war impact
    │   ├── TechnicalsChart.tsx         # Technical indicator charting
    │   ├── UnusualFlowTapeFLOW.tsx     # Large block & options sweep tape
    │   ├── VolatilityLabView.tsx       # IV skew & term structure lab
    │   └── VolatilitySurface3D.tsx     # Three.js 3D volatility surface
    ├── services/             # Market data feeds & regulatory logic
    │   ├── canadianAccounts.ts         # CRA registered account rules
    │   ├── defconData.ts               # OSINT & military combatant status
    │   ├── gammaAnalytics.ts           # GEX & dealer hedging calculators
    │   ├── marketData.ts               # Equities, ETFs, futures & chains
    │   └── soundEffects.ts             # Mechanical keyboard audio engine
    ├── types/                # TypeScript type declarations
    │   └── options.ts                  # Option chains, Greeks, legs, accounts
    └── utils/                # Quantitative models & algorithms
        ├── blackScholes.ts             # Black-Scholes-Merton math & Greeks
        ├── formatters.ts               # Currency, percent, and number formats
        └── putCallRatioAnalytics.ts    # Max pain, PCR, and strike analytics
```

---

## 🛠️ Scripts Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts local development server on port 3000 with hot reload |
| `npm run build` | Compiles TypeScript and creates optimized production build in `/dist` |
| `npm run preview` | Starts local web server to preview production build |
| `npm run lint` | Runs `tsc --noEmit` to verify type safety across the entire repository |
| `npm run clean` | Deletes build artifacts (`dist`, `server.js`) |

---

## 💡 Troubleshooting

- **Port in Use**: If port 3000 is occupied by another process, stop the competing service or customize the port in `package.json` (`"dev": "vite --port=3000 --host=0.0.0.0"`).
- **TypeScript Errors**: Run `npm run lint` to pinpoint any type mismatches or missing properties.
- **Audio Feedback**: The terminal includes simulated vintage mechanical keyboard clicks. These can be toggled via the speaker icon in the top utility ribbon.

---

## 📜 License
Private & Confidential. Built for institutional analysis, trading simulation, and options risk modeling.
