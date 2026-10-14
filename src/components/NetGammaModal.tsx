import React, { useState, useMemo } from 'react';
import { Ticker, ExpirationOptionChain, TradeLeg } from '../types/options';
import {
  calculateNetGammaAnalysis,
  calculatePositionNetGamma,
  NetGammaAnalysis,
  StrikeNetGamma,
} from '../services/gammaAnalytics';
import {
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Sliders,
  BarChart2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  DollarSign,
  Compass,
} from 'lucide-react';
import { playKeyClick, playTickBlip } from '../utils/terminalSound';

interface NetGammaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: Ticker;
  allChains: ExpirationOptionChain[];
  builderLegs?: TradeLeg[];
  onOpenChain?: () => void;
  onOpenRiskProfile?: () => void;
}

export const NetGammaModal: React.FC<NetGammaModalProps> = ({
  isOpen,
  onClose,
  ticker,
  allChains,
  builderLegs = [],
  onOpenChain,
  onOpenRiskProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'regime' | 'strikes' | 'expirations' | 'position'>('regime');
  const [simulatedMovePct, setSimulatedMovePct] = useState<number>(0);
  const [strikeFilter, setStrikeFilter] = useState<'all' | 'near' | 'calls' | 'puts'>('near');

  const gexAnalysis: NetGammaAnalysis = useMemo(() => {
    return calculateNetGammaAnalysis(ticker, allChains);
  }, [ticker, allChains]);

  const positionGamma = useMemo(() => {
    return calculatePositionNetGamma(builderLegs, ticker.price);
  }, [builderLegs, ticker.price]);

  if (!isOpen) return null;

  const currentPrice = ticker.price;
  const isPositiveGamma = gexAnalysis.netGammaRegime === 'POSITIVE_GAMMA';

  // Filter strikes for chart/table
  const filteredStrikes = gexAnalysis.strikes.filter((st) => {
    if (strikeFilter === 'near') {
      return Math.abs(st.strike - currentPrice) <= currentPrice * 0.08;
    }
    if (strikeFilter === 'calls') {
      return st.netGEX > 0;
    }
    if (strikeFilter === 'puts') {
      return st.netGEX < 0;
    }
    return true;
  });

  // Find max GEX for chart scaling
  const maxBarGex = Math.max(
    1,
    ...filteredStrikes.map((s) => Math.max(Math.abs(s.callGEX), Math.abs(s.putGEX), Math.abs(s.netGEX)))
  );

  // Simulated dealer hedging flow based on slider
  const simulatedPrice = currentPrice * (1 + simulatedMovePct / 100);
  // If positive gamma, dealer flow opposes move (dips bought, rallies sold)
  // If negative gamma, dealer flow reinforces move (dips sold, rallies bought)
  const dealerFlowDirection = isPositiveGamma
    ? simulatedMovePct > 0
      ? 'SELL'
      : simulatedMovePct < 0
      ? 'BUY'
      : 'NEUTRAL'
    : simulatedMovePct > 0
    ? 'BUY'
    : simulatedMovePct < 0
    ? 'SELL'
    : 'NEUTRAL';

  const simulatedDollarFlowM = Math.abs(gexAnalysis.totalNetGEX * (simulatedMovePct / 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col font-mono text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-[#07090e] border-b border-[#141b2a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#a855f7]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm sm:text-base tracking-wide">
                  NET GAMMA EXPOSURE (GEX) ENGINE
                </span>
                <span className="text-[#a855f7] bg-[#a855f7]/15 border border-[#a855f7]/30 px-2 py-0.5 rounded text-[10px] font-black">
                  {ticker.symbol} · ${currentPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-[#8b9bb4]">
                Market Maker Hedging Dynamics, Strike-by-Strike Dealer GEX & Zero-Gamma Volatility Trigger
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#8b9bb4] hover:text-white hover:bg-[#141b2a] transition-all"
            title="Close Net Gamma Analysis"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#0d1322] border-b border-[#141b2a] text-[11px]">
          {/* Net GEX Total */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-2.5">
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center justify-between">
              <span>NET DEALER GEX</span>
              <span className="text-[9px] text-white/60">/ 1% MOVE</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-xl sm:text-2xl font-black ${
                  gexAnalysis.totalNetGEX >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                }`}
              >
                {gexAnalysis.totalNetGEXDollarString}
              </span>
            </div>
            <div className="text-[9.5px] mt-0.5 text-[#8b9bb4]">
              Calls: <strong className="text-[#00e676]">+${gexAnalysis.totalCallGEX.toFixed(0)}M</strong> · Puts:{' '}
              <strong className="text-[#ff334b]">${gexAnalysis.totalPutGEX.toFixed(0)}M</strong>
            </div>
          </div>

          {/* Gamma Regime */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-2.5">
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider">GAMMA REGIME</div>
            <div
              className="text-xs sm:text-sm font-black mt-1 truncate"
              style={{ color: gexAnalysis.regimeColor }}
            >
              {gexAnalysis.regimeBadge}
            </div>
            <div className="text-[9.5px] text-[#8b9bb4] mt-0.5 truncate">
              {isPositiveGamma ? 'Vol Dampened (Mean-Reverting)' : 'Vol Amplified (Momentum)'}
            </div>
          </div>

          {/* Gamma Flip Level */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-2.5">
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center justify-between">
              <span>ZERO GAMMA FLIP</span>
              <span className="text-[#ffd600] font-bold text-[9px]">TRIGGER</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black text-[#ffd600]">
                ${gexAnalysis.gammaFlipPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-[9.5px] text-[#8b9bb4] mt-0.5">
              Spot is{' '}
              <strong className={gexAnalysis.distToFlipPct >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                {gexAnalysis.distToFlipPct >= 0 ? '+' : ''}
                {gexAnalysis.distToFlipPct}%
              </strong>{' '}
              {gexAnalysis.distToFlipPct >= 0 ? 'above' : 'below'} flip line
            </div>
          </div>

          {/* Call & Put Walls */}
          <div className="bg-[#07090e] border border-[#1e2638] rounded p-2.5">
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider">KEY GAMMA WALLS</div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-[#00e676] font-bold">
                Call Wall: <strong>${gexAnalysis.callWallStrike}</strong>
              </span>
              <span className="text-[9.5px] text-[#8b9bb4]">+${gexAnalysis.callWallGEX.toFixed(0)}M</span>
            </div>
            <div className="flex items-center justify-between mt-0.5 text-[11px]">
              <span className="text-[#ff334b] font-bold">
                Put Wall: <strong>${gexAnalysis.putWallStrike}</strong>
              </span>
              <span className="text-[9.5px] text-[#8b9bb4]">${gexAnalysis.putWallGEX.toFixed(0)}M</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-[#090d16] border-b border-[#141b2a] overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              playTickBlip();
              setActiveTab('regime');
            }}
            className={`px-3 py-1.5 font-bold text-xs rounded-t flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'regime'
                ? 'bg-[#141b2a] text-[#a855f7] border-[#a855f7]'
                : 'text-[#8b9bb4] border-transparent hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>GEX REGIME & VOLATILITY</span>
          </button>

          <button
            onClick={() => {
              playTickBlip();
              setActiveTab('strikes');
            }}
            className={`px-3 py-1.5 font-bold text-xs rounded-t flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'strikes'
                ? 'bg-[#141b2a] text-[#a855f7] border-[#a855f7]'
                : 'text-[#8b9bb4] border-transparent hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>STRIKE GEX PROFILE ({gexAnalysis.strikes.length})</span>
          </button>

          <button
            onClick={() => {
              playTickBlip();
              setActiveTab('expirations');
            }}
            className={`px-3 py-1.5 font-bold text-xs rounded-t flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'expirations'
                ? 'bg-[#141b2a] text-[#a855f7] border-[#a855f7]'
                : 'text-[#8b9bb4] border-transparent hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>TERM STRUCTURE (DTE)</span>
          </button>

          <button
            onClick={() => {
              playTickBlip();
              setActiveTab('position');
            }}
            className={`px-3 py-1.5 font-bold text-xs rounded-t flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'position'
                ? 'bg-[#141b2a] text-[#a855f7] border-[#a855f7]'
                : 'text-[#8b9bb4] border-transparent hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>POSITION NET GAMMA ({builderLegs.length} LEGS)</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: REGIME & VOLATILITY IMPACT */}
          {activeTab === 'regime' && (
            <div className="space-y-4">
              {/* Regime Narrative Card */}
              <div
                className="p-4 rounded-lg border flex flex-col gap-2"
                style={{
                  backgroundColor: isPositiveGamma ? 'rgba(0, 230, 118, 0.05)' : 'rgba(255, 51, 75, 0.05)',
                  borderColor: isPositiveGamma ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 51, 75, 0.3)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-black text-sm tracking-wide"
                    style={{ color: gexAnalysis.regimeColor }}
                  >
                    {gexAnalysis.regimeHeadline}
                  </span>
                </div>
                <p className="text-[#cbd5e1] leading-relaxed text-xs">
                  {gexAnalysis.regimeDescription}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] border-t border-white/10 text-[#8b9bb4]">
                  <div>
                    <span>Dealer Volatility Effect: </span>
                    <strong className="text-white">{gexAnalysis.volatilityForecast}</strong>
                  </div>
                  <div>
                    <span>Dealer Hedging Impact: </span>
                    <strong className="text-white">{gexAnalysis.dealerBehaviorSummary}</strong>
                  </div>
                </div>
              </div>

              {/* Interactive Dealer Hedging Flow Simulator */}
              <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Sliders className="w-3.5 h-3.5 text-[#ffd600]" />
                    <span>DEALER DELTA HEDGING FLOW SIMULATOR</span>
                  </div>
                  <span className="text-[10px] text-[#8b9bb4]">
                    Estimated program buying / selling by market makers
                  </span>
                </div>

                <div className="bg-[#0b0f19] border border-[#141b2a] rounded p-3 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b9bb4]">Simulate Underlying Spot Price Move:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">${simulatedPrice.toFixed(2)}</span>
                      <span
                        className={`font-black px-2 py-0.5 rounded text-[10px] ${
                          simulatedMovePct > 0
                            ? 'bg-[#00e676]/20 text-[#00e676]'
                            : simulatedMovePct < 0
                            ? 'bg-[#ff334b]/20 text-[#ff334b]'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {simulatedMovePct >= 0 ? '+' : ''}
                        {simulatedMovePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={simulatedMovePct}
                    onChange={(e) => setSimulatedMovePct(parseFloat(e.target.value))}
                    className="w-full accent-[#a855f7] cursor-pointer"
                  />

                  <div className="flex justify-between text-[9px] text-[#64748b]">
                    <span>-5.0% Crash</span>
                    <span>-2.5%</span>
                    <span>0.0% Unchanged</span>
                    <span>+2.5%</span>
                    <span>+5.0% Rally</span>
                  </div>

                  {/* Simulator Result Output */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#141b2a] text-center">
                    <div className="bg-[#07090e] p-2 rounded border border-[#1e2638]">
                      <div className="text-[9px] text-[#8b9bb4]">DEALER ACTION</div>
                      <div
                        className={`text-sm font-black mt-0.5 ${
                          dealerFlowDirection === 'BUY'
                            ? 'text-[#00e676]'
                            : dealerFlowDirection === 'SELL'
                            ? 'text-[#ff334b]'
                            : 'text-[#ffd600]'
                        }`}
                      >
                        {dealerFlowDirection === 'BUY'
                          ? 'BUY SHARES (SUPPORT)'
                          : dealerFlowDirection === 'SELL'
                          ? 'SELL SHARES (PRESSURE)'
                          : 'NEUTRAL HOLD'}
                      </div>
                    </div>

                    <div className="bg-[#07090e] p-2 rounded border border-[#1e2638]">
                      <div className="text-[9px] text-[#8b9bb4]">ESTIMATED DOLLAR FLOW</div>
                      <div className="text-sm font-black text-white mt-0.5">
                        ${simulatedDollarFlowM.toFixed(1)} Million
                      </div>
                    </div>

                    <div className="bg-[#07090e] p-2 rounded border border-[#1e2638]">
                      <div className="text-[9px] text-[#8b9bb4]">MARKET CONSEQUENCE</div>
                      <div className="text-[11px] font-bold text-[#cbd5e1] mt-0.5">
                        {isPositiveGamma
                          ? simulatedMovePct === 0
                            ? 'Stable equilibrium at current spot'
                            : 'Dampens move (Mean-Reversion)'
                          : simulatedMovePct === 0
                          ? 'Breakout vulnerability elevated'
                          : 'Accelerates momentum (Expansion)'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gamma Playbook Matrix */}
              <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00e676]" />
                  <span>INSTITUTIONAL STRATEGY PLAYBOOK FOR CURRENT GAMMA REGIME</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0d1322] border border-[#1e2638] rounded p-3 space-y-1.5">
                    <div className="text-[#00e676] font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>FAVORED STRATEGIES IN POSITIVE GAMMA (+Γ)</span>
                    </div>
                    <ul className="text-[#cbd5e1] space-y-1 text-[11px]">
                      <li>• <strong>Iron Condors & Iron Butterflies:</strong> Pinning near max pain and ATM strikes delivers max theta profit.</li>
                      <li>• <strong>Covered Calls & Cash-Secured Puts:</strong> Rallies get capped by dealer selling; dips get supported by dealer buying.</li>
                      <li>• <strong>Short Strangles / Calendar Spreads:</strong> Realized volatility consistently undershoots implied volatility.</li>
                    </ul>
                  </div>

                  <div className="bg-[#0d1322] border border-[#1e2638] rounded p-3 space-y-1.5">
                    <div className="text-[#ff334b] font-bold flex items-center gap-1.5">
                      <TrendingDown className="w-3 h-3" />
                      <span>FAVORED STRATEGIES IN NEGATIVE GAMMA (-Γ)</span>
                    </div>
                    <ul className="text-[#cbd5e1] space-y-1 text-[11px]">
                      <li>• <strong>Long Straddles & Strangles:</strong> Convex gamma payoffs exploit violent directional trend velocity.</li>
                      <li>• <strong>Ratio Backspreads:</strong> Uncapped upside or downside delta acceleration when dealer hedges trigger cascade.</li>
                      <li>• <strong>Avoid Short Naked Options:</strong> Pin risk is dangerous; violent gaps will steamroll short strikes.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STRIKE GEX PROFILE (CHART & TABLE) */}
          {activeTab === 'strikes' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-[#07090e] p-1 rounded border border-[#1e2638]">
                  <span className="text-[10px] text-[#8b9bb4] px-2 font-bold">STRIKE FILTER:</span>
                  {(['near', 'all', 'calls', 'puts'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setStrikeFilter(mode)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                        strikeFilter === mode
                          ? 'bg-[#a855f7] text-white'
                          : 'text-[#8b9bb4] hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[#8b9bb4]">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-[#00e676] rounded-xs" />
                    <span>Call GEX (+Γ)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-[#ff334b] rounded-xs" />
                    <span>Put GEX (-Γ)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ffd600]" />
                    <span>Zero Flip</span>
                  </div>
                </div>
              </div>

              {/* Visual GEX Histogram */}
              <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-3 space-y-2">
                <div className="text-[10px] text-[#8b9bb4] font-bold flex justify-between">
                  <span>NET GAMMA EXPOSURE BY STRIKE ($ MILLIONS / 1% MOVE)</span>
                  <span>CURRENT SPOT: ${currentPrice.toFixed(2)}</span>
                </div>

                <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredStrikes.map((st) => {
                    const isSpotNear = Math.abs(st.strike - currentPrice) <= currentPrice * 0.005;
                    const isCallWall = st.strike === gexAnalysis.callWallStrike;
                    const isPutWall = st.strike === gexAnalysis.putWallStrike;
                    const isZeroFlipNear = Math.abs(st.strike - gexAnalysis.gammaFlipPrice) <= currentPrice * 0.008;

                    const callWidth = Math.min(100, (Math.abs(st.callGEX) / maxBarGex) * 100);
                    const putWidth = Math.min(100, (Math.abs(st.putGEX) / maxBarGex) * 100);

                    return (
                      <div
                        key={st.strike}
                        className={`flex items-center gap-2 text-[10px] py-1 px-1.5 rounded transition-all ${
                          isSpotNear
                            ? 'bg-[#141b2a] border border-[#ffd600]/50'
                            : 'hover:bg-[#0e1422]'
                        }`}
                      >
                        {/* Strike Price */}
                        <div className="w-16 shrink-0 flex items-center gap-1 font-bold">
                          <span className={isSpotNear ? 'text-[#ffd600]' : 'text-white'}>
                            ${st.strike}
                          </span>
                          {isSpotNear && <span className="text-[8px] text-[#ffd600] font-black">● SPOT</span>}
                          {isCallWall && <span className="text-[8px] text-[#00e676] font-black">CW</span>}
                          {isPutWall && <span className="text-[8px] text-[#ff334b] font-black">PW</span>}
                          {isZeroFlipNear && <span className="text-[8px] text-[#ffd600] font-black">ZF</span>}
                        </div>

                        {/* Dual Bar Representation */}
                        <div className="flex-1 flex items-center h-4 bg-[#050811] rounded overflow-hidden relative">
                          {/* Center Divider */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#1e2638] z-10" />

                          {/* Left: Put GEX (Negative) */}
                          <div className="w-1/2 flex justify-end pr-0.5">
                            <div
                              className="h-3 bg-[#ff334b]/80 rounded-l-xs flex items-center justify-end px-1 text-[8.5px] font-bold text-white"
                              style={{ width: `${putWidth}%` }}
                              title={`Put GEX: $${st.putGEX}M`}
                            >
                              {putWidth > 25 && `$${Math.abs(st.putGEX).toFixed(0)}M`}
                            </div>
                          </div>

                          {/* Right: Call GEX (Positive) */}
                          <div className="w-1/2 flex justify-start pl-0.5">
                            <div
                              className="h-3 bg-[#00e676]/80 rounded-r-xs flex items-center justify-start px-1 text-[8.5px] font-bold text-white"
                              style={{ width: `${callWidth}%` }}
                              title={`Call GEX: +$${st.callGEX}M`}
                            >
                              {callWidth > 25 && `+$${st.callGEX.toFixed(0)}M`}
                            </div>
                          </div>
                        </div>

                        {/* Net GEX numeric badge */}
                        <div className="w-20 shrink-0 text-right font-black">
                          <span
                            className={st.netGEX >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}
                          >
                            {st.netGEX >= 0 ? '+' : ''}
                            {st.netGEX.toFixed(1)}M
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Matrix Table */}
              <div className="bg-[#07090e] border border-[#1e2638] rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#0d1322] border-b border-[#141b2a] text-[#8b9bb4]">
                      <th className="py-2 px-2.5">STRIKE</th>
                      <th className="py-2 px-2.5 text-right">CALL OI</th>
                      <th className="py-2 px-2.5 text-right">PUT OI</th>
                      <th className="py-2 px-2.5 text-right">CALL Γ</th>
                      <th className="py-2 px-2.5 text-right">PUT Γ</th>
                      <th className="py-2 px-2.5 text-right">CALL GEX</th>
                      <th className="py-2 px-2.5 text-right">PUT GEX</th>
                      <th className="py-2 px-2.5 text-right font-black text-white">NET GEX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStrikes.map((s) => (
                      <tr
                        key={s.strike}
                        className={`border-b border-[#141b2a] hover:bg-[#101626] ${
                          Math.abs(s.strike - currentPrice) <= currentPrice * 0.005
                            ? 'bg-[#ffd600]/10 font-bold'
                            : ''
                        }`}
                      >
                        <td className="py-1.5 px-2.5 font-bold text-white">
                          ${s.strike}
                          {s.strike === gexAnalysis.callWallStrike && (
                            <span className="ml-1 text-[8.5px] text-[#00e676] bg-[#00e676]/20 px-1 rounded">CALL WALL</span>
                          )}
                          {s.strike === gexAnalysis.putWallStrike && (
                            <span className="ml-1 text-[8.5px] text-[#ff334b] bg-[#ff334b]/20 px-1 rounded">PUT WALL</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-[#00e676]">{s.callOI.toLocaleString()}</td>
                        <td className="py-1.5 px-2.5 text-right text-[#ff334b]">{s.putOI.toLocaleString()}</td>
                        <td className="py-1.5 px-2.5 text-right text-[#8b9bb4]">{s.callGamma.toFixed(4)}</td>
                        <td className="py-1.5 px-2.5 text-right text-[#8b9bb4]">{s.putGamma.toFixed(4)}</td>
                        <td className="py-1.5 px-2.5 text-right text-[#00e676]">+{s.callGEX.toFixed(1)}M</td>
                        <td className="py-1.5 px-2.5 text-right text-[#ff334b]">{s.putGEX.toFixed(1)}M</td>
                        <td className="py-1.5 px-2.5 text-right font-black">
                          <span className={s.netGEX >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                            {s.netGEX >= 0 ? '+' : ''}
                            {s.netGEX.toFixed(1)}M
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TERM STRUCTURE BREAKDOWN */}
          {activeTab === 'expirations' && (
            <div className="space-y-4">
              <div className="text-[11px] text-[#8b9bb4]">
                Gamma concentration by expiration tenor. Short-dated options (0DTE to 7DTE) have massive gamma curvature, driving high-frequency dealer hedging, while monthly expirations host major macro liquidity walls.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {gexAnalysis.expirations.map((exp) => (
                  <div
                    key={exp.dte}
                    className="bg-[#07090e] border border-[#1e2638] rounded-lg p-3 space-y-2 hover:border-[#a855f7]/50 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-[#141b2a] pb-1.5">
                      <div>
                        <span className="font-bold text-white text-xs">{exp.formattedDate}</span>
                        <span className="text-[10px] text-[#8b9bb4] ml-1.5">({exp.dte} DTE)</span>
                      </div>
                      <span className="text-[9.5px] font-black text-[#a855f7] bg-[#a855f7]/15 px-1.5 py-0.5 rounded">
                        {exp.percentOfTotal}% of GEX
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-[#8b9bb4]">Net GEX:</span>
                        <strong className={exp.netGEX >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                          {exp.netGEX >= 0 ? '+' : ''}
                          {exp.netGEX}M
                        </strong>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#8b9bb4]">Call GEX:</span>
                        <span className="text-[#00e676]">+{exp.callGEX}M</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#8b9bb4]">Put GEX:</span>
                        <span className="text-[#ff334b]">{exp.putGEX}M</span>
                      </div>
                      <div className="flex justify-between text-[10px] pt-1 border-t border-[#141b2a]">
                        <span className="text-[#8b9bb4]">Open Interest:</span>
                        <span className="text-white">
                          C: {(exp.callOI / 1000).toFixed(0)}k · P: {(exp.putOI / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: POSITION NET GAMMA */}
          {activeTab === 'position' && (
            <div className="space-y-4">
              <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#a855f7]" />
                    <span className="font-bold text-white text-xs">
                      YOUR POSITION CONVEXITY & NET GAMMA
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      positionGamma.gammaStatus === 'LONG_GAMMA'
                        ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                        : positionGamma.gammaStatus === 'SHORT_GAMMA'
                        ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {positionGamma.gammaStatus}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-[#0b0f19] border border-[#141b2a] rounded p-2.5">
                    <div className="text-[9px] text-[#8b9bb4]">NET GAMMA (Γ)</div>
                    <div
                      className={`text-lg font-black mt-1 ${
                        positionGamma.totalNetGamma >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                      }`}
                    >
                      {positionGamma.totalNetGamma >= 0 ? '+' : ''}
                      {positionGamma.totalNetGamma}
                    </div>
                  </div>

                  <div className="bg-[#0b0f19] border border-[#141b2a] rounded p-2.5">
                    <div className="text-[9px] text-[#8b9bb4]">DOLLAR GAMMA (1% MOVE)</div>
                    <div className="text-lg font-black text-white mt-1">
                      ${positionGamma.dollarGammaPer1Pct.toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-[#0b0f19] border border-[#141b2a] rounded p-2.5">
                    <div className="text-[9px] text-[#8b9bb4]">DELTA ACCELERATION / $1</div>
                    <div className="text-lg font-black text-[#a855f7] mt-1">
                      {positionGamma.deltaChangePerPoint >= 0 ? '+' : ''}
                      {positionGamma.deltaChangePerPoint.toFixed(3)} Δ
                    </div>
                  </div>

                  <div className="bg-[#0b0f19] border border-[#141b2a] rounded p-2.5">
                    <div className="text-[9px] text-[#8b9bb4]">PIN RISK PROFILE</div>
                    <div
                      className={`text-lg font-black mt-1 ${
                        positionGamma.pinRiskRating === 'EXTREME'
                          ? 'text-[#ff334b]'
                          : positionGamma.pinRiskRating === 'HIGH'
                          ? 'text-[#ff9900]'
                          : 'text-[#00e676]'
                      }`}
                    >
                      {positionGamma.pinRiskRating}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#0d1322] border border-[#1e2638] rounded text-xs text-[#cbd5e1] leading-relaxed">
                  {positionGamma.convexityCommentary}
                </div>

                {builderLegs.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    {onOpenRiskProfile && (
                      <button
                        onClick={() => {
                          playKeyClick();
                          onClose();
                          onOpenRiskProfile();
                        }}
                        className="px-3 py-1.5 rounded font-bold text-xs bg-[#ff9900] hover:bg-[#ffaa22] text-black flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <span>View Risk Profile Graph &gt;</span>
                      </button>
                    )}
                    {onOpenChain && (
                      <button
                        onClick={() => {
                          playKeyClick();
                          onClose();
                          onOpenChain();
                        }}
                        className="px-3 py-1.5 rounded font-bold text-xs bg-[#141b2a] hover:bg-[#1a2336] text-white border border-[#1e2638] transition-all"
                      >
                        <span>Open Options Chain &gt;</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#07090e] border-t border-[#141b2a] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8b9bb4]">
          <div className="flex items-center gap-2">
            <span>Model: Black-Scholes Second-Order Partial Derivative (d²V/dS²)</span>
            <span>·</span>
            <span>Zero Gamma Flip: <strong>${gexAnalysis.gammaFlipPrice.toFixed(2)}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="px-3 py-1 rounded bg-[#141b2a] hover:bg-[#1c263a] text-white font-bold transition-all border border-[#1e2638]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
