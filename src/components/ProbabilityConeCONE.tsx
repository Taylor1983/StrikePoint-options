import React, { useState, useMemo, useEffect } from 'react';
import { Ticker, TradeLeg, ExpirationOptionChain } from '../types/options';
import {
  calculateProbabilityConeSeries,
  calculateStrikeProbability,
  ProbabilityConePoint,
  StrikeProbabilityMetrics,
} from '../utils/blackScholes';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Sliders,
  Crosshair,
  Layers,
  Calendar,
  ShieldCheck,
  Target,
  Info,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Flame,
  Plus,
  Minus,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface ProbabilityConeCONEProps {
  ticker: Ticker;
  chain: ExpirationOptionChain;
  legs: TradeLeg[];
  onNavigateToBuilder: () => void;
  onNavigateToChain: () => void;
}

export const ProbabilityConeCONE: React.FC<ProbabilityConeCONEProps> = ({
  ticker,
  chain,
  legs,
  onNavigateToBuilder,
  onNavigateToChain,
}) => {
  const [coneHorizon, setConeHorizon] = useState<number>(180);
  const [volAdjustment, setVolAdjustment] = useState<number>(0); // +/- IV shift in percentage points
  const [show2Sigma, setShow2Sigma] = useState<boolean>(true);
  const [show3Sigma, setShow3Sigma] = useState<boolean>(true);
  const [showLegsOverlay, setShowLegsOverlay] = useState<boolean>(true);

  // Target price calculator state
  const [calcStrike, setCalcStrike] = useState<number>(() => {
    return Number((ticker.price * 1.05).toFixed(2));
  });
  const [calcDays, setCalcDays] = useState<number>(30);
  const [hoveredConePoint, setHoveredConePoint] = useState<ProbabilityConePoint | null>(null);

  // Reset vol adjustment when ticker changes
  useEffect(() => {
    setVolAdjustment(0);
  }, [ticker.symbol]);

  // Selected chain ATM IV
  const chainAtmIV = useMemo(() => {
    if (!chain || !chain.calls || chain.calls.length === 0) return ticker.currentIV;
    let closestCall = chain.calls[0];
    let minDiff = Math.abs(closestCall.strike - ticker.price);
    for (const c of chain.calls) {
      const diff = Math.abs(c.strike - ticker.price);
      if (diff < minDiff) {
        minDiff = diff;
        closestCall = c;
      }
    }
    return closestCall.iv || ticker.currentIV;
  }, [chain, ticker.price, ticker.currentIV]);

  // Current market IV in percent
  const marketIvPercent = useMemo(() => Number((ticker.currentIV * 100).toFixed(1)), [ticker.currentIV]);
  const historicalHvPercent = useMemo(() => Number((ticker.historicalVol30d * 100).toFixed(1)), [ticker.historicalVol30d]);
  const ivHvSpread = useMemo(() => Number((marketIvPercent - historicalHvPercent).toFixed(1)), [marketIvPercent, historicalHvPercent]);

  // Effective IV calculated with vol adjustment
  const effectiveIV = Math.max(0.01, ticker.currentIV + volAdjustment / 100);
  const effectiveIvPercent = Number((effectiveIV * 100).toFixed(1));
  const isIvShiftActive = Math.abs(volAdjustment) >= 0.05;

  const handleSetExactIV = (targetPercent: number) => {
    const clamped = Math.max(1, Math.min(250, targetPercent));
    const newAdj = clamped - ticker.currentIV * 100;
    setVolAdjustment(Number(newAdj.toFixed(1)));
  };

  const handleShiftIV = (deltaPts: number) => {
    playKeyClick();
    setVolAdjustment((prev) => {
      const next = prev + deltaPts;
      const nextEffective = ticker.currentIV * 100 + next;
      if (nextEffective < 1) return Number((1 - ticker.currentIV * 100).toFixed(1));
      if (nextEffective > 250) return Number((250 - ticker.currentIV * 100).toFixed(1));
      return Number(next.toFixed(1));
    });
  };

  // Generate Cone Series
  const coneSeries = useMemo(() => {
    return calculateProbabilityConeSeries(ticker.price, effectiveIV, coneHorizon);
  }, [ticker.price, effectiveIV, coneHorizon]);

  // Compute Calculator Metrics
  const strikeMetrics: StrikeProbabilityMetrics = useMemo(() => {
    return calculateStrikeProbability(ticker.price, calcStrike, calcDays, effectiveIV);
  }, [ticker.price, calcStrike, calcDays, effectiveIV]);

  // SVG dimensions
  const svgWidth = 740;
  const svgHeight = 290;
  const padding = { top: 25, right: 75, bottom: 40, left: 65 };

  // Calculate chart boundaries
  const { minPrice, maxPrice } = useMemo(() => {
    const lastPoint = coneSeries[coneSeries.length - 1];
    const top = show3Sigma ? lastPoint.upper3Sigma : show2Sigma ? lastPoint.upper2Sigma : lastPoint.upper1Sigma;
    const btm = show3Sigma ? lastPoint.lower3Sigma : show2Sigma ? lastPoint.lower2Sigma : lastPoint.lower1Sigma;

    // Check if any strategy leg is outside
    let highest = top;
    let lowest = btm;
    if (showLegsOverlay && legs.length > 0) {
      legs.forEach((l) => {
        if (l.strike > highest) highest = l.strike;
        if (l.strike < lowest) lowest = l.strike;
      });
    }

    const range = highest - lowest;
    return {
      minPrice: Math.max(1, lowest - range * 0.08),
      maxPrice: highest + range * 0.08,
    };
  }, [coneSeries, show2Sigma, show3Sigma, showLegsOverlay, legs]);

  const getX = (days: number) => {
    return (
      padding.left +
      (days / coneHorizon) * (svgWidth - padding.left - padding.right)
    );
  };

  const getY = (price: number) => {
    return (
      svgHeight -
      padding.bottom -
      ((price - minPrice) / (maxPrice - minPrice || 1)) *
        (svgHeight - padding.top - padding.bottom)
    );
  };

  // Build SVG path areas for cones
  const path1SigmaArea = useMemo(() => {
    if (coneSeries.length === 0) return '';
    let topPath = '';
    let btmPath = '';
    coneSeries.forEach((p, idx) => {
      const x = getX(p.days).toFixed(1);
      const yTop = getY(p.upper1Sigma).toFixed(1);
      const yBtm = getY(p.lower1Sigma).toFixed(1);
      topPath += `${idx === 0 ? 'M' : 'L'} ${x} ${yTop} `;
      btmPath = `L ${x} ${yBtm} ` + btmPath;
    });
    return `${topPath} ${btmPath} Z`;
  }, [coneSeries, minPrice, maxPrice]);

  const path2SigmaArea = useMemo(() => {
    if (coneSeries.length === 0) return '';
    let topPath = '';
    let btmPath = '';
    coneSeries.forEach((p, idx) => {
      const x = getX(p.days).toFixed(1);
      const yTop = getY(p.upper2Sigma).toFixed(1);
      const yBtm = getY(p.lower2Sigma).toFixed(1);
      topPath += `${idx === 0 ? 'M' : 'L'} ${x} ${yTop} `;
      btmPath = `L ${x} ${yBtm} ` + btmPath;
    });
    return `${topPath} ${btmPath} Z`;
  }, [coneSeries, minPrice, maxPrice]);

  const path3SigmaArea = useMemo(() => {
    if (coneSeries.length === 0) return '';
    let topPath = '';
    let btmPath = '';
    coneSeries.forEach((p, idx) => {
      const x = getX(p.days).toFixed(1);
      const yTop = getY(p.upper3Sigma).toFixed(1);
      const yBtm = getY(p.lower3Sigma).toFixed(1);
      topPath += `${idx === 0 ? 'M' : 'L'} ${x} ${yTop} `;
      btmPath = `L ${x} ${yBtm} ` + btmPath;
    });
    return `${topPath} ${btmPath} Z`;
  }, [coneSeries, minPrice, maxPrice]);

  const centerDriftPath = useMemo(() => {
    if (coneSeries.length === 0) return '';
    return coneSeries.reduce((acc, p, idx) => {
      const x = getX(p.days).toFixed(1);
      const y = getY(p.expectedPrice).toFixed(1);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }, '');
  }, [coneSeries, minPrice, maxPrice]);

  // Key expirations along timeline
  const keyMilestones = [
    { label: '7D', days: 7 },
    { label: '14D', days: 14 },
    { label: '30D', days: 30 },
    { label: '60D', days: 60 },
    { label: '90D', days: 90 },
    { label: '180D', days: 180 },
  ].filter((m) => m.days <= coneHorizon);

  return (
    <div className="p-3 lg:p-5 w-full max-w-7xl ml-0 mr-auto flex flex-col gap-4 font-mono text-xs">
      {/* Screen Header Bar */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#ff9900] font-black text-sm">
              {ticker.symbol} US Equity CONE
            </span>
            <span className="text-[#8b9bb4] text-[11px]">
              // PROBABILITY OF EXPIRING & EXPECTED MOVE CONE
            </span>
            <span className="bg-[#00e676]/20 text-[#00e676] px-2 py-0.5 rounded text-[10px] font-bold">
              LOG-NORMAL BSM
            </span>
          </div>
          <div className="text-[11px] text-[#8b9bb4] mt-1 flex flex-wrap items-center gap-3">
            <span>
              Spot: <strong className="text-white">${ticker.price.toFixed(2)}</strong>
            </span>
            <span>·</span>
            <span>
              Market Current IV: <strong className="text-[#00d2ff]">{marketIvPercent}%</strong>
            </span>
            <span>·</span>
            <span>
              Applied Cone IV: <strong className={isIvShiftActive ? 'text-[#ffd600] font-black' : 'text-[#00e676]'}>{effectiveIvPercent}%</strong>
              {isIvShiftActive && (
                <span className="text-[10px] ml-1 text-[#ffd600] font-bold">
                  ({volAdjustment >= 0 ? '+' : ''}{volAdjustment.toFixed(1)} pts vs Market)
                </span>
              )}
            </span>
            <span>·</span>
            <span>
              1-Year 1σ Cone Range: <strong className="text-[#ffd600]">±${(ticker.price * effectiveIV).toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Horizon toggle */}
          <div className="flex items-center bg-[#0b0f1a] border border-[#1e2638] rounded p-0.5 text-[10px]">
            {[
              { label: '60D', days: 60 },
              { label: '90D', days: 90 },
              { label: '180D', days: 180 },
            ].map((h) => (
              <button
                key={h.days}
                onClick={() => {
                  playKeyClick();
                  setConeHorizon(h.days);
                }}
                className={`px-2 py-0.5 rounded font-bold ${
                  coneHorizon === h.days ? 'bg-[#ff9900] text-black font-black' : 'text-[#8b9bb4] hover:text-white'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          {/* Sigma Band Toggles */}
          <button
            onClick={() => {
              playKeyClick();
              setShow2Sigma(!show2Sigma);
            }}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              show2Sigma
                ? 'bg-[#00d2ff]/20 text-[#00d2ff] border-[#00d2ff]/50'
                : 'bg-[#0b0f1a] text-[#8b9bb4] border-[#1e2638]'
            }`}
          >
            2σ (95.4%)
          </button>

          <button
            onClick={() => {
              playKeyClick();
              setShow3Sigma(!show3Sigma);
            }}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              show3Sigma
                ? 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/50'
                : 'bg-[#0b0f1a] text-[#8b9bb4] border-[#1e2638]'
            }`}
          >
            3σ (99.7%)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* IMPLIED VOLATILITY (IV) COMMAND & SCENARIO SHOCK ENGINE                   */}
      {/* ========================================================================= */}
      <div className="bg-[#080c14] border border-[#1e2a44] rounded-lg p-3.5 flex flex-col gap-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162035] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-xs uppercase tracking-wide">
                  IMPLIED VOLATILITY (IV) ENGINE &amp; PROBABILITY SHOCK
                </span>
                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
                  isIvShiftActive
                    ? 'bg-[#ffd600]/20 text-[#ffd600] border-[#ffd600]/40 animate-pulse'
                    : 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40'
                }`}>
                  {isIvShiftActive ? `⚡ SHOCK ACTIVE (${volAdjustment >= 0 ? '+' : ''}{volAdjustment.toFixed(1)} pts)` : '● MARKET IV PARITY'}
                </span>
              </div>
              <p className="text-[10px] text-[#64748b]">
                Current market IV is continuously factored into BSM log-normal distribution. Slide or input any target IV to simulate vol crush, spikes, or earnings expansion.
              </p>
            </div>
          </div>

          {/* Quick Reset Button */}
          {isIvShiftActive && (
            <button
              onClick={() => {
                playExecutionChime();
                setVolAdjustment(0);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ff9900]/20 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Reset IV to current live market IV"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET TO MARKET IV ({marketIvPercent}%)</span>
            </button>
          )}
        </div>

        {/* 4 Diagnostic Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Live Market Current IV */}
          <div className="bg-[#0b101d] border border-[#1e2a44] rounded p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
              <span className="font-bold uppercase">CURRENT MARKET IV</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
            </div>
            <div className="text-lg font-black text-[#00d2ff] my-0.5">
              {marketIvPercent}%
            </div>
            <div className="text-[9.5px] text-[#64748b] flex items-center justify-between">
              <span>IV Rank: <strong className="text-white">{ticker.ivRank}%</strong></span>
              <span>Pct: <strong className="text-white">{ticker.ivPercentile}%</strong></span>
            </div>
          </div>

          {/* Card 2: 30D Historical Realized Vol */}
          <div className="bg-[#0b101d] border border-[#1e2a44] rounded p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
              <span className="font-bold uppercase">REALIZED HV (30D)</span>
              <span className="text-[9px] text-[#64748b]">HISTORICAL</span>
            </div>
            <div className="text-lg font-black text-white my-0.5">
              {historicalHvPercent}%
            </div>
            <div className="text-[9.5px] flex items-center justify-between">
              <span className="text-[#64748b]">IV/HV Spread:</span>
              <span className={`font-bold ${ivHvSpread >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                {ivHvSpread >= 0 ? '+' : ''}{ivHvSpread} pts
              </span>
            </div>
          </div>

          {/* Card 3: Expiry ATM Chain IV */}
          <div className="bg-[#0b101d] border border-[#1e2a44] rounded p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
              <span className="font-bold uppercase">{chain.formattedDate || 'CHAIN'} ATM IV</span>
              <span className="text-[9px] text-[#00d2ff]">{chain.dte}D</span>
            </div>
            <div className="text-lg font-black text-[#ffd600] my-0.5">
              {(chainAtmIV * 100).toFixed(1)}%
            </div>
            <div className="text-[9.5px] text-[#64748b] flex items-center justify-between">
              <span>Expiry Cone:</span>
              <span className="text-white font-bold">±${(ticker.price * effectiveIV * Math.sqrt(Math.max(1, chain.dte) / 365)).toFixed(2)}</span>
            </div>
          </div>

          {/* Card 4: Applied Cone IV & Shock */}
          <div className={`rounded p-2.5 flex flex-col justify-between border ${
            isIvShiftActive
              ? 'bg-[#151c2c] border-[#ffd600]/60 shadow-[0_0_12px_rgba(255,214,0,0.15)]'
              : 'bg-[#0b101d] border-[#1e2a44]'
          }`}>
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase text-[#8b9bb4]">APPLIED CONE IV</span>
              <span className={`font-black text-[9px] px-1 rounded ${
                isIvShiftActive ? 'bg-[#ffd600]/20 text-[#ffd600]' : 'bg-[#00e676]/20 text-[#00e676]'
              }`}>
                {isIvShiftActive ? `${volAdjustment >= 0 ? '+' : ''}${volAdjustment.toFixed(1)} pts` : 'PARITY'}
              </span>
            </div>
            <div className="text-lg font-black text-white my-0.5 flex items-baseline gap-1.5">
              <span className={isIvShiftActive ? 'text-[#ffd600]' : 'text-[#00e676]'}>
                {effectiveIvPercent}%
              </span>
              {isIvShiftActive && (
                <span className="text-[10px] text-[#8b9bb4] font-normal">
                  (was {marketIvPercent}%)
                </span>
              )}
            </div>
            <div className="text-[9.5px] text-[#64748b] flex items-center justify-between">
              <span>1Y 1σ StDev:</span>
              <span className="text-white font-bold">±${(ticker.price * effectiveIV).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Interactive Slider & Stepper Controls */}
        <div className="bg-[#050810] border border-[#162035] rounded p-2.5 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff9900]" />
              <span className="text-white font-bold text-xs">ADJUST CONE IMPLIED VOLATILITY:</span>
              <span className="text-[11px] font-black text-[#ffd600] bg-[#ffd600]/10 px-2 py-0.5 rounded border border-[#ffd600]/30 font-mono">
                {effectiveIvPercent}%
              </span>
              {isIvShiftActive && (
                <span className={`text-[10px] font-bold ${volAdjustment > 0 ? 'text-[#00e676]' : 'text-[#38bdf8]'}`}>
                  ({volAdjustment > 0 ? '+' : ''}{volAdjustment.toFixed(1)}% shift from market)
                </span>
              )}
            </div>

            {/* Direct Number Input & Stepper Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8b9bb4]">DIRECT ENTRY:</span>
              <div className="flex items-center bg-[#0b101c] border border-[#222d44] rounded px-1.5 py-0.5">
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="250"
                  value={effectiveIvPercent}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) handleSetExactIV(val);
                  }}
                  className="bg-transparent border-none outline-none text-white font-bold w-14 font-mono text-xs text-right"
                />
                <span className="text-[#8b9bb4] font-bold ml-0.5">%</span>
              </div>

              {/* Step Buttons */}
              <div className="flex items-center gap-0.5 bg-[#0b101c] border border-[#222d44] rounded p-0.5 text-[10px]">
                <button
                  onClick={() => handleShiftIV(-5)}
                  className="px-1.5 py-0.5 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1e2a44] font-bold cursor-pointer"
                  title="Decrease IV by 5%"
                >
                  -5%
                </button>
                <button
                  onClick={() => handleShiftIV(-1)}
                  className="px-1.5 py-0.5 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1e2a44] font-bold cursor-pointer"
                  title="Decrease IV by 1%"
                >
                  -1%
                </button>
                <button
                  onClick={() => handleShiftIV(1)}
                  className="px-1.5 py-0.5 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1e2a44] font-bold cursor-pointer"
                  title="Increase IV by 1%"
                >
                  +1%
                </button>
                <button
                  onClick={() => handleShiftIV(5)}
                  className="px-1.5 py-0.5 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1e2a44] font-bold cursor-pointer"
                  title="Increase IV by 5%"
                >
                  +5%
                </button>
              </div>
            </div>
          </div>

          {/* Range Slider */}
          <div className="relative pt-1 pb-1">
            <input
              type="range"
              min="5"
              max="150"
              step="0.5"
              value={effectiveIvPercent}
              onChange={(e) => handleSetExactIV(parseFloat(e.target.value))}
              className="w-full accent-[#ffd600] h-2 bg-[#141d2e] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#64748b] mt-1 font-mono">
              <span>5% (Ultra Low Vol)</span>
              <button
                onClick={() => handleSetExactIV(Math.max(5, marketIvPercent - 20))}
                className="hover:text-white cursor-pointer"
              >
                -20% Shock ({Math.max(5, marketIvPercent - 20).toFixed(0)}%)
              </button>
              <button
                onClick={() => {
                  playKeyClick();
                  setVolAdjustment(0);
                }}
                className="text-[#00d2ff] font-bold hover:underline cursor-pointer"
              >
                ▲ MARKET IV ({marketIvPercent}%)
              </button>
              <button
                onClick={() => handleSetExactIV(marketIvPercent + 25)}
                className="hover:text-white cursor-pointer"
              >
                +25% Spike ({(marketIvPercent + 25).toFixed(0)}%)
              </button>
              <span>150% (Extreme Event)</span>
            </div>
          </div>

          {/* Quick Scenario Shock Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#121929]">
            <span className="text-[10px] text-[#8b9bb4] font-bold uppercase mr-1">SCENARIO PRESETS:</span>
            
            <button
              onClick={() => {
                playExecutionChime();
                setVolAdjustment(0);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                !isIvShiftActive
                  ? 'bg-[#00e676] text-black border-[#00e676]'
                  : 'bg-[#101726] text-[#cbd5e1] border-[#1e2a44] hover:bg-[#1e2a44]'
              }`}
              title="Reset to current market implied volatility"
            >
              ⚡ RESET (MKT {marketIvPercent}%)
            </button>

            <button
              onClick={() => {
                playKeyClick();
                handleSetExactIV(historicalHvPercent);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                effectiveIvPercent === historicalHvPercent
                  ? 'bg-[#00d2ff] text-black border-[#00d2ff]'
                  : 'bg-[#101726] text-[#00d2ff] border-[#00d2ff]/30 hover:bg-[#00d2ff]/20'
              }`}
              title="Model cone using 30-day historical realized volatility"
            >
              HV30 REALIZED ({historicalHvPercent}%)
            </button>

            <button
              onClick={() => {
                playKeyClick();
                handleSetExactIV(Number((chainAtmIV * 100).toFixed(1)));
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] text-[#ffd600] border border-[#ffd600]/30 hover:bg-[#ffd600]/20 transition-all cursor-pointer"
              title="Model cone using active chain ATM implied volatility"
            >
              EXPIRY ATM ({(chainAtmIV * 100).toFixed(1)}%)
            </button>

            <button
              onClick={() => handleShiftIV(-20)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/20 transition-all cursor-pointer"
              title="Post-earnings implied volatility crush scenario (-20 pts)"
            >
              -20% VOL CRUSH
            </button>

            <button
              onClick={() => handleShiftIV(-10)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] text-[#38bdf8] border border-[#38bdf8]/30 hover:bg-[#38bdf8]/20 transition-all cursor-pointer"
              title="Volatility squeeze / contraction (-10 pts)"
            >
              -10% SQUEEZE
            </button>

            <button
              onClick={() => handleShiftIV(10)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] text-[#ff9900] border border-[#ff9900]/30 hover:bg-[#ff9900]/20 transition-all cursor-pointer"
              title="Bid expansion (+10 pts)"
            >
              +10% EXPANSION
            </button>

            <button
              onClick={() => handleShiftIV(25)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] text-[#ff9900] border border-[#ff9900]/30 hover:bg-[#ff9900]/20 transition-all cursor-pointer"
              title="Major event / FOMC / CPI risk spike (+25 pts)"
            >
              +25% EVENT SPIKE
            </button>

            <button
              onClick={() => handleShiftIV(50)}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#101726] text-[#ff334b] border border-[#ff334b]/30 hover:bg-[#ff334b]/20 transition-all cursor-pointer"
              title="Extreme tail risk / geopolitical volatility explosion (+50 pts)"
            >
              +50% DEFCON SHOCK
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: SVG Probability Cone (Left 8 cols) + Instant Calculator (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: SVG Probability Cone Diagram */}
        <div className="lg:col-span-8 bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl flex flex-col justify-between">
          <div className="bg-[#090d16] px-4 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white uppercase text-xs">
                Forward Probability Cone Envelope
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-[#ff9900]/40 border border-[#ff9900] rounded-xs" />
                  <span className="text-[#e2e8f0]">1σ (68.3%)</span>
                </div>
                {show2Sigma && (
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-[#00d2ff]/20 border border-[#00d2ff] rounded-xs" />
                    <span className="text-[#8b9bb4]">2σ (95.5%)</span>
                  </div>
                )}
                {show3Sigma && (
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-[#ffd600]/10 border border-[#ffd600]/60 rounded-xs" />
                    <span className="text-[#8b9bb4]">3σ (99.7%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hovered point readout */}
            {hoveredConePoint ? (
              <div className="text-[11px] bg-[#0c101c] px-2 py-0.5 rounded border border-[#1e2638] text-white">
                <span className="text-[#ff9900] font-bold">{hoveredConePoint.days}D</span>: ±$
                {hoveredConePoint.expectedMoveDollar.toFixed(2)} (±
                {hoveredConePoint.expectedMovePercent}%) · 1σ [${hoveredConePoint.lower1Sigma} – $
                {hoveredConePoint.upper1Sigma}]
              </div>
            ) : (
              <div className="text-[10px] text-[#64748b]">Hover over cone to inspect expected moves</div>
            )}
          </div>

          {/* SVG Viewport */}
          <div className="relative p-2 bg-[#05070a] select-none">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-72 cursor-crosshair select-none"
              onMouseLeave={() => setHoveredConePoint(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const svgX = (mouseX / rect.width) * svgWidth;
                const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / (svgWidth - padding.left - padding.right)));
                const daysAtCursor = ratio * coneHorizon;

                // Find closest point in series
                let closest = coneSeries[0];
                let minDiff = Infinity;
                coneSeries.forEach((p) => {
                  const diff = Math.abs(p.days - daysAtCursor);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closest = p;
                  }
                });
                setHoveredConePoint(closest);
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const svgX = (mouseX / rect.width) * svgWidth;
                const svgY = (mouseY / rect.height) * svgHeight;

                const daysRatio = Math.max(0, Math.min(1, (svgX - padding.left) / (svgWidth - padding.left - padding.right)));
                const clickedDays = Math.max(1, Math.round(daysRatio * coneHorizon));

                const priceRatio = (svgHeight - padding.bottom - svgY) / (svgHeight - padding.top - padding.bottom);
                const clickedPrice = Number((minPrice + priceRatio * (maxPrice - minPrice)).toFixed(2));

                playKeyClick();
                setCalcDays(clickedDays);
                setCalcStrike(clickedPrice);
              }}
            >
              <defs>
                {/* 1 Sigma Glowing Gradient */}
                <linearGradient id="coneGrad1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ff9900" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#ff9900" stopOpacity="0.15" />
                </linearGradient>

                {/* 2 Sigma Gradient */}
                <linearGradient id="coneGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.08" />
                </linearGradient>

                {/* 3 Sigma Gradient */}
                <linearGradient id="coneGrad3" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ffd600" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ffd600" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {/* Price Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const p = minPrice + (maxPrice - minPrice) * pct;
                const y = getY(p);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#141c2c"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={svgWidth - padding.right + 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                    >
                      ${p.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Expiration Milestone Vertical Lines */}
              {keyMilestones.map((m) => {
                const x = getX(m.days);
                return (
                  <g key={m.days}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={svgHeight - padding.bottom}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={x}
                      y={svgHeight - padding.bottom + 16}
                      fill="#8b9bb4"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}

              {/* Outer 3-Sigma Cone (99.73%) */}
              {show3Sigma && (
                <path
                  d={path3SigmaArea}
                  fill="url(#coneGrad3)"
                  stroke="#ffd600"
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  strokeDasharray="4 2"
                />
              )}

              {/* Middle 2-Sigma Cone (95.45%) */}
              {show2Sigma && (
                <path
                  d={path2SigmaArea}
                  fill="url(#coneGrad2)"
                  stroke="#00d2ff"
                  strokeWidth="1.2"
                  strokeOpacity="0.7"
                />
              )}

              {/* Inner 1-Sigma Cone (68.27%) */}
              <path
                d={path1SigmaArea}
                fill="url(#coneGrad1)"
                stroke="#ff9900"
                strokeWidth="2"
              />

              {/* Center Mean Drift Line */}
              <path
                d={centerDriftPath}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Current Spot Price Marker */}
              {(() => {
                const ySpot = getY(ticker.price);
                return (
                  <g>
                    <circle cx={padding.left} cy={ySpot} r="4" fill="#ff9900" stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      x={padding.left - 8}
                      y={ySpot + 3}
                      fill="#ff9900"
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      ${ticker.price.toFixed(2)}
                    </text>
                  </g>
                );
              })()}

              {/* Active Strategy Legs Overlay */}
              {showLegsOverlay &&
                legs.map((leg) => {
                  const legY = getY(leg.strike);
                  const isStock = leg.type === 'stock';
                  const isCall = leg.type === 'call';
                  const strokeColor = isStock ? '#00d2ff' : isCall ? '#00e676' : '#ff334b';
                  const labelText = isStock
                    ? `${leg.action.toUpperCase()} 100 SH @ $${leg.strike}`
                    : `${leg.action.toUpperCase()} $${leg.strike} ${leg.type.toUpperCase()}`;

                  return (
                    <g key={leg.id}>
                      <line
                        x1={padding.left}
                        y1={legY}
                        x2={svgWidth - padding.right}
                        y2={legY}
                        stroke={strokeColor}
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                      <rect
                        x={padding.left + 5}
                        y={legY - 9}
                        width={isStock ? 130 : 85}
                        height="16"
                        fill="#0b0f1a"
                        stroke={strokeColor}
                        strokeWidth="1"
                        rx="2"
                      />
                      <text
                        x={padding.left + 8}
                        y={legY + 3}
                        fill={strokeColor}
                        fontSize="9"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        {labelText}
                      </text>
                    </g>
                  );
                })}

              {/* Target Calculator Crosshair */}
              {(() => {
                const targetX = getX(calcDays);
                const targetY = getY(calcStrike);
                return (
                  <g>
                    <line
                      x1={targetX}
                      y1={padding.top}
                      x2={targetX}
                      y2={svgHeight - padding.bottom}
                      stroke="#ffd600"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <line
                      x1={padding.left}
                      y1={targetY}
                      x2={svgWidth - padding.right}
                      y2={targetY}
                      stroke="#ffd600"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle cx={targetX} cy={targetY} r="5" fill="#ffd600" stroke="#000000" strokeWidth="2" />
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Cone Timeline Summary Bar */}
          <div className="bg-[#090d16] border-t border-[#1e2638] p-2.5 flex flex-wrap items-center justify-between text-[11px] text-[#8b9bb4]">
            <div className="flex items-center gap-4">
              <span>
                30D Expected Move: <strong className="text-white">±${(ticker.price * effectiveIV * Math.sqrt(30 / 365)).toFixed(2)}</strong> (±{(effectiveIV * Math.sqrt(30 / 365) * 100).toFixed(1)}%)
              </span>
              <span>·</span>
              <span>
                90D Expected Move: <strong className="text-white">±${(ticker.price * effectiveIV * Math.sqrt(90 / 365)).toFixed(2)}</strong> (±{(effectiveIV * Math.sqrt(90 / 365) * 100).toFixed(1)}%)
              </span>
            </div>

            <div className="text-[10px] text-[#64748b]">
              Click anywhere on chart to reposition target probe
            </div>
          </div>
        </div>

        {/* Right: Instant Probability Calculator */}
        <div className="lg:col-span-4 bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl flex flex-col justify-between p-4">
          <div className="flex items-center gap-2 border-b border-[#1e2638] pb-3 mb-3">
            <Target className="w-4 h-4 text-[#ffd600]" />
            <span className="font-bold text-white text-xs uppercase">
              Strike Probability Calculator
            </span>
          </div>

          {/* Interactive Inputs */}
          <div className="flex flex-col gap-3">
            {/* Target Strike Input */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[#8b9bb4] text-[10px] uppercase font-bold">
                <span>Target Strike Price:</span>
                <span className={calcStrike >= ticker.price ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                  {calcStrike >= ticker.price ? '+' : ''}{strikeMetrics.percentMove}%
                </span>
              </div>
              <div className="flex items-center bg-[#0b0f1a] border border-[#222d44] rounded px-2 py-1">
                <span className="text-[#ff9900] font-bold mr-1">$</span>
                <input
                  type="number"
                  step="0.5"
                  value={calcStrike}
                  onChange={(e) => setCalcStrike(parseFloat(e.target.value) || ticker.price)}
                  className="bg-transparent border-none outline-none text-white font-bold w-full font-mono text-xs"
                />
              </div>
              <input
                type="range"
                min={ticker.price * 0.7}
                max={ticker.price * 1.3}
                step="0.5"
                value={calcStrike}
                onChange={(e) => setCalcStrike(parseFloat(e.target.value))}
                className="w-full accent-[#ffd600] h-1.5 bg-[#141b28] rounded cursor-pointer mt-1"
              />
            </div>

            {/* Target Days to Expiration Input */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[#8b9bb4] text-[10px] uppercase font-bold">
                <span>Expiration Horizon:</span>
                <span className="text-[#00d2ff] font-bold">{calcDays} Days</span>
              </div>
              <input
                type="range"
                min="1"
                max={coneHorizon}
                value={calcDays}
                onChange={(e) => setCalcDays(parseInt(e.target.value, 10))}
                className="w-full accent-[#00d2ff] h-1.5 bg-[#141b28] rounded cursor-pointer mt-1"
              />
            </div>

            {/* Probability Output Dashboard */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e2638]">
              {/* Expiring Above */}
              <div className="bg-[#0b0f1a] p-2.5 rounded border border-[#1e2638]">
                <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">P(Expiring Above)</div>
                <div className="text-xl font-black text-[#00e676]">
                  {strikeMetrics.probExpiringAbove}%
                </div>
                <div className="text-[9px] text-[#64748b]">ITM Call / OTM Put</div>
              </div>

              {/* Expiring Below */}
              <div className="bg-[#0b0f1a] p-2.5 rounded border border-[#1e2638]">
                <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">P(Expiring Below)</div>
                <div className="text-xl font-black text-[#ff334b]">
                  {strikeMetrics.probExpiringBelow}%
                </div>
                <div className="text-[9px] text-[#64748b]">ITM Put / OTM Call</div>
              </div>

              {/* Probability of Touch */}
              <div className="bg-[#0b0f1a] p-2.5 rounded border border-[#1e2638]">
                <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">P(Touch Before Exp)</div>
                <div className="text-xl font-black text-[#ffd600]">
                  {strikeMetrics.probOfTouch}%
                </div>
                <div className="text-[9px] text-[#64748b]">Intraday boundary breach</div>
              </div>

              {/* Distance in Sigma */}
              <div className="bg-[#0b0f1a] p-2.5 rounded border border-[#1e2638]">
                <div className="text-[10px] text-[#8b9bb4] uppercase font-bold">Distance (Z-Score)</div>
                <div className="text-xl font-black text-[#00d2ff]">
                  {strikeMetrics.standardDeviations > 0 ? '+' : ''}
                  {strikeMetrics.standardDeviations}σ
                </div>
                <div className="text-[9px] text-[#64748b]">Standard deviations</div>
              </div>
            </div>

            {/* Quick Strategy Suggestion based on Probability */}
            <div className="bg-[#0b0f1a] p-2.5 rounded border border-[#222d44] text-[11px] leading-relaxed">
              <span className="text-[#ff9900] font-bold">QUANT REGIME: </span>
              {strikeMetrics.standardDeviations >= 1.5 ? (
                <span className="text-[#cbd5e1]">
                  Strike ${calcStrike} sits beyond the 1.5σ boundary ({strikeMetrics.probExpiringAbove}% chance of being exceeded). High probability location for credit spread or Iron Condor short wings.
                </span>
              ) : strikeMetrics.standardDeviations <= -1.5 ? (
                <span className="text-[#cbd5e1]">
                  Strike ${calcStrike} sits below the -1.5σ downside boundary ({strikeMetrics.probExpiringBelow}% chance). Favorable zone for cash-secured put selling or bull put credit spreads.
                </span>
              ) : (
                <span className="text-[#cbd5e1]">
                  Strike ${calcStrike} is inside the 1σ primary expected move cone. High gamma and delta sensitivity zone.
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-[#1e2638]">
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToChain();
              }}
              className="flex-1 py-1.5 bg-[#141b28] hover:bg-[#ff9900] text-[#cbd5e1] hover:text-black font-bold rounded text-center transition-colors border border-[#222d44]"
            >
              VIEW ON OMON
            </button>
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToBuilder();
              }}
              className="flex-1 py-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-black rounded text-center transition-all shadow-md"
            >
              PRICE IN OVME
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Expiration Cone Matrix Table */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl">
        <div className="bg-[#090d16] px-4 py-2 border-b border-[#1e2638] flex items-center justify-between text-[11px]">
          <span className="font-bold text-white uppercase">
            Institutional Expiration Probability Bands Table
          </span>
          <span className="text-[#8b9bb4]">
            Term structure calculated with Black-Scholes square root of time $\sqrt{'{'}t{'}'}$ scaling
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-[#0b0f1a] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                <th className="py-2.5 px-3">Horizon (DTE)</th>
                <th className="py-2.5 px-3">Target Date</th>
                <th className="py-2.5 px-3 text-right">Expected Move ($)</th>
                <th className="py-2.5 px-3 text-right">Expected Move (%)</th>
                <th className="py-2.5 px-3 text-center text-[#ff9900]">1σ Range (68.3%)</th>
                <th className="py-2.5 px-3 text-center text-[#00d2ff]">2σ Range (95.5%)</th>
                <th className="py-2.5 px-3 text-center text-[#ffd600]">3σ Range (99.7%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b28]">
              {coneSeries
                .filter((p) => [7, 14, 21, 30, 45, 60, 90, 120, 180].includes(p.days))
                .map((row) => (
                  <tr key={row.days} className="hover:bg-[#121929] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {row.days} Days to Exp
                    </td>
                    <td className="py-2.5 px-3 text-[#8b9bb4]">{row.dateStr}</td>
                    <td className="py-2.5 px-3 text-right font-black text-white">
                      ±${row.expectedMoveDollar.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#ffd600]">
                      ±{row.expectedMovePercent}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#ff9900]">
                      ${row.lower1Sigma.toFixed(2)} – ${row.upper1Sigma.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#00d2ff]">
                      ${row.lower2Sigma.toFixed(2)} – ${row.upper2Sigma.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#ffd600]">
                      ${row.lower3Sigma.toFixed(2)} – ${row.upper3Sigma.toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
