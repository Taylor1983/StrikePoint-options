import React from 'react';
import { playKeyClick } from '../utils/terminalSound';
import { Terminal, X, ExternalLink, HelpCircle, Keyboard, BookOpen } from 'lucide-react';

interface HelpTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToEducation?: () => void;
}

export const HelpTerminalModal: React.FC<HelpTerminalModalProps> = ({
  isOpen,
  onClose,
  onNavigateToEducation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono select-none">
      <div className="bg-[#07090e] border-2 border-[#ff9900] rounded-lg max-w-2xl w-full shadow-[0_0_30px_rgba(255,153,0,0.3)] overflow-hidden text-xs">
        {/* Terminal Header */}
        <div className="bg-[#ff9900] text-black px-4 py-2 font-black text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="StrikePoint" className="w-5 h-5 object-contain rounded bg-black/40 p-0.5" />
            <span>STRIKEPOINT // HELP DOCUMENTATION & CHEAT SHEET</span>
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="text-black hover:bg-black/20 p-0.5 rounded transition-colors font-extrabold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto flex flex-col gap-4 text-[#cbd5e1]">
          {/* Options Education Masterclass Link Banner */}
          {onNavigateToEducation && (
            <div className="bg-gradient-to-r from-[#ff9900]/20 via-[#ff9900]/10 to-transparent border border-[#ff9900] rounded-lg p-3 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(255,153,0,0.2)]">
              <div>
                <div className="flex items-center gap-1.5 text-[#ff9900] font-black text-xs mb-0.5">
                  <BookOpen className="w-4 h-4" />
                  <span>OPTIONS ACADEMY &amp; MASTERCLASS &lt;EDUC&gt;</span>
                </div>
                <p className="text-[10.5px] text-[#cbd5e1]">
                  Explore interactive strategy risk profiles, volatility skews, binary event IV crush, probability pricing, Greeks term structure, and over/undervaluation diagnostics.
                </p>
              </div>
              <button
                onClick={() => {
                  playKeyClick();
                  onClose();
                  onNavigateToEducation();
                }}
                className="px-3 py-1.5 bg-[#ff9900] hover:bg-[#e68a00] text-black font-black rounded text-[11px] whitespace-nowrap cursor-pointer transition-all shadow"
              >
                OPEN ACADEMY
              </button>
            </div>
          )}

          {/* Introduction */}
          <div className="bg-[#0b0f1a] border border-[#1e2638] rounded p-3">
            <h4 className="text-[#ff9900] font-black text-xs mb-1">
              TERMINAL COMMAND LINE USAGE
            </h4>
            <p className="text-[11px] text-[#8b9bb4] leading-relaxed">
              Type any command into the prompt bar at the top and press <strong className="text-[#ff9900]">{'<GO>'}</strong> (or hit Enter).
              For example, type <strong className="text-white">NVDA OMON</strong> to pull up NVIDIA's options chain, or <strong className="text-white">EDUC</strong> to launch the Options Academy.
            </p>
          </div>

          {/* Mnemonics Reference */}
          <div className="border border-[#1e2638] rounded overflow-hidden">
            <div className="bg-[#0e1424] px-3 py-1.5 font-bold text-white text-[11px] border-b border-[#1e2638]">
              OPTIONS SYSTEM MNEMONICS
            </div>
            <table className="w-full text-left text-[11px]">
              <tbody className="divide-y divide-[#1e2638]">
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">OMON</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Options Monitor — Dual-sided calls & puts chain with live Bid, Ask, Greeks, Volume, OI, and ATM Straddle pricing.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">OVME</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Options Valuation & Strategy Engine — Multi-leg structure builder with interactive P&L payoff curves and order ticket.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">CONE</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Probability of Expiring Cones — Forward standard deviation bands (1σ, 2σ, 3σ), touch probabilities, target strike calculator, and multi-leg overlay.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">SCEN</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Scenario Matrix — 2D stress test grid displaying net P&L across underlying price shocks and volatility shocks.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">FLOW</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Institutional Flow Tape — Real-time stream of aggressive whale sweeps and multi-exchange block orders.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">SURF / 3D</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    3D Volatility Surface — Interactive WebGL Three.js parametric mesh mapping Strike vs Expiration vs Implied Volatility. OrbitControls, colormaps (Bloomberg Amber, Turbo, Cyberpunk, Viridis), traded market quote spheres, 100% ATM spine, raycasting HUD inspection, and volatility shock stress testing.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">VOLS / SKEW</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Volatility Skew & Surface — Multi-expiration skew overlays, ATM term structure (contango/backwardation), 25-delta risk reversals, and 2D/3D surface heatmap across all maturities.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">HIVG / HVT</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Historical & Implied Volatility Chart — 30D Implied Vol vs 30D/10D/60D Realized Volatility time series, Variance Risk Premium (IV - HV spread) histogram, Historical Volatility Cones, and Quantitative Volatility Regime Playbook.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">CHART / TA / TECHO</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Technical Analysis & Quantitative Indicators Suite — Candlestick chart with interactive overlays (SMA 20/50/200, EMA 9/21, Bollinger Bands 20,2σ, VWAP with σ-bands, Supertrend 10,3, Donchian Channels, Parabolic SAR, Floor Trader Pivots P/R1-R3/S1-S3, Options ±1σ Expected Move & Call/Put Walls), multi-pane sub-charts (RSI 14, MACD 12,26,9, Stochastic 14,3,3, ADX trend strength, ATR volatility, OBV volume, TTM Squeeze), automated candlestick pattern recognition, and institutional quantitative consensus scorecard (TECHO).
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">PORT</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Portfolio & Blotter — Real-time mark-to-market positions blotter, buying power, and order fills log.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">PCR</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Put/Call Ratio & Institutional Sentiment — Volume PCR, Open Interest PCR, Dollar-Weighted Premium PCR, 30-Day Historical PCR Trend vs Underlying, Max Pain strike, Gamma Walls (Call & Put Walls), and Sentiment Spectrum Meter.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">OPEC / JMMC</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    OPEC+ Meetings &amp; Crude IV Intelligence — Complete schedule of upcoming and historical Ministerial Summits (ONOMM) &amp; JMMC reviews, pre-meeting IV run-up vs post-meeting IV crush trajectory charts, 25D call/put skew shifts, expected straddle move pricing vs realized moves, and institutional calendar spread / iron condor execution.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ef4444]">GEO RISK</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Country &amp; Geo-Political Risk Heatmap — Visual global heatmaps displaying geopolitical risk premiums (+vol pts) embedded in cross-market options pricing, sovereign CDS spreads, call vs. put skew bias, primary threat catalysts, and actionable hedging playbooks.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ffd600]">YIELD</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    US Treasury Yield Curve — Real-time term structure (1M to 30Y), key curve spreads (2s10s disinversion, 3m10s recession signal, 5s30s), and options cost-of-carry rho sensitivity.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#f97316]">TRFF / TARIFF</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Global Tariff &amp; Trade War Monitor — Real-time tracking of Section 301 tech duties, universal baseline import surcharges, EU EV countervailing tariffs, ticker foreign supply chain vulnerability matrix, stagflationary EPS drag modeling, and interactive trade war impact simulator.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#c084fc]">WITCH / QWITCH</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Quadruple Witching Intelligence &amp; Pin Risk Monitor — Comprehensive tracking of the 4 concurrent quarterly expirations (Index Futures, Index Options, Stock Options, Single-Stock Futures/ETFs), live DTE countdown, dealer Gamma magnet pin strike calculation, intraday Witching Hour session schedule, and MOC imbalance arbitrage playbooks.
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#ff9900]">BTEST / BACKTEST</td>
                  <td className="py-2 px-3 text-[#e2e8f0]">
                    Options Strategy Backtester — Select any institutional strategy from the catalog and test its mark-to-market performance against the last 30 days of underlying market data using Black-Scholes daily mark modeling, Sharpe ratio, drawdown, and win-rate analysis.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="bg-[#0b0f1a] border border-[#1e2638] rounded p-3">
              <div className="font-bold text-[#00d2ff] mb-1">Click to Trade</div>
              <p className="text-[#8b9bb4]">
                In OMON, click any <strong className="text-[#00e676]">Ask to BUY</strong> or <strong className="text-[#ff334b]">Bid to SELL</strong>. Multi-leg strategies are automatically calculated with Black-Scholes precision.
              </p>
            </div>
            <div className="bg-[#0b0f1a] border border-[#1e2638] rounded p-3">
              <div className="font-bold text-[#00d2ff] mb-1">Audio Synthesis</div>
              <p className="text-[#8b9bb4]">
                Built-in tactile audio synthesizes mechanical key clicks and execution fills. Toggle via the top <strong className="text-white">AUDIO</strong> button.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b0f1a] border-t border-[#1e2638] px-4 py-2 flex justify-end">
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold rounded text-xs transition-all"
          >
            DISMISS {'<ESC>'}
          </button>
        </div>
      </div>
    </div>
  );
};
