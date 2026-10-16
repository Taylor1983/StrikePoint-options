import React, { useState, useMemo } from 'react';
import { Ticker, Candle, ExpirationOptionChain } from '../types/options';
import { playKeyClick } from '../utils/terminalSound';
import {
  TrendingUp,
  BarChart2,
  Activity,
  Layers,
  Sliders,
  Check,
  ChevronDown,
  Info,
  Maximize2,
  Zap,
  Target,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Calendar,
  Flag,
  Flame,
  Globe,
  Scale,
  Landmark,
  Percent,
} from 'lucide-react';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateKeltnerChannels,
  calculateTTMSqueeze,
  calculateVWAP,
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateSupertrend,
  calculateDonchianChannels,
  calculateParabolicSAR,
  calculateOBV,
  calculatePivotPoints,
  detectCandlestickPatterns,
  calculateQuantitativeSignalMatrix,
  IndicatorScoreCard,
  calculateIVHVStudy,
} from '../utils/technicalIndicators';
import { calculateChainPCR } from '../utils/putCallRatioAnalytics';
import { MACRO_EVENTS_DATA, MacroEvent, findMacroEventsForCandle } from '../services/macroEvents';
import {
  calculateMarginDebtSeries,
  HISTORICAL_MARGIN_DEBT_BENCHMARKS,
  MONTHLY_MARGIN_DEBT_HISTORY,
  MarginDebtStudyResult,
} from '../services/marginDebtData';
import {
  EarningsReport,
  findEarningsForCandle,
  getUpcomingEarnings,
  getEarningsSummaryStats,
  getEarningsForTicker,
} from '../services/earningsData';

interface TechnicalsChartProps {
  ticker: Ticker;
  chain?: ExpirationOptionChain;
  allChains?: ExpirationOptionChain[];
  onNavigateToHIVG?: () => void;
  onNavigateToOMON?: () => void;
  onNavigateToPCR?: () => void;
}

type TimeframeOption = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
type SubChartType = 'RSI' | 'MACD' | 'STOCH' | 'ADX' | 'ATR' | 'OBV' | 'SQUEEZE' | 'VOLUME' | 'VOLATILITY' | 'MARGIN_DEBT';

export const TechnicalsChart: React.FC<TechnicalsChartProps> = ({
  ticker,
  chain,
  allChains,
  onNavigateToHIVG,
  onNavigateToOMON,
  onNavigateToPCR,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('3M');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [subChart, setSubChart] = useState<SubChartType>('RSI');
  const [showTechoModal, setShowTechoModal] = useState<boolean>(false);
  const [showMarginDebtModal, setShowMarginDebtModal] = useState<boolean>(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState<boolean>(false);
  const [hoveredMacroEvent, setHoveredMacroEvent] = useState<MacroEvent | null>(null);
  const [selectedMacroEvent, setSelectedMacroEvent] = useState<MacroEvent | null>(null);
  const [hoveredEarnings, setHoveredEarnings] = useState<EarningsReport | null>(null);
  const [selectedEarnings, setSelectedEarnings] = useState<EarningsReport | null>(null);

  // Overlay Indicators toggles
  const [overlays, setOverlays] = useState<{
    sma20: boolean;
    sma50: boolean;
    sma200: boolean;
    ema9: boolean;
    ema21: boolean;
    bollinger: boolean;
    vwap: boolean;
    supertrend: boolean;
    donchian: boolean;
    sar: boolean;
    pivots: boolean;
    optionsLevels: boolean;
    stdDev1: boolean;
    stdDev2: boolean;
    stdDev3: boolean;
    macroEvents: boolean;
    marginDebt: boolean;
    earnings: boolean;
    impliedVol: boolean;
  }>({
    sma20: true,
    sma50: true,
    sma200: false,
    ema9: false,
    ema21: false,
    bollinger: true,
    vwap: false,
    supertrend: false,
    donchian: false,
    sar: false,
    pivots: false,
    optionsLevels: true,
    stdDev1: true,
    stdDev2: true,
    stdDev3: true,
    macroEvents: true,
    marginDebt: false,
    earnings: true,
    impliedVol: true,
  });

  const toggleOverlay = (key: keyof typeof overlays) => {
    playKeyClick();
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Full raw candle list
  const rawCandles = ticker.candles;

  // Filter candles based on timeframe
  const candles = useMemo(() => {
    if (timeframe === '1D') return rawCandles.slice(-12);
    if (timeframe === '5D') return rawCandles.slice(-22);
    if (timeframe === '1M') return rawCandles.slice(-32);
    if (timeframe === '3M') return rawCandles.slice(-65);
    if (timeframe === '6M') return rawCandles.slice(-130);
    if (timeframe === '1Y') return rawCandles.slice(-252);
    return rawCandles;
  }, [rawCandles, timeframe]);

  // Derive Options Context (Max Pain, Walls, 1σ, 2σ, 3σ Expected Moves)
  const optionsContext = useMemo(() => {
    const dte = chain ? Math.max(1, chain.dte) : 30;
    const atmIv = chain ? chain.avgIV : (ticker.currentIV || 0.25);
    const metrics = chain ? calculateChainPCR(chain, ticker.price) : { pcrVolume: 0.85 };

    // Expected Move (1σ) = S * IV * sqrt(DTE / 365)
    const expectedMove = ticker.price * atmIv * Math.sqrt(dte / 365);
    const expectedMove2 = expectedMove * 2;
    const expectedMove3 = expectedMove * 3;

    let maxCallOI = -1;
    let callWall = Number((ticker.price * 1.05).toFixed(2));
    let maxPutOI = -1;
    let putWall = Number((ticker.price * 0.95).toFixed(2));
    let maxPain = ticker.price;

    if (chain) {
      chain.calls.forEach((c) => {
        if (c.openInterest > maxCallOI) {
          maxCallOI = c.openInterest;
          callWall = c.strike;
        }
      });
      chain.puts.forEach((p) => {
        if (p.openInterest > maxPutOI) {
          maxPutOI = p.openInterest;
          putWall = p.strike;
        }
      });

      const allStrikes = Array.from(
        new Set([...chain.calls.map((c) => c.strike), ...chain.puts.map((p) => p.strike)])
      ).sort((a, b) => a - b);

      let minPain = Infinity;
      allStrikes.forEach((testK) => {
        let loss = 0;
        chain.calls.forEach((c) => {
          if (testK > c.strike) loss += (testK - c.strike) * c.openInterest;
        });
        chain.puts.forEach((p) => {
          if (testK < p.strike) loss += (p.strike - testK) * p.openInterest;
        });
        if (loss < minPain) {
          minPain = loss;
          maxPain = testK;
        }
      });
    }

    return {
      maxPain,
      callWall,
      putWall,
      expectedUpper: Number((ticker.price + expectedMove).toFixed(2)),
      expectedLower: Number((ticker.price - expectedMove).toFixed(2)),
      expectedUpper1: Number((ticker.price + expectedMove).toFixed(2)),
      expectedLower1: Number((ticker.price - expectedMove).toFixed(2)),
      expectedUpper2: Number((ticker.price + expectedMove2).toFixed(2)),
      expectedLower2: Number((ticker.price - expectedMove2).toFixed(2)),
      expectedUpper3: Number((ticker.price + expectedMove3).toFixed(2)),
      expectedLower3: Number((ticker.price - expectedMove3).toFixed(2)),
      expectedMove: Number(expectedMove.toFixed(2)),
      expectedMove2: Number(expectedMove2.toFixed(2)),
      expectedMove3: Number(expectedMove3.toFixed(2)),
      pcrVolume: metrics.pcrVolume,
      sentiment: metrics.pcrVolume < 0.8 ? 'BULLISH' : metrics.pcrVolume > 1.1 ? 'BEARISH' : 'NEUTRAL',
      dte,
      atmIv,
    };
  }, [chain, ticker.price, ticker.currentIV]);

  // Implied Volatility vs Historical Volatility Analysis Study
  const volatilityStudy = useMemo(() => {
    return calculateIVHVStudy(candles, ticker.currentIV || 0.25);
  }, [candles, ticker.currentIV]);

  // FINRA Margin Debt & Leverage (% of GDP) Macro Technical Study
  const marginDebtStudy = useMemo(() => {
    return calculateMarginDebtSeries(candles);
  }, [candles]);

  // Macro Events intersecting the current candle window
  const macroEventsInWindow = useMemo(() => {
    const results: { event: MacroEvent; candleIndex: number; candle: Candle }[] = [];
    candles.forEach((c, idx) => {
      const matched = findMacroEventsForCandle(c.time);
      matched.forEach((evt) => {
        results.push({ event: evt, candleIndex: idx, candle: c });
      });
    });
    return results;
  }, [candles]);

  // Corporate Earnings intersecting the active candle window
  const earningsInWindow = useMemo(() => {
    const results: { report: EarningsReport; candleIndex: number; candle: Candle }[] = [];
    candles.forEach((c, idx) => {
      const matched = findEarningsForCandle(c.time, ticker.symbol);
      if (matched) {
        results.push({ report: matched, candleIndex: idx, candle: c });
      }
    });
    return results;
  }, [candles, ticker.symbol]);

  // Upcoming earnings catalyst for the symbol
  const upcomingEarnings = useMemo(() => {
    return getUpcomingEarnings(ticker.symbol);
  }, [ticker.symbol]);

  // Institutional earnings statistics
  const earningsStats = useMemo(() => {
    return getEarningsSummaryStats(
      ticker.symbol,
      ticker.daysToEarnings,
      ticker.earningsDate,
      ticker.earningsEstimatedMovePct
    );
  }, [ticker.symbol, ticker.daysToEarnings, ticker.earningsDate, ticker.earningsEstimatedMovePct]);

  // Compute all technical indicators over the active candle window
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);

  const sma20 = useMemo(() => calculateSMA(closes, 20), [closes]);
  const sma50 = useMemo(() => calculateSMA(closes, 50), [closes]);
  const sma200 = useMemo(() => calculateSMA(closes, 200), [closes]);
  const ema9 = useMemo(() => calculateEMA(closes, 9), [closes]);
  const ema21 = useMemo(() => calculateEMA(closes, 21), [closes]);

  const bollinger = useMemo(() => calculateBollingerBands(candles, 20, 2.0), [candles]);
  const keltner = useMemo(() => calculateKeltnerChannels(candles, 20, 1.5), [candles]);
  const squeeze = useMemo(() => calculateTTMSqueeze(candles, bollinger, keltner), [candles, bollinger, keltner]);
  const vwap = useMemo(() => calculateVWAP(candles), [candles]);
  const donchian = useMemo(() => calculateDonchianChannels(candles, 20), [candles]);
  const supertrend = useMemo(() => calculateSupertrend(candles, 10, 3.0), [candles]);
  const sar = useMemo(() => calculateParabolicSAR(candles, 0.02, 0.2), [candles]);

  const rsi = useMemo(() => calculateRSI(candles, 14), [candles]);
  const macd = useMemo(() => calculateMACD(candles, 12, 26, 9), [candles]);
  const stoch = useMemo(() => calculateStochastic(candles, 14, 3), [candles]);
  const atr = useMemo(() => calculateATR(candles, 14), [candles]);
  const adx = useMemo(() => calculateADX(candles, 14), [candles]);
  const obv = useMemo(() => calculateOBV(candles), [candles]);
  const pivots = useMemo(() => calculatePivotPoints(candles), [candles]);
  const patterns = useMemo(() => detectCandlestickPatterns(candles), [candles]);

  // Quantitative Summary Matrix (Bloomberg TECHO consensus)
  const signalMatrix = useMemo(() => {
    return calculateQuantitativeSignalMatrix(
      candles,
      bollinger,
      keltner,
      rsi,
      macd,
      stoch,
      adx,
      supertrend,
      sar,
      sma20,
      sma50,
      sma200
    );
  }, [candles, bollinger, keltner, rsi, macd, stoch, adx, supertrend, sar, sma20, sma50, sma200]);

  // Main Chart Dimensions & Layout
  const svgWidth = 980;
  const svgHeight = 440;
  const chartPadding = { top: 28, right: 80, bottom: 25, left: 16 };
  const subChartHeight = 90;
  const mainPriceHeight = svgHeight - chartPadding.top - chartPadding.bottom - subChartHeight - 20;

  // Price Scale Bounds
  const { minPrice, maxPrice } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 0, maxPrice: 100 };
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);

    // Factor active overlays into scale so lines don't clip
    if (overlays.bollinger) {
      bollinger.lower.forEach((v) => { if (v !== null) lows.push(v); });
      bollinger.upper.forEach((v) => { if (v !== null) highs.push(v); });
    }
    if (overlays.optionsLevels && optionsContext) {
      if (overlays.stdDev1) {
        lows.push(optionsContext.expectedLower1);
        highs.push(optionsContext.expectedUpper1);
      }
      if (overlays.stdDev2) {
        lows.push(optionsContext.expectedLower2);
        highs.push(optionsContext.expectedUpper2);
      }
      if (overlays.stdDev3) {
        lows.push(optionsContext.expectedLower3);
        highs.push(optionsContext.expectedUpper3);
      }
      lows.push(optionsContext.putWall);
      highs.push(optionsContext.callWall);
    }
    if (overlays.pivots && pivots) {
      lows.push(pivots.s2);
      highs.push(pivots.r2);
    }

    const minP = Math.min(...lows) * 0.995;
    const maxP = Math.max(...highs) * 1.005;
    return { minPrice: minP, maxPrice: maxP };
  }, [candles, overlays, bollinger, optionsContext, pivots]);

  const getPriceY = (price: number) => {
    return (
      chartPadding.top +
      mainPriceHeight -
      ((price - minPrice) / (maxPrice - minPrice || 1)) * mainPriceHeight
    );
  };

  const candleSlotWidth = (svgWidth - chartPadding.left - chartPadding.right) / (candles.length || 1);
  const candleBodyWidth = Math.max(3, candleSlotWidth * 0.68);

  // Helper to generate SVG Path for numeric series
  const buildSvgPath = (series: (number | null)[]) => {
    let path = '';
    series.forEach((val, idx) => {
      if (val === null) return;
      const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
      const y = getPriceY(val);
      path += `${path === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return path;
  };

  // Dual-Axis Implied Volatility Bounds & Scaling (10% to 100%)
  const { minIvVal, maxIvVal } = useMemo(() => {
    const vals = volatilityStudy.ivSeries.filter((v): v is number => v !== null);
    if (vals.length === 0) return { minIvVal: 10, maxIvVal: 80 };
    const minI = Math.max(5, Math.floor(Math.min(...vals) * 0.85));
    const maxI = Math.ceil(Math.max(...vals) * 1.15);
    return { minIvVal: minI, maxIvVal: Math.max(maxI, minI + 15) };
  }, [volatilityStudy.ivSeries]);

  const getIvY = (ivPct: number) => {
    return (
      chartPadding.top +
      mainPriceHeight -
      ((ivPct - minIvVal) / (maxIvVal - minIvVal || 1)) * (mainPriceHeight - 20) - 10
    );
  };

  // Helper to generate SVG Path for Implied Volatility curve
  const ivOverlayPath = useMemo(() => {
    if (!overlays.impliedVol) return '';
    let path = '';
    volatilityStudy.ivSeries.forEach((val, idx) => {
      if (val === null) return;
      const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
      const y = getIvY(val);
      path += `${path === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return path;
  }, [overlays.impliedVol, volatilityStudy.ivSeries, candleSlotWidth, minIvVal, maxIvVal]);

  // Bollinger Band shaded area polygon
  const bollingerAreaPath = useMemo(() => {
    if (!overlays.bollinger) return '';
    const upperPoints: { x: number; y: number }[] = [];
    const lowerPoints: { x: number; y: number }[] = [];

    candles.forEach((_, idx) => {
      const u = bollinger.upper[idx];
      const l = bollinger.lower[idx];
      if (u !== null && l !== null) {
        const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
        upperPoints.push({ x, y: getPriceY(u) });
        lowerPoints.push({ x, y: getPriceY(l) });
      }
    });

    if (upperPoints.length === 0) return '';
    let d = `M ${upperPoints[0].x.toFixed(1)} ${upperPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < upperPoints.length; i++) {
      d += ` L ${upperPoints[i].x.toFixed(1)} ${upperPoints[i].y.toFixed(1)}`;
    }
    for (let i = lowerPoints.length - 1; i >= 0; i--) {
      d += ` L ${lowerPoints[i].x.toFixed(1)} ${lowerPoints[i].y.toFixed(1)}`;
    }
    d += ' Z';
    return d;
  }, [overlays.bollinger, bollinger, candles, candleSlotWidth, minPrice, maxPrice]);

  // Hovered candle state
  const lastIndex = candles.length - 1;
  const activeIdx = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex <= lastIndex ? hoveredIndex : lastIndex;
  const activeCandle = candles[activeIdx] || candles[lastIndex];

  // Active indicator readings at cursor
  const activeSma20 = sma20[activeIdx];
  const activeSma50 = sma50[activeIdx];
  const activeSma200 = sma200[activeIdx];
  const activeEma9 = ema9[activeIdx];
  const activeEma21 = ema21[activeIdx];
  const activeBbUpper = bollinger.upper[activeIdx];
  const activeBbLower = bollinger.lower[activeIdx];
  const activeBbPercentB = bollinger.percentB[activeIdx];
  const activeVwap = vwap.vwap[activeIdx];
  const activeSupertrend = supertrend.supertrend[activeIdx];
  const activeSupertrendDir = supertrend.trend[activeIdx];
  const activeSar = sar.sar[activeIdx];

  const activeRsi = rsi[activeIdx];
  const activeMacd = macd.macd[activeIdx];
  const activeMacdSig = macd.signal[activeIdx];
  const activeMacdHist = macd.histogram[activeIdx];
  const activeStochK = stoch.k[activeIdx];
  const activeStochD = stoch.d[activeIdx];
  const activeAdx = adx.adx[activeIdx];
  const activePdi = adx.plusDI[activeIdx];
  const activeMdi = adx.minusDI[activeIdx];
  const activeAtr = atr[activeIdx];
  const activeObv = obv[activeIdx];
  const activeSqueeze = squeeze.isSqueezed[activeIdx];

  // Sub-Chart SVG coordinates calculation
  const subChartTop = chartPadding.top + mainPriceHeight + 20;
  const subChartBottom = subChartTop + subChartHeight;

  return (
    <div className="p-3 lg:p-5 w-full max-w-full ml-0 mr-auto text-left flex flex-col gap-3 font-mono text-xs select-none">
      {/* ========================================================
          1. TOP BLOOMBERG COMMAND STRIP & HEADER
      ======================================================== */}
      <div className="bg-[#080d16] border border-[#1e2638] rounded-t-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Left: Ticker & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#ff9900] text-black font-black rounded text-xs">
              {ticker.symbol}
            </span>
            <span className="text-white font-bold text-sm hidden sm:inline">
              {ticker.name}
            </span>
            <span className="text-[#8b9bb4] text-[11px]">
              // TECHO TECHNICAL ANALYSIS WORKSTATION
            </span>
          </div>

          {/* Quick Quantitative Consensus Badge */}
          <button
            onClick={() => {
              playKeyClick();
              setShowTechoModal(true);
            }}
            className={`px-2.5 py-0.5 rounded text-[11px] font-black border transition-all flex items-center gap-1.5 ${
              signalMatrix.consensus.includes('BUY')
                ? 'bg-[#00e676]/15 border-[#00e676] text-[#00e676] hover:bg-[#00e676]/25'
                : signalMatrix.consensus.includes('SELL')
                ? 'bg-[#ff334b]/15 border-[#ff334b] text-[#ff334b] hover:bg-[#ff334b]/25'
                : 'bg-[#ffd600]/15 border-[#ffd600] text-[#ffd600] hover:bg-[#ffd600]/25'
            }`}
            title="Click to open Full Quantitative Signal Matrix (TECHO <GO>)"
          >
            <Sparkles className="w-3 h-3" />
            <span>{signalMatrix.consensus}</span>
            <span className="text-[9px] px-1 bg-black/40 rounded">
              {signalMatrix.score > 0 ? `+${signalMatrix.score}` : signalMatrix.score}/10
            </span>
          </button>
        </div>

        {/* Right: Controls & Navigation */}
        <div className="flex items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#0b0f1a] border border-[#1e2638] rounded p-0.5">
            {(['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  playKeyClick();
                  setTimeframe(tf);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  timeframe === tf
                    ? 'bg-[#ff9900] text-black'
                    : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b2a]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* TECHO Institutional Matrix Button */}
          <button
            onClick={() => {
              playKeyClick();
              setShowTechoModal(true);
            }}
            className="px-2.5 py-1 bg-[#141b2a] hover:bg-[#ff9900] text-[#ff9900] hover:text-black border border-[#ff9900]/40 rounded text-[11px] font-bold transition-all flex items-center gap-1.5"
            title="Open Bloomberg TECHO Technical Analysis Summary"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>TECHO {'<GO>'}</span>
          </button>

          {/* Volatility Bridge Buttons */}
          {onNavigateToHIVG && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToHIVG();
              }}
              className="px-2.5 py-1 bg-[#0f1422] hover:bg-[#25324d] text-[#8b9bb4] hover:text-[#00d2ff] border border-[#1e2638] rounded text-[10px] font-bold transition-all flex items-center gap-1"
              title="Historical vs Implied Volatility Chart (HIVG)"
            >
              <Activity className="w-3 h-3 text-[#00d2ff]" />
              <span className="hidden md:inline">HIVG</span>
            </button>
          )}

          {onNavigateToOMON && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToOMON();
              }}
              className="px-2.5 py-1 bg-[#0f1422] hover:bg-[#25324d] text-[#8b9bb4] hover:text-[#00e676] border border-[#1e2638] rounded text-[10px] font-bold transition-all flex items-center gap-1"
              title="Options Chain Monitor (OMON)"
            >
              <Layers className="w-3 h-3 text-[#00e676]" />
              <span className="hidden md:inline">OMON</span>
            </button>
          )}

          {onNavigateToPCR && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToPCR();
              }}
              className="px-2.5 py-1 bg-[#0f1422] hover:bg-[#25324d] text-[#8b9bb4] hover:text-[#ffd600] border border-[#1e2638] rounded text-[10px] font-bold transition-all flex items-center gap-1"
              title="Put/Call Ratio Analytics (PCR)"
            >
              <TrendingUp className="w-3 h-3 text-[#ffd600]" />
              <span className="hidden md:inline">PCR</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          2. INDICATORS OVERLAY TOGGLE BAR & LIVE READOUT
      ======================================================== */}
      <div className="bg-[#060a12] border-x border-b border-[#1e2638] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Quick Toggle Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mr-1">
            Overlays:
          </span>

          <button
            onClick={() => toggleOverlay('sma20')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              overlays.sma20
                ? 'bg-[#ffd600]/20 border-[#ffd600] text-[#ffd600]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#ffd600] inline-block" />
            <span>SMA 20</span>
          </button>

          <button
            onClick={() => toggleOverlay('sma50')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              overlays.sma50
                ? 'bg-[#00d2ff]/20 border-[#00d2ff] text-[#00d2ff]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#00d2ff] inline-block" />
            <span>SMA 50</span>
          </button>

          <button
            onClick={() => toggleOverlay('sma200')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              overlays.sma200
                ? 'bg-[#d946ef]/20 border-[#d946ef] text-[#d946ef]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#d946ef] inline-block" />
            <span>SMA 200</span>
          </button>

          <button
            onClick={() => toggleOverlay('bollinger')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              overlays.bollinger
                ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
          >
            <span className="w-2 h-2 rounded-xs border border-[#00e5ff] bg-[#00e5ff]/30 inline-block" />
            <span>BOLLINGER (20,2)</span>
          </button>

          <button
            onClick={() => toggleOverlay('vwap')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              overlays.vwap
                ? 'bg-[#ff9900]/20 border-[#ff9900] text-[#ff9900]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#ff9900] inline-block" />
            <span>VWAP</span>
          </button>

          <button
            onClick={() => toggleOverlay('supertrend')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              overlays.supertrend
                ? 'bg-[#00e676]/20 border-[#00e676] text-[#00e676]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#00e676] inline-block" />
            <span>SUPERTREND</span>
          </button>

          <button
            onClick={() => toggleOverlay('pivots')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              overlays.pivots
                ? 'bg-[#b388ff]/20 border-[#b388ff] text-[#b388ff]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
          >
            <span className="w-2 h-0.5 bg-[#b388ff] inline-block" />
            <span>PIVOTS</span>
          </button>

          {optionsContext && (
            <>
              <button
                onClick={() => toggleOverlay('stdDev1')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                  overlays.stdDev1
                    ? 'bg-[#f43f5e]/20 border-[#f43f5e] text-[#f43f5e]'
                    : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
                }`}
                title="1-Standard Deviation Expected Move Band (68.2% Probability)"
              >
                <Target className="w-2.5 h-2.5" />
                <span>±1σ (68%)</span>
              </button>

              <button
                onClick={() => toggleOverlay('stdDev2')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                  overlays.stdDev2
                    ? 'bg-[#00d2ff]/20 border-[#00d2ff] text-[#00d2ff]'
                    : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
                }`}
                title="2-Standard Deviation Expected Move Band (95.4% Probability)"
              >
                <span className="w-2 h-0.5 bg-[#00d2ff] inline-block" />
                <span>±2σ (95%)</span>
              </button>

              <button
                onClick={() => toggleOverlay('stdDev3')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                  overlays.stdDev3
                    ? 'bg-[#ffd600]/20 border-[#ffd600] text-[#ffd600]'
                    : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
                }`}
                title="3-Standard Deviation Extreme Tail Risk Band (99.7% Probability)"
              >
                <span className="w-2 h-0.5 bg-[#ffd600] inline-block" />
                <span>±3σ (99.7%)</span>
              </button>
            </>
          )}

          {/* ---------------- Implied Volatility (IV) Overlay Toggle ---------------- */}
          <button
            onClick={() => toggleOverlay('impliedVol')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              overlays.impliedVol
                ? 'bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.3)]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
            title="Show 30-Day Implied Volatility (IV) Dual-Axis Curve on Main Chart"
          >
            <Activity className="w-3 h-3 text-[#00e5ff]" />
            <span>[IV] IMPLIED VOL</span>
            <span className="text-[9px] px-1 bg-black/40 rounded font-black text-[#00e5ff]">
              {(volatilityStudy.ivSeries[activeIdx] ?? (ticker.currentIV ? ticker.currentIV * 100 : 25)).toFixed(1)}%
            </span>
          </button>

          {/* ---------------- Corporate Earnings [E] Overlay Toggle ---------------- */}
          <button
            onClick={() => toggleOverlay('earnings')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              overlays.earnings
                ? 'bg-[#fbbf24]/20 border-[#fbbf24] text-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
            title="Display Corporate Quarterly Earnings Reports & Upcoming Catalyst Projections on chart"
          >
            <Calendar className="w-3 h-3 text-[#fbbf24]" />
            <span>[E] EARNINGS</span>
            <span className="text-[9px] px-1 bg-black/40 rounded font-black text-[#fbbf24]">
              {earningsInWindow.length + (upcomingEarnings ? 1 : 0)}
            </span>
          </button>

          <button
            onClick={() => toggleOverlay('macroEvents')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              overlays.macroEvents
                ? 'bg-[#ff9900]/20 border-[#ff9900] text-[#ff9900] shadow-[0_0_8px_rgba(255,153,0,0.25)]'
                : 'bg-[#0a0f1a] border-[#1e2638] text-[#556782] hover:text-[#8b9bb4]'
            }`}
            title="Display Macro Economic Catalysts (FOMC, CPI, NFP, OPEC, GDP) on chart"
          >
            <Globe className="w-3 h-3 text-[#ff9900]" />
            <span>MACRO EVENTS</span>
            <span className="text-[9px] px-1 bg-black/40 rounded font-black text-[#ff9900]">
              {macroEventsInWindow.length}
            </span>
          </button>

          {/* Quick Sub-Chart Switcher: IV vs HV Vol */}
          <button
            onClick={() => {
              playKeyClick();
              setSubChart('VOLATILITY');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              subChart === 'VOLATILITY'
                ? 'bg-[#00e5ff] text-black border-[#00e5ff] font-black shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                : 'bg-[#0a0f1a] border-[#00e5ff]/40 text-[#00e5ff] hover:bg-[#00e5ff]/15'
            }`}
            title="Switch Sub-Chart to Institutional Implied vs Historical Volatility (IV/HV & VRP)"
          >
            <Activity className="w-3 h-3" />
            <span>IV vs HV VOL</span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
              subChart === 'VOLATILITY' ? 'bg-black text-[#00e5ff]' : 'bg-black/50 text-[#00e5ff]'
            }`}>
              {(volatilityStudy.ivSeries[activeIdx] ?? (ticker.currentIV ? ticker.currentIV * 100 : 25)).toFixed(1)}%
            </span>
          </button>

          {/* Quick Margin Debt (% of GDP) Sub-Chart & Macro Trigger */}
          <button
            onClick={() => {
              playKeyClick();
              setSubChart('MARGIN_DEBT');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
              subChart === 'MARGIN_DEBT'
                ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-[0_0_10px_rgba(255,153,0,0.4)]'
                : 'bg-[#0a0f1a] border-[#ff9900]/40 text-[#ff9900] hover:bg-[#ff9900]/15'
            }`}
            title="Switch Sub-Chart to FINRA Margin Debt and Margin Debt as % of US GDP"
          >
            <Scale className="w-3 h-3 text-[#ff9900]" />
            <span>MRGN DEBT / GDP</span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-black ${
              subChart === 'MARGIN_DEBT' ? 'bg-black text-[#ff9900]' : 'bg-black/50 text-white'
            }`}>
              {marginDebtStudy.currentPctGdp.toFixed(1)}%
            </span>
          </button>

          {/* More Indicators Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => {
                playKeyClick();
                setShowIndicatorMenu(!showIndicatorMenu);
              }}
              className="px-2 py-0.5 bg-[#0e1424] hover:bg-[#1a233a] border border-[#2d3748] text-[#8b9bb4] hover:text-white rounded text-[10px] font-bold flex items-center gap-1"
            >
              <span>MORE</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showIndicatorMenu && (
              <div className="absolute top-full left-0 mt-1 z-30 bg-[#070b14] border border-[#1e2638] rounded-md shadow-2xl p-2 w-48 flex flex-col gap-1">
                <button
                  onClick={() => toggleOverlay('ema9')}
                  className="flex items-center justify-between p-1.5 hover:bg-[#141c2c] rounded text-[11px]"
                >
                  <span className="text-[#ff9900]">EMA 9</span>
                  {overlays.ema9 && <Check className="w-3 h-3 text-[#00e676]" />}
                </button>
                <button
                  onClick={() => toggleOverlay('ema21')}
                  className="flex items-center justify-between p-1.5 hover:bg-[#141c2c] rounded text-[11px]"
                >
                  <span className="text-[#10b981]">EMA 21</span>
                  {overlays.ema21 && <Check className="w-3 h-3 text-[#00e676]" />}
                </button>
                <button
                  onClick={() => toggleOverlay('donchian')}
                  className="flex items-center justify-between p-1.5 hover:bg-[#141c2c] rounded text-[11px]"
                >
                  <span className="text-[#38bdf8]">Donchian (20)</span>
                  {overlays.donchian && <Check className="w-3 h-3 text-[#00e676]" />}
                </button>
                <button
                  onClick={() => toggleOverlay('sar')}
                  className="flex items-center justify-between p-1.5 hover:bg-[#141c2c] rounded text-[11px]"
                >
                  <span className="text-[#e2e8f0]">Parabolic SAR</span>
                  {overlays.sar && <Check className="w-3 h-3 text-[#00e676]" />}
                </button>
                <button
                  onClick={() => toggleOverlay('marginDebt')}
                  className="flex items-center justify-between p-1.5 hover:bg-[#141c2c] rounded text-[11px] border-t border-[#1e2638] mt-1 pt-1.5"
                >
                  <span className="text-[#ff9900] font-bold">Margin Debt Watermark</span>
                  {overlays.marginDebt && <Check className="w-3 h-3 text-[#00e676]" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Real-time OHLCV & Volatility / Earnings Bar HUD */}
        {activeCandle && (
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] bg-[#090e1a] px-2.5 py-1 rounded border border-[#1e2638]/70">
            <span className="text-[#ff9900] font-bold">{activeCandle.time}</span>
            <span className="text-[#8b9bb4]">
              O: <strong className="text-white">${activeCandle.open.toFixed(2)}</strong>
            </span>
            <span className="text-[#8b9bb4]">
              H: <strong className="text-[#00e676]">${activeCandle.high.toFixed(2)}</strong>
            </span>
            <span className="text-[#8b9bb4]">
              L: <strong className="text-[#ff334b]">${activeCandle.low.toFixed(2)}</strong>
            </span>
            <span className="text-[#8b9bb4]">
              C: <strong className="text-white font-black">${activeCandle.close.toFixed(2)}</strong>
            </span>
            <span className="text-[#8b9bb4]">
              Vol: <strong className="text-[#00d2ff]">{(activeCandle.volume / 1e6).toFixed(1)}M</strong>
            </span>
            {overlays.impliedVol && (
              <span className="text-[#00e5ff] font-bold">
                IV(30D): <strong>{volatilityStudy.ivSeries[activeIdx]?.toFixed(1) ?? (ticker.currentIV ? (ticker.currentIV * 100).toFixed(1) : '25.0')}%</strong>
              </span>
            )}
            {overlays.impliedVol && volatilityStudy.hv20Series[activeIdx] !== null && (
              <span className="text-[#8b9bb4]">
                HV(20D): <strong className="text-white">{volatilityStudy.hv20Series[activeIdx]?.toFixed(1)}%</strong>
              </span>
            )}
            {overlays.earnings && ticker.daysToEarnings !== null && ticker.daysToEarnings !== undefined && (
              <span className="text-[#fbbf24] font-bold bg-[#fbbf24]/10 px-1.5 py-0.2 rounded border border-[#fbbf24]/30">
                [E] {ticker.earningsDate} ({ticker.daysToEarnings}d) • ±{ticker.earningsEstimatedMovePct}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          3. MAIN SVG CHART VIEWPORT
      ======================================================== */}
      <div className="bg-[#05070a] border border-[#1e2638] rounded-b-lg overflow-hidden shadow-2xl relative">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-[480px] lg:h-[540px] select-none cursor-crosshair"
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            const relX = mouseX - chartPadding.left;
            const idx = Math.floor(relX / candleSlotWidth);
            if (idx >= 0 && idx < candles.length) {
              setHoveredIndex(idx);
            }
          }}
        >
          <defs>
            {/* Bollinger Band Shading Gradient */}
            <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.04" />
            </linearGradient>

            {/* Expected Move 1-Sigma Shading Gradient */}
            <linearGradient id="expMoveGradient1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.03" />
            </linearGradient>

            {/* Expected Move 2-Sigma Shading Gradient */}
            <linearGradient id="expMoveGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.02" />
            </linearGradient>

            {/* Expected Move 3-Sigma Shading Gradient */}
            <linearGradient id="expMoveGradient3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd600" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffd600" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* ---------------- Price Grid Lines & Labels ---------------- */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, idx) => {
            const price = minPrice + (maxPrice - minPrice) * pct;
            const y = getPriceY(price);
            return (
              <g key={idx}>
                <line
                  x1={chartPadding.left}
                  y1={y}
                  x2={svgWidth - chartPadding.right}
                  y2={y}
                  stroke="#121826"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={svgWidth - chartPadding.right + 6}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono"
                >
                  ${price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* ---------------- Options Expected Move 1σ, 2σ, 3σ & Walls Overlay ---------------- */}
          {optionsContext && (
            <g>
              {/* 3-Sigma Band Shading & Lines (99.7% Tail Risk Band) */}
              {overlays.stdDev3 && (
                <g>
                  <rect
                    x={chartPadding.left}
                    y={getPriceY(optionsContext.expectedUpper3)}
                    width={svgWidth - chartPadding.left - chartPadding.right}
                    height={Math.max(
                      4,
                      getPriceY(optionsContext.expectedLower3) - getPriceY(optionsContext.expectedUpper3)
                    )}
                    fill="url(#expMoveGradient3)"
                  />
                  <line
                    x1={chartPadding.left}
                    y1={getPriceY(optionsContext.expectedUpper3)}
                    x2={svgWidth - chartPadding.right}
                    y2={getPriceY(optionsContext.expectedUpper3)}
                    stroke="#ffd600"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.8"
                  />
                  <text
                    x={chartPadding.left + 8}
                    y={getPriceY(optionsContext.expectedUpper3) - 3}
                    fill="#ffd600"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    +3σ TAIL (99.7%): ${optionsContext.expectedUpper3.toFixed(2)}
                  </text>
                  <line
                    x1={chartPadding.left}
                    y1={getPriceY(optionsContext.expectedLower3)}
                    x2={svgWidth - chartPadding.right}
                    y2={getPriceY(optionsContext.expectedLower3)}
                    stroke="#ffd600"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    opacity="0.8"
                  />
                  <text
                    x={chartPadding.left + 8}
                    y={getPriceY(optionsContext.expectedLower3) + 10}
                    fill="#ffd600"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    -3σ TAIL: ${optionsContext.expectedLower3.toFixed(2)}
                  </text>
                </g>
              )}

              {/* 2-Sigma Band Shading & Lines (95.4% Expected Move Band) */}
              {overlays.stdDev2 && (
                <g>
                  <rect
                    x={chartPadding.left}
                    y={getPriceY(optionsContext.expectedUpper2)}
                    width={svgWidth - chartPadding.left - chartPadding.right}
                    height={Math.max(
                      4,
                      getPriceY(optionsContext.expectedLower2) - getPriceY(optionsContext.expectedUpper2)
                    )}
                    fill="url(#expMoveGradient2)"
                  />
                  <line
                    x1={chartPadding.left}
                    y1={getPriceY(optionsContext.expectedUpper2)}
                    x2={svgWidth - chartPadding.right}
                    y2={getPriceY(optionsContext.expectedUpper2)}
                    stroke="#00d2ff"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                  <text
                    x={chartPadding.left + 8}
                    y={getPriceY(optionsContext.expectedUpper2) - 3}
                    fill="#00d2ff"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    +2σ MOVE (95.4%): ${optionsContext.expectedUpper2.toFixed(2)}
                  </text>
                  <line
                    x1={chartPadding.left}
                    y1={getPriceY(optionsContext.expectedLower2)}
                    x2={svgWidth - chartPadding.right}
                    y2={getPriceY(optionsContext.expectedLower2)}
                    stroke="#00d2ff"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                  <text
                    x={chartPadding.left + 8}
                    y={getPriceY(optionsContext.expectedLower2) + 10}
                    fill="#00d2ff"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    -2σ MOVE: ${optionsContext.expectedLower2.toFixed(2)}
                  </text>
                </g>
              )}

              {/* 1-Sigma Expected Move Band Shading & Lines (68.2% Base Expected Move) */}
              {overlays.stdDev1 && (
                <g>
                  <rect
                    x={chartPadding.left}
                    y={getPriceY(optionsContext.expectedUpper1)}
                    width={svgWidth - chartPadding.left - chartPadding.right}
                    height={Math.max(
                      4,
                      getPriceY(optionsContext.expectedLower1) - getPriceY(optionsContext.expectedUpper1)
                    )}
                    fill="url(#expMoveGradient1)"
                  />
                  <line
                    x1={chartPadding.left}
                    y1={getPriceY(optionsContext.expectedUpper1)}
                    x2={svgWidth - chartPadding.right}
                    y2={getPriceY(optionsContext.expectedUpper1)}
                    stroke="#f43f5e"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                    opacity="0.9"
                  />
                  <text
                    x={chartPadding.left + 8}
                    y={getPriceY(optionsContext.expectedUpper1) - 4}
                    fill="#f43f5e"
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    +1σ EXP (68.2%): ${optionsContext.expectedUpper1.toFixed(2)} ({optionsContext.dte}DTE)
                  </text>
                  <line
                    x1={chartPadding.left}
                    y1={getPriceY(optionsContext.expectedLower1)}
                    x2={svgWidth - chartPadding.right}
                    y2={getPriceY(optionsContext.expectedLower1)}
                    stroke="#f43f5e"
                    strokeWidth="1.2"
                    strokeDasharray="4 2"
                    opacity="0.9"
                  />
                  <text
                    x={chartPadding.left + 8}
                    y={getPriceY(optionsContext.expectedLower1) + 11}
                    fill="#f43f5e"
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    -1σ EXP: ${optionsContext.expectedLower1.toFixed(2)}
                  </text>
                </g>
              )}

              {/* Max Pain Strike Line */}
              <line
                x1={chartPadding.left}
                y1={getPriceY(optionsContext.maxPain)}
                x2={svgWidth - chartPadding.right}
                y2={getPriceY(optionsContext.maxPain)}
                stroke="#eab308"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.75"
              />
              <text
                x={svgWidth - chartPadding.right - 100}
                y={getPriceY(optionsContext.maxPain) - 4}
                fill="#eab308"
                fontSize="8"
                fontWeight="bold"
                textAnchor="end"
              >
                MAX PAIN: ${optionsContext.maxPain.toFixed(2)}
              </text>

              {/* Call Wall Strike Line */}
              <line
                x1={chartPadding.left}
                y1={getPriceY(optionsContext.callWall)}
                x2={svgWidth - chartPadding.right}
                y2={getPriceY(optionsContext.callWall)}
                stroke="#00d2ff"
                strokeWidth="1"
                strokeDasharray="5 3"
                opacity="0.7"
              />
              <text
                x={svgWidth - chartPadding.right - 100}
                y={getPriceY(optionsContext.callWall) - 4}
                fill="#00d2ff"
                fontSize="8"
                fontWeight="bold"
                textAnchor="end"
              >
                CALL WALL: ${optionsContext.callWall.toFixed(2)}
              </text>

              {/* Put Wall Strike Line */}
              <line
                x1={chartPadding.left}
                y1={getPriceY(optionsContext.putWall)}
                x2={svgWidth - chartPadding.right}
                y2={getPriceY(optionsContext.putWall)}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="5 3"
                opacity="0.7"
              />
              <text
                x={svgWidth - chartPadding.right - 100}
                y={getPriceY(optionsContext.putWall) + 10}
                fill="#f43f5e"
                fontSize="8"
                fontWeight="bold"
                textAnchor="end"
              >
                PUT WALL: ${optionsContext.putWall.toFixed(2)}
              </text>
            </g>
          )}

          {/* ---------------- Floor Trader Pivot Points Overlay ---------------- */}
          {overlays.pivots && pivots && (
            <g opacity="0.65">
              {[
                { label: 'R2', price: pivots.r2, color: '#f43f5e' },
                { label: 'R1', price: pivots.r1, color: '#fb7185' },
                { label: 'PIVOT (P)', price: pivots.pivot, color: '#ffd600' },
                { label: 'S1', price: pivots.s1, color: '#34d399' },
                { label: 'S2', price: pivots.s2, color: '#059669' },
              ].map((pvt, pIdx) => {
                const y = getPriceY(pvt.price);
                return (
                  <g key={pIdx}>
                    <line
                      x1={chartPadding.left}
                      y1={y}
                      x2={svgWidth - chartPadding.right}
                      y2={y}
                      stroke={pvt.color}
                      strokeWidth="0.8"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={chartPadding.left + 6}
                      y={y - 3}
                      fill={pvt.color}
                      fontSize="8"
                      fontWeight="bold"
                    >
                      {pvt.label}: ${pvt.price.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* ---------------- Bollinger Bands Envelope ---------------- */}
          {overlays.bollinger && (
            <g>
              {bollingerAreaPath && <path d={bollingerAreaPath} fill="url(#bbGradient)" />}
              <path
                d={buildSvgPath(bollinger.upper)}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="1.2"
                strokeDasharray="2 1"
                opacity="0.75"
              />
              <path
                d={buildSvgPath(bollinger.middle)}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="1"
                opacity="0.45"
              />
              <path
                d={buildSvgPath(bollinger.lower)}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="1.2"
                strokeDasharray="2 1"
                opacity="0.75"
              />
            </g>
          )}

          {/* ---------------- Donchian Channels ---------------- */}
          {overlays.donchian && (
            <g>
              <path
                d={buildSvgPath(donchian.upper)}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
                opacity="0.6"
              />
              <path
                d={buildSvgPath(donchian.lower)}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1"
                opacity="0.6"
              />
            </g>
          )}

          {/* ---------------- VWAP ---------------- */}
          {overlays.vwap && (
            <path
              d={buildSvgPath(vwap.vwap)}
              fill="none"
              stroke="#ff9900"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}

          {/* ---------------- Supertrend ---------------- */}
          {overlays.supertrend && (
            <g>
              {candles.map((_, idx) => {
                if (idx === 0) return null;
                const prevSt = supertrend.supertrend[idx - 1];
                const curSt = supertrend.supertrend[idx];
                const trend = supertrend.trend[idx];
                if (prevSt === null || curSt === null) return null;

                const x1 = chartPadding.left + (idx - 1) * candleSlotWidth + candleSlotWidth / 2;
                const y1 = getPriceY(prevSt);
                const x2 = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                const y2 = getPriceY(curSt);
                const color = trend === 'bullish' ? '#00e676' : '#ff334b';

                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          )}

          {/* ---------------- Parabolic SAR Dots ---------------- */}
          {overlays.sar && (
            <g>
              {candles.map((_, idx) => {
                const s = sar.sar[idx];
                const t = sar.trend[idx];
                if (s === null) return null;
                const cx = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                const cy = getPriceY(s);
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r="1.8"
                    fill={t === 'bullish' ? '#00e676' : '#ff334b'}
                  />
                );
              })}
            </g>
          )}

          {/* ---------------- SMA & EMA Moving Average Lines ---------------- */}
          {overlays.sma200 && (
            <path
              d={buildSvgPath(sma200)}
              fill="none"
              stroke="#d946ef"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}

          {overlays.sma50 && (
            <path
              d={buildSvgPath(sma50)}
              fill="none"
              stroke="#00d2ff"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}

          {overlays.sma20 && (
            <path
              d={buildSvgPath(sma20)}
              fill="none"
              stroke="#ffd600"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          )}

          {overlays.ema9 && (
            <path
              d={buildSvgPath(ema9)}
              fill="none"
              stroke="#ff9900"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          )}

          {overlays.ema21 && (
            <path
              d={buildSvgPath(ema21)}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          )}

          {/* ---------------- Candlestick Bodies & Wicks ---------------- */}
          {candles.map((candle, idx) => {
            const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
            const isUp = candle.close >= candle.open;
            const color = isUp ? '#00e676' : '#ff334b';

            const wickTop = getPriceY(candle.high);
            const wickBottom = getPriceY(candle.low);
            const bodyTop = getPriceY(Math.max(candle.open, candle.close));
            const bodyBottom = getPriceY(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(2, bodyBottom - bodyTop);

            return (
              <g key={idx}>
                {/* Candle Wick */}
                <line
                  x1={xCenter}
                  y1={wickTop}
                  x2={xCenter}
                  y2={wickBottom}
                  stroke={color}
                  strokeWidth="1.2"
                />
                {/* Candle Body */}
                <rect
                  x={xCenter - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />
              </g>
            );
          })}

          {/* ---------------- Macro Events Markers & Flag Pins ---------------- */}
          {overlays.macroEvents && (
            <g>
              {macroEventsInWindow.map((mItem, mIdx) => {
                const xCenter = chartPadding.left + mItem.candleIndex * candleSlotWidth + candleSlotWidth / 2;
                const isHovered = hoveredMacroEvent?.id === mItem.event.id;
                const isSelected = selectedMacroEvent?.id === mItem.event.id;

                const pinColor =
                  mItem.event.category === 'CENTRAL_BANK'
                    ? '#ff9900'
                    : mItem.event.category === 'INFLATION'
                    ? '#c084fc'
                    : mItem.event.category === 'COMMODITY_OPEC'
                    ? '#f97316'
                    : mItem.event.category === 'EMPLOYMENT'
                    ? '#00d2ff'
                    : '#10b981';

                return (
                  <g
                    key={mIdx}
                    onMouseEnter={() => setHoveredMacroEvent(mItem.event)}
                    onMouseLeave={() => setHoveredMacroEvent(null)}
                    onClick={() => {
                      playKeyClick();
                      setSelectedMacroEvent(mItem.event);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Vertical Event Guide Line */}
                    <line
                      x1={xCenter}
                      y1={chartPadding.top + 16}
                      x2={xCenter}
                      y2={chartPadding.top + mainPriceHeight}
                      stroke={pinColor}
                      strokeWidth={isHovered || isSelected ? '1.5' : '1'}
                      strokeDasharray="3 3"
                      opacity={isHovered || isSelected ? '0.9' : '0.45'}
                    />

                    {/* Top Interactive Event Badge Pin */}
                    <rect
                      x={xCenter - 20}
                      y={chartPadding.top}
                      width={40}
                      height={15}
                      rx="2"
                      fill={isHovered || isSelected ? pinColor : '#0b101b'}
                      stroke={pinColor}
                      strokeWidth="1.2"
                    />
                    <text
                      x={xCenter}
                      y={chartPadding.top + 11}
                      fill={isHovered || isSelected ? '#000000' : pinColor}
                      fontSize="8.5"
                      fontWeight="black"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {mItem.event.shortLabel}
                    </text>

                    {/* Small Target Point on the Candle */}
                    <circle
                      cx={xCenter}
                      cy={getPriceY(mItem.candle.close)}
                      r={isHovered || isSelected ? '4.5' : '3'}
                      fill={pinColor}
                      stroke="#05070a"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* ---------------- Implied Volatility (IV 30D) Dual-Axis Curve & Axis ---------------- */}
          {overlays.impliedVol && (
            <g>
              {/* Dual-Axis IV Scale Gridlines & Labels on Right Edge */}
              {[minIvVal, Math.round((minIvVal + maxIvVal) / 2), maxIvVal].map((ivVal) => {
                const y = getIvY(ivVal);
                return (
                  <g key={`iv-grid-${ivVal}`}>
                    <line
                      x1={chartPadding.left}
                      y1={y}
                      x2={svgWidth - chartPadding.right}
                      y2={y}
                      stroke="#00e5ff"
                      strokeWidth="0.5"
                      strokeDasharray="2 4"
                      opacity="0.18"
                    />
                    <text
                      x={svgWidth - chartPadding.right + 6}
                      y={y + 3}
                      fill="#00e5ff"
                      opacity="0.75"
                      fontSize="8"
                      fontFamily="JetBrains Mono"
                    >
                      {ivVal.toFixed(0)}% IV
                    </text>
                  </g>
                );
              })}

              {/* Glowing Implied Volatility (30D) Path */}
              <path
                d={ivOverlayPath}
                fill="none"
                stroke="#00e5ff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.88"
                className="drop-shadow-[0_0_6px_rgba(0,229,255,0.7)]"
              />

              {/* Current IV 30D Marker Tag on Right Axis */}
              {(() => {
                const currIvPct =
                  volatilityStudy.ivSeries[activeIdx] ??
                  (ticker.currentIV ? ticker.currentIV * 100 : 25);
                const tagY = getIvY(currIvPct);
                return (
                  <g>
                    <line
                      x1={chartPadding.left}
                      y1={tagY}
                      x2={svgWidth - chartPadding.right}
                      y2={tagY}
                      stroke="#00e5ff"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                    <rect
                      x={svgWidth - chartPadding.right + 2}
                      y={tagY - 7}
                      width={70}
                      height={15}
                      rx="2"
                      fill="#00e5ff"
                    />
                    <text
                      x={svgWidth - chartPadding.right + 37}
                      y={tagY + 4}
                      fill="#000000"
                      fontSize="8.5"
                      fontWeight="black"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      IV: {currIvPct.toFixed(1)}%
                    </text>
                  </g>
                );
              })()}

              {/* Cursor Active Point on IV Curve */}
              {volatilityStudy.ivSeries[activeIdx] !== null && (
                <circle
                  cx={chartPadding.left + activeIdx * candleSlotWidth + candleSlotWidth / 2}
                  cy={getIvY(volatilityStudy.ivSeries[activeIdx]!)}
                  r="4"
                  fill="#00e5ff"
                  stroke="#05070a"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              )}
            </g>
          )}

          {/* ---------------- Corporate Earnings [E] Markers & Catalyst Pins ---------------- */}
          {overlays.earnings && (
            <g>
              {/* Historical Quarterly Earnings Pins */}
              {earningsInWindow.map((eItem, eIdx) => {
                const xCenter = chartPadding.left + eItem.candleIndex * candleSlotWidth + candleSlotWidth / 2;
                const isHovered = hoveredEarnings?.id === eItem.report.id;
                const isSelected = selectedEarnings?.id === eItem.report.id;
                const isBeat = eItem.report.resultType === 'BEAT';
                const isMiss = eItem.report.resultType === 'MISS';
                const pinColor = isBeat ? '#10b981' : isMiss ? '#ef4444' : '#fbbf24';

                return (
                  <g
                    key={`earn-pin-${eIdx}`}
                    onMouseEnter={() => setHoveredEarnings(eItem.report)}
                    onMouseLeave={() => setHoveredEarnings(null)}
                    onClick={() => {
                      playKeyClick();
                      setSelectedEarnings(isSelected ? null : eItem.report);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Vertical Catalyst Guide Line */}
                    <line
                      x1={xCenter}
                      y1={chartPadding.top + 16}
                      x2={xCenter}
                      y2={chartPadding.top + mainPriceHeight}
                      stroke={pinColor}
                      strokeWidth={isHovered || isSelected ? '2' : '1.2'}
                      strokeDasharray="3 3"
                      opacity={isHovered || isSelected ? '0.95' : '0.6'}
                    />

                    {/* Top Interactive Pin Badge */}
                    <rect
                      x={xCenter - 26}
                      y={chartPadding.top - 4}
                      width={52}
                      height={18}
                      rx="3"
                      fill={isHovered || isSelected ? pinColor : '#090d18'}
                      stroke={pinColor}
                      strokeWidth={isHovered || isSelected ? '2' : '1.2'}
                      className="shadow-lg"
                    />
                    <text
                      x={xCenter}
                      y={chartPadding.top + 9}
                      fill={isHovered || isSelected ? '#000000' : pinColor}
                      fontSize="8.5"
                      fontWeight="black"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      [E] {eItem.report.fiscalQuarter.split(' ')[0]}
                    </text>

                    {/* Stock Reaction Tag Pill */}
                    {eItem.report.stockReactionPct !== undefined && (
                      <g>
                        <rect
                          x={xCenter - 20}
                          y={chartPadding.top + 16}
                          width={40}
                          height={11}
                          rx="2"
                          fill={pinColor}
                          opacity={isHovered || isSelected ? '1' : '0.85'}
                        />
                        <text
                          x={xCenter}
                          y={chartPadding.top + 24.5}
                          fill="#000000"
                          fontSize="7.5"
                          fontWeight="black"
                          fontFamily="JetBrains Mono"
                          textAnchor="middle"
                        >
                          {eItem.report.stockReactionPct >= 0 ? '+' : ''}
                          {eItem.report.stockReactionPct.toFixed(1)}%
                        </text>
                      </g>
                    )}

                    {/* Target Pip on Candle Close */}
                    <circle
                      cx={xCenter}
                      cy={getPriceY(eItem.candle.close)}
                      r={isHovered || isSelected ? '5' : '3.5'}
                      fill={pinColor}
                      stroke="#05070a"
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* Upcoming Earnings Catalyst Marker & Expected Move Brackets */}
              {ticker.daysToEarnings !== null && ticker.daysToEarnings !== undefined && (
                (() => {
                  const xProj = chartPadding.left + (candles.length - 1) * candleSlotWidth + candleSlotWidth / 2;
                  const expPct = ticker.earningsEstimatedMovePct || upcomingEarnings?.impliedMovePct || 6.5;
                  const expDollars = ticker.price * (expPct / 100);
                  const upperPrice = ticker.price + expDollars;
                  const lowerPrice = Math.max(1, ticker.price - expDollars);
                  const upperY = getPriceY(upperPrice);
                  const lowerY = getPriceY(lowerPrice);

                  return (
                    <g
                      className="cursor-pointer"
                      onClick={() => {
                        playKeyClick();
                        if (upcomingEarnings) setSelectedEarnings(upcomingEarnings);
                      }}
                    >
                      {/* Vertical Pulsing Catalyst Line */}
                      <line
                        x1={xProj}
                        y1={chartPadding.top}
                        x2={xProj}
                        y2={chartPadding.top + mainPriceHeight}
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        opacity="0.85"
                      />

                      {/* Top Upcoming Catalyst Badge */}
                      <rect
                        x={xProj - 60}
                        y={chartPadding.top - 18}
                        width={120}
                        height={16}
                        rx="2"
                        fill="#fbbf24"
                        stroke="#d97706"
                        strokeWidth="1"
                        className="animate-pulse shadow-md"
                      />
                      <text
                        x={xProj}
                        y={chartPadding.top - 6}
                        fill="#000000"
                        fontSize="8"
                        fontWeight="black"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        [E] NEXT: {ticker.earningsDate || upcomingEarnings?.displayDate} ({ticker.daysToEarnings}d)
                      </text>

                      {/* Upper Expected Move Bracket Line */}
                      <line
                        x1={xProj - 15}
                        y1={upperY}
                        x2={svgWidth - chartPadding.right}
                        y2={upperY}
                        stroke="#fbbf24"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.8"
                      />
                      <rect
                        x={svgWidth - chartPadding.right + 2}
                        y={upperY - 6}
                        width={70}
                        height={13}
                        rx="2"
                        fill="#fbbf24"
                      />
                      <text
                        x={svgWidth - chartPadding.right + 37}
                        y={upperY + 4}
                        fill="#000000"
                        fontSize="8"
                        fontWeight="black"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        +E: ${upperPrice.toFixed(2)} (+{expPct}%)
                      </text>

                      {/* Lower Expected Move Bracket Line */}
                      <line
                        x1={xProj - 15}
                        y1={lowerY}
                        x2={svgWidth - chartPadding.right}
                        y2={lowerY}
                        stroke="#fbbf24"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity="0.8"
                      />
                      <rect
                        x={svgWidth - chartPadding.right + 2}
                        y={lowerY - 6}
                        width={70}
                        height={13}
                        rx="2"
                        fill="#fbbf24"
                      />
                      <text
                        x={svgWidth - chartPadding.right + 37}
                        y={lowerY + 4}
                        fill="#000000"
                        fontSize="8"
                        fontWeight="black"
                        fontFamily="JetBrains Mono"
                        textAnchor="middle"
                      >
                        -E: ${lowerPrice.toFixed(2)} (-{expPct}%)
                      </text>
                    </g>
                  );
                })()
              )}
            </g>
          )}

          {/* ---------------- Sub-Chart Divider Line ---------------- */}
          <line
            x1={chartPadding.left}
            y1={subChartTop - 10}
            x2={svgWidth - chartPadding.right}
            y2={subChartTop - 10}
            stroke="#1e2638"
            strokeWidth="1"
          />

          {/* Sub-Chart Pane Header Title & Value */}
          <text
            x={chartPadding.left}
            y={subChartTop - 2}
            fill="#ff9900"
            fontSize="9"
            fontWeight="bold"
            fontFamily="JetBrains Mono"
          >
            {subChart === 'RSI' && `RSI (14) — [30/70 BANDS] • CURR: ${activeRsi?.toFixed(1) ?? 'N/A'}`}
            {subChart === 'MACD' &&
              `MACD (12, 26, 9) • MACD: ${activeMacd?.toFixed(2) ?? 'N/A'} • SIG: ${
                activeMacdSig?.toFixed(2) ?? 'N/A'
              } • HIST: ${activeMacdHist?.toFixed(2) ?? 'N/A'}`}
            {subChart === 'STOCH' &&
              `STOCHASTIC (14, 3, 3) • %K: ${activeStochK?.toFixed(1) ?? 'N/A'} • %D: ${
                activeStochD?.toFixed(1) ?? 'N/A'
              }`}
            {subChart === 'ADX' &&
              `ADX (14) • ADX: ${activeAdx?.toFixed(1) ?? 'N/A'} • +DI: ${activePdi?.toFixed(1) ?? 'N/A'} • -DI: ${
                activeMdi?.toFixed(1) ?? 'N/A'
              }`}
            {subChart === 'ATR' &&
              `ATR (14) • $${activeAtr?.toFixed(2) ?? 'N/A'} (${
                activeAtr ? ((activeAtr / activeCandle.close) * 100).toFixed(2) : '0'
              }% OF CLOSE)`}
            {subChart === 'OBV' && `ON-BALANCE VOLUME (OBV) • ${activeObv ? (activeObv / 1e6).toFixed(1) + 'M' : 'N/A'}`}
            {subChart === 'SQUEEZE' &&
              `TTM VOLATILITY SQUEEZE • STATUS: ${
                activeSqueeze ? 'SQUEEZE COILING' : 'EXPANSION'
              }`}
            {subChart === 'VOLUME' &&
              `VOLUME • ${(activeCandle.volume / 1e6).toFixed(1)}M SHARES`}
            {subChart === 'VOLATILITY' &&
              `VOLATILITY DYNAMICS // IV (30D): ${volatilityStudy.ivSeries[activeIdx]?.toFixed(1) ?? 'N/A'}% • HV (20D): ${volatilityStudy.hv20Series[activeIdx]?.toFixed(1) ?? 'N/A'}% • PARKINSON: ${volatilityStudy.parkinsonHv[activeIdx]?.toFixed(1) ?? 'N/A'}% • VRP (IV-HV): ${volatilityStudy.vrpSeries[activeIdx] !== null ? (volatilityStudy.vrpSeries[activeIdx]! > 0 ? '+' : '') + volatilityStudy.vrpSeries[activeIdx]!.toFixed(1) + '%' : 'N/A'}`}
            {subChart === 'MARGIN_DEBT' &&
              `FINRA MARGIN DEBT & LEVERAGE (% OF GDP) // DEBT: $${(marginDebtStudy.marginDebtSeries[activeIdx] ?? marginDebtStudy.currentDebt).toFixed(1)}B • % OF US GDP: ${(marginDebtStudy.debtPctOfGdpSeries[activeIdx] ?? marginDebtStudy.currentPctGdp).toFixed(2)}% • YoY: ${(marginDebtStudy.yoySeries[activeIdx] ?? marginDebtStudy.currentYoY) >= 0 ? '+' : ''}${(marginDebtStudy.yoySeries[activeIdx] ?? marginDebtStudy.currentYoY).toFixed(1)}% • REGIME: ${marginDebtStudy.regimeLabel.toUpperCase()}`}
          </text>

          {/* ---------------- Sub-Chart Renderings ---------------- */}
          {/* A. RSI Sub-Chart */}
          {subChart === 'RSI' && (
            <g>
              {/* Overbought (70) & Oversold (30) levels */}
              <line
                x1={chartPadding.left}
                y1={subChartTop + subChartHeight * 0.3}
                x2={svgWidth - chartPadding.right}
                y2={subChartTop + subChartHeight * 0.3}
                stroke="#ff334b"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text
                x={svgWidth - chartPadding.right + 6}
                y={subChartTop + subChartHeight * 0.3 + 3}
                fill="#ff334b"
                fontSize="8"
              >
                70 OB
              </text>

              <line
                x1={chartPadding.left}
                y1={subChartTop + subChartHeight * 0.5}
                x2={svgWidth - chartPadding.right}
                y2={subChartTop + subChartHeight * 0.5}
                stroke="#475569"
                strokeWidth="0.6"
                strokeDasharray="2 2"
              />
              <text
                x={svgWidth - chartPadding.right + 6}
                y={subChartTop + subChartHeight * 0.5 + 3}
                fill="#64748b"
                fontSize="8"
              >
                50
              </text>

              <line
                x1={chartPadding.left}
                y1={subChartTop + subChartHeight * 0.7}
                x2={svgWidth - chartPadding.right}
                y2={subChartTop + subChartHeight * 0.7}
                stroke="#00e676"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text
                x={svgWidth - chartPadding.right + 6}
                y={subChartTop + subChartHeight * 0.7 + 3}
                fill="#00e676"
                fontSize="8"
              >
                30 OS
              </text>

              {/* Shaded zone between 30 and 70 */}
              <rect
                x={chartPadding.left}
                y={subChartTop + subChartHeight * 0.3}
                width={svgWidth - chartPadding.left - chartPadding.right}
                height={subChartHeight * 0.4}
                fill="#b388ff"
                fillOpacity="0.04"
              />

              {/* RSI Curve */}
              {(() => {
                let rsiPath = '';
                rsi.forEach((val, idx) => {
                  if (val === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = subChartTop + subChartHeight - (val / 100) * subChartHeight;
                  rsiPath += `${rsiPath === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return <path d={rsiPath} fill="none" stroke="#b388ff" strokeWidth="1.5" />;
              })()}
            </g>
          )}

          {/* B. MACD Sub-Chart */}
          {subChart === 'MACD' && (
            <g>
              {(() => {
                const allHist = macd.histogram.filter((v): v is number => v !== null);
                const maxH = Math.max(0.1, ...allHist.map((v) => Math.abs(v)));
                const zeroY = subChartTop + subChartHeight / 2;

                return (
                  <g>
                    {/* Zero Line */}
                    <line
                      x1={chartPadding.left}
                      y1={zeroY}
                      x2={svgWidth - chartPadding.right}
                      y2={zeroY}
                      stroke="#475569"
                      strokeWidth="1"
                    />

                    {/* Histogram Bars */}
                    {macd.histogram.map((h, idx) => {
                      if (h === null) return null;
                      const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                      const barH = (Math.abs(h) / maxH) * (subChartHeight / 2 - 4);
                      const isPos = h >= 0;
                      const barY = isPos ? zeroY - barH : zeroY;
                      const color = isPos ? '#00e676' : '#ff334b';

                      return (
                        <rect
                          key={idx}
                          x={xCenter - candleBodyWidth / 2}
                          y={barY}
                          width={candleBodyWidth}
                          height={Math.max(1, barH)}
                          fill={color}
                          opacity="0.75"
                        />
                      );
                    })}

                    {/* MACD Line */}
                    {(() => {
                      let p = '';
                      macd.macd.forEach((v, idx) => {
                        if (v === null) return;
                        const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                        const y = zeroY - (v / maxH) * (subChartHeight / 2 - 4);
                        p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      });
                      return <path d={p} fill="none" stroke="#00d2ff" strokeWidth="1.4" />;
                    })()}

                    {/* Signal Line */}
                    {(() => {
                      let p = '';
                      macd.signal.forEach((v, idx) => {
                        if (v === null) return;
                        const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                        const y = zeroY - (v / maxH) * (subChartHeight / 2 - 4);
                        p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      });
                      return (
                        <path
                          d={p}
                          fill="none"
                          stroke="#ff9900"
                          strokeWidth="1.2"
                          strokeDasharray="2 1"
                        />
                      );
                    })()}
                  </g>
                );
              })()}
            </g>
          )}

          {/* C. Stochastic Sub-Chart */}
          {subChart === 'STOCH' && (
            <g>
              <line
                x1={chartPadding.left}
                y1={subChartTop + subChartHeight * 0.2}
                x2={svgWidth - chartPadding.right}
                y2={subChartTop + subChartHeight * 0.2}
                stroke="#ff334b"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text
                x={svgWidth - chartPadding.right + 6}
                y={subChartTop + subChartHeight * 0.2 + 3}
                fill="#ff334b"
                fontSize="8"
              >
                80
              </text>

              <line
                x1={chartPadding.left}
                y1={subChartTop + subChartHeight * 0.8}
                x2={svgWidth - chartPadding.right}
                y2={subChartTop + subChartHeight * 0.8}
                stroke="#00e676"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text
                x={svgWidth - chartPadding.right + 6}
                y={subChartTop + subChartHeight * 0.8 + 3}
                fill="#00e676"
                fontSize="8"
              >
                20
              </text>

              {/* %K Line */}
              {(() => {
                let p = '';
                stoch.k.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = subChartTop + subChartHeight - (v / 100) * subChartHeight;
                  p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return <path d={p} fill="none" stroke="#00e676" strokeWidth="1.4" />;
              })()}

              {/* %D Line */}
              {(() => {
                let p = '';
                stoch.d.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = subChartTop + subChartHeight - (v / 100) * subChartHeight;
                  p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return (
                  <path
                    d={p}
                    fill="none"
                    stroke="#ff334b"
                    strokeWidth="1.2"
                    strokeDasharray="2 1"
                  />
                );
              })()}
            </g>
          )}

          {/* D. ADX Sub-Chart */}
          {subChart === 'ADX' && (
            <g>
              <line
                x1={chartPadding.left}
                y1={subChartTop + subChartHeight * 0.5}
                x2={svgWidth - chartPadding.right}
                y2={subChartTop + subChartHeight * 0.5}
                stroke="#ffd600"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                opacity="0.7"
              />
              <text
                x={svgWidth - chartPadding.right + 6}
                y={subChartTop + subChartHeight * 0.5 + 3}
                fill="#ffd600"
                fontSize="8"
              >
                25 TREND
              </text>

              {/* +DI Line */}
              {(() => {
                let p = '';
                adx.plusDI.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = subChartTop + subChartHeight - (v / 60) * subChartHeight;
                  p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return <path d={p} fill="none" stroke="#00e676" strokeWidth="1" />;
              })()}

              {/* -DI Line */}
              {(() => {
                let p = '';
                adx.minusDI.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = subChartTop + subChartHeight - (v / 60) * subChartHeight;
                  p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return <path d={p} fill="none" stroke="#ff334b" strokeWidth="1" />;
              })()}

              {/* ADX Main Line */}
              {(() => {
                let p = '';
                adx.adx.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = subChartTop + subChartHeight - (v / 60) * subChartHeight;
                  p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return <path d={p} fill="none" stroke="#ffd600" strokeWidth="1.8" />;
              })()}
            </g>
          )}

          {/* E. ATR Sub-Chart */}
          {subChart === 'ATR' && (
            <g>
              {(() => {
                const validAtr = atr.filter((v): v is number => v !== null);
                const minA = Math.min(...validAtr);
                const maxA = Math.max(...validAtr);

                let p = '';
                atr.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y =
                    subChartTop +
                    subChartHeight -
                    ((v - minA) / (maxA - minA || 1)) * (subChartHeight - 10) -
                    5;
                  p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return <path d={p} fill="none" stroke="#38bdf8" strokeWidth="1.6" />;
              })()}
            </g>
          )}

          {/* F. OBV Sub-Chart */}
          {subChart === 'OBV' && (
            <g>
              {(() => {
                const validObv = obv.filter((v): v is number => v !== null);
                const minO = Math.min(...validObv);
                const maxO = Math.max(...validObv);

                let p = '';
                obv.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y =
                    subChartTop +
                    subChartHeight -
                    ((v - minO) / (maxO - minO || 1)) * (subChartHeight - 10) -
                    5;
                  p += `${p === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });
                return <path d={p} fill="none" stroke="#ec4899" strokeWidth="1.5" />;
              })()}
            </g>
          )}

          {/* G. TTM Squeeze Sub-Chart */}
          {subChart === 'SQUEEZE' && (
            <g>
              {(() => {
                const validMoms = squeeze.momentum.filter((v): v is number => v !== null);
                const maxMom = Math.max(0.5, ...validMoms.map((v) => Math.abs(v)));
                const zeroY = subChartTop + subChartHeight / 2;

                return (
                  <g>
                    <line
                      x1={chartPadding.left}
                      y1={zeroY}
                      x2={svgWidth - chartPadding.right}
                      y2={zeroY}
                      stroke="#334155"
                      strokeWidth="1"
                    />

                    {/* Squeeze Momentum Histogram */}
                    {squeeze.momentum.map((m, idx) => {
                      if (m === null) return null;
                      const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                      const barH = (Math.abs(m) / maxMom) * (subChartHeight / 2 - 8);
                      const isPos = m >= 0;
                      const barY = isPos ? zeroY - barH : zeroY;
                      const color = isPos ? '#00e676' : '#ff334b';

                      return (
                        <rect
                          key={idx}
                          x={xCenter - candleBodyWidth / 2}
                          y={barY}
                          width={candleBodyWidth}
                          height={Math.max(1, barH)}
                          fill={color}
                          opacity="0.8"
                        />
                      );
                    })}

                    {/* Squeeze Status Dots along centerline */}
                    {squeeze.isSqueezed.map((inSqueeze, idx) => {
                      const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                      return (
                        <circle
                          key={idx}
                          cx={xCenter}
                          cy={zeroY}
                          r="2.2"
                          fill={inSqueeze ? '#ff334b' : '#00e676'}
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </g>
          )}

          {/* H. Volume Sub-Chart */}
          {subChart === 'VOLUME' && (
            <g>
              {(() => {
                const maxVol = Math.max(...candles.map((c) => c.volume));
                return candles.map((c, idx) => {
                  const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const isUp = c.close >= c.open;
                  const color = isUp ? '#00e676' : '#ff334b';
                  const volH = (c.volume / (maxVol || 1)) * (subChartHeight - 8);
                  const volY = subChartBottom - volH;

                  return (
                    <rect
                      key={idx}
                      x={xCenter - candleBodyWidth / 2}
                      y={volY}
                      width={candleBodyWidth}
                      height={Math.max(1, volH)}
                      fill={color}
                      opacity="0.5"
                    />
                  );
                });
              })()}
            </g>
          )}

          {/* I. IV vs HV Volatility Sub-Chart */}
          {subChart === 'VOLATILITY' && (
            <g>
              {(() => {
                const allValidVols: number[] = [
                  ...volatilityStudy.ivSeries.filter((v): v is number => v !== null),
                  ...volatilityStudy.hv20Series.filter((v): v is number => v !== null),
                  ...volatilityStudy.parkinsonHv.filter((v): v is number => v !== null),
                ];
                const maxVol = Math.max(45, Math.ceil(Math.max(...allValidVols) / 5) * 5 + 5);
                const minVol = 0;

                const getVolY = (vol: number) => {
                  return subChartBottom - ((vol - minVol) / (maxVol - minVol || 1)) * (subChartHeight - 12);
                };

                const y20 = getVolY(20);
                const y40 = getVolY(40);

                let ivPath = '';
                volatilityStudy.ivSeries.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = getVolY(v);
                  ivPath += `${ivPath === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });

                let hvPath = '';
                volatilityStudy.hv20Series.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = getVolY(v);
                  hvPath += `${hvPath === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });

                let parkPath = '';
                volatilityStudy.parkinsonHv.forEach((v, idx) => {
                  if (v === null) return;
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = getVolY(v);
                  parkPath += `${parkPath === '' ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });

                return (
                  <g>
                    {/* Horizontal Reference Lines */}
                    <line
                      x1={chartPadding.left}
                      y1={y20}
                      x2={svgWidth - chartPadding.right}
                      y2={y20}
                      stroke="#1e2638"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={svgWidth - chartPadding.right + 6}
                      y={y20 + 3}
                      fill="#64748b"
                      fontSize="8"
                      fontFamily="JetBrains Mono"
                    >
                      20%
                    </text>

                    {maxVol >= 40 && (
                      <>
                        <line
                          x1={chartPadding.left}
                          y1={y40}
                          x2={svgWidth - chartPadding.right}
                          y2={y40}
                          stroke="#1e2638"
                          strokeWidth="0.8"
                          strokeDasharray="2 2"
                        />
                        <text
                          x={svgWidth - chartPadding.right + 6}
                          y={y40 + 3}
                          fill="#64748b"
                          fontSize="8"
                          fontFamily="JetBrains Mono"
                        >
                          40%
                        </text>
                      </>
                    )}

                    {/* Variance Risk Premium (VRP) Bar Histogram */}
                    {volatilityStudy.vrpSeries.map((vrp, idx) => {
                      if (vrp === null) return null;
                      const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                      const baseBarY = subChartBottom - 2;
                      const barH = Math.min(22, (Math.abs(vrp) / 15) * 22);
                      const isPos = vrp >= 0;
                      const barColor = isPos ? '#00e676' : '#ff334b';

                      return (
                        <rect
                          key={idx}
                          x={xCenter - candleBodyWidth / 2}
                          y={baseBarY - barH}
                          width={candleBodyWidth}
                          height={Math.max(1, barH)}
                          fill={barColor}
                          opacity="0.35"
                        />
                      );
                    })}

                    {/* Parkinson Volatility (Green, Dashed) */}
                    <path
                      d={parkPath}
                      fill="none"
                      stroke="#00e676"
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                      opacity="0.75"
                    />

                    {/* Historical Volatility 20D (Cyan) */}
                    <path
                      d={hvPath}
                      fill="none"
                      stroke="#00d2ff"
                      strokeWidth="1.8"
                    />

                    {/* Implied Volatility 30D (Amber, Glowing) */}
                    <path
                      d={ivPath}
                      fill="none"
                      stroke="#ff9900"
                      strokeWidth="2.2"
                      className="drop-shadow-[0_0_6px_rgba(255,153,0,0.4)]"
                    />
                  </g>
                );
              })()}
            </g>
          )}

          {/* J. FINRA Margin Debt & Leverage (% of GDP) Sub-Chart */}
          {subChart === 'MARGIN_DEBT' && (
            <g>
              {(() => {
                const minPct = 1.8;
                const maxPct = 3.6;

                const getPctY = (pct: number) => {
                  return subChartBottom - ((pct - minPct) / (maxPct - minPct)) * (subChartHeight - 12);
                };

                const minDebt = 650;
                const maxDebt = 950;
                const getDebtY = (debt: number) => {
                  return subChartBottom - ((debt - minDebt) / (maxDebt - minDebt)) * (subChartHeight - 12);
                };

                const yBubble = getPctY(3.20);
                const yElevated = getPctY(2.70);
                const yEquilibrium = getPctY(2.20);

                // Build path for % of GDP
                let pctPath = '';
                let pctAreaPath = '';
                marginDebtStudy.debtPctOfGdpSeries.forEach((pct, idx) => {
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = getPctY(pct);
                  if (idx === 0) {
                    pctPath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
                    pctAreaPath = `M ${x.toFixed(1)} ${subChartBottom} L ${x.toFixed(1)} ${y.toFixed(1)}`;
                  } else {
                    pctPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
                    pctAreaPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }
                  if (idx === marginDebtStudy.debtPctOfGdpSeries.length - 1) {
                    pctAreaPath += ` L ${x.toFixed(1)} ${subChartBottom} Z`;
                  }
                });

                // Build path for Nominal Debt ($B)
                let debtPath = '';
                marginDebtStudy.marginDebtSeries.forEach((d, idx) => {
                  const x = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                  const y = getDebtY(d);
                  debtPath += `${idx === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                });

                const activePct = marginDebtStudy.debtPctOfGdpSeries[activeIdx] ?? marginDebtStudy.currentPctGdp;
                const activeDebt = marginDebtStudy.marginDebtSeries[activeIdx] ?? marginDebtStudy.currentDebt;
                const activeX = chartPadding.left + activeIdx * candleSlotWidth + candleSlotWidth / 2;
                const activePctY = getPctY(activePct);
                const activeDebtY = getDebtY(activeDebt);

                return (
                  <g>
                    {/* Definitions for Gradients */}
                    <defs>
                      <linearGradient id="marginDebtGdpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff9900" stopOpacity="0.28" />
                        <stop offset="60%" stopColor="#ff9900" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#ff9900" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="bubbleDangerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff334b" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#ff334b" stopOpacity="0.03" />
                      </linearGradient>
                    </defs>

                    {/* Zone 4: Extreme Bubble Danger Shading (>3.20% GDP) */}
                    <rect
                      x={chartPadding.left}
                      y={subChartTop}
                      width={svgWidth - chartPadding.left - chartPadding.right}
                      height={Math.max(0, yBubble - subChartTop)}
                      fill="url(#bubbleDangerGrad)"
                    />

                    {/* Zone 3: Elevated Bull Leverage Shading (2.70% - 3.20% GDP) */}
                    <rect
                      x={chartPadding.left}
                      y={yBubble}
                      width={svgWidth - chartPadding.left - chartPadding.right}
                      height={Math.max(0, yElevated - yBubble)}
                      fill="#ff9900"
                      fillOpacity="0.035"
                    />

                    {/* Zone 2: Normal Equilibrium (2.20% - 2.70% GDP) */}
                    <rect
                      x={chartPadding.left}
                      y={yElevated}
                      width={svgWidth - chartPadding.left - chartPadding.right}
                      height={Math.max(0, yEquilibrium - yElevated)}
                      fill="#00e676"
                      fillOpacity="0.02"
                    />

                    {/* Threshold 1: 3.20% BUBBLE DANGER LINE */}
                    <line
                      x1={chartPadding.left}
                      y1={yBubble}
                      x2={svgWidth - chartPadding.right}
                      y2={yBubble}
                      stroke="#ff334b"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                    />
                    <text
                      x={chartPadding.left + 6}
                      y={yBubble - 3}
                      fill="#ff334b"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      3.20% HISTORIC BUBBLE DANGER (2000 &amp; 2021 PEAKS)
                    </text>
                    <text
                      x={svgWidth - chartPadding.right + 6}
                      y={yBubble + 3}
                      fill="#ff334b"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      3.20%
                    </text>

                    {/* Threshold 2: 2.70% ELEVATED LEVERAGE LINE */}
                    <line
                      x1={chartPadding.left}
                      y1={yElevated}
                      x2={svgWidth - chartPadding.right}
                      y2={yElevated}
                      stroke="#ff9900"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={chartPadding.left + 6}
                      y={yElevated - 3}
                      fill="#ff9900"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      2.70% ELEVATED LEVERAGE REGIME
                    </text>
                    <text
                      x={svgWidth - chartPadding.right + 6}
                      y={yElevated + 3}
                      fill="#ff9900"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                    >
                      2.70%
                    </text>

                    {/* Threshold 3: 2.20% EQUILIBRIUM BASELINE */}
                    <line
                      x1={chartPadding.left}
                      y1={yEquilibrium}
                      x2={svgWidth - chartPadding.right}
                      y2={yEquilibrium}
                      stroke="#00e676"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                      opacity="0.7"
                    />
                    <text
                      x={chartPadding.left + 6}
                      y={yEquilibrium - 3}
                      fill="#00e676"
                      fontSize="8"
                      fontFamily="JetBrains Mono"
                    >
                      2.20% EQUILIBRIUM BASELINE
                    </text>
                    <text
                      x={svgWidth - chartPadding.right + 6}
                      y={yEquilibrium + 3}
                      fill="#00e676"
                      fontSize="8"
                      fontFamily="JetBrains Mono"
                    >
                      2.20%
                    </text>

                    {/* YoY Rate of Change Bar Histogram along bottom */}
                    {marginDebtStudy.yoySeries.map((yoy, idx) => {
                      const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
                      const baseBarY = subChartBottom - 2;
                      const barH = Math.min(22, (Math.abs(yoy) / 30) * 22);
                      const isPos = yoy >= 0;
                      const barColor = isPos ? '#ff9900' : '#00d2ff';

                      return (
                        <rect
                          key={idx}
                          x={xCenter - candleBodyWidth / 2}
                          y={baseBarY - barH}
                          width={candleBodyWidth}
                          height={Math.max(1, barH)}
                          fill={barColor}
                          opacity="0.25"
                        />
                      );
                    })}

                    {/* Area under Margin Debt % of GDP */}
                    <path d={pctAreaPath} fill="url(#marginDebtGdpGrad)" />

                    {/* Nominal Margin Debt ($B) - Cyan Dotted Line */}
                    <path
                      d={debtPath}
                      fill="none"
                      stroke="#00d2ff"
                      strokeWidth="1.6"
                      strokeDasharray="3 2"
                      opacity="0.8"
                    />

                    {/* Margin Debt as % of GDP Line - Amber/Orange Glowing Line */}
                    <path
                      d={pctPath}
                      fill="none"
                      stroke={marginDebtStudy.regimeColor}
                      strokeWidth="2.4"
                      className="drop-shadow-[0_0_8px_rgba(255,153,0,0.5)]"
                    />

                    {/* Right Y-Axis Scale ($B) */}
                    <text
                      x={svgWidth - chartPadding.right + 34}
                      y={yBubble + 3}
                      fill="#00d2ff"
                      fontSize="7.5"
                      fontFamily="JetBrains Mono"
                    >
                      $930B
                    </text>
                    <text
                      x={svgWidth - chartPadding.right + 34}
                      y={yElevated + 3}
                      fill="#00d2ff"
                      fontSize="7.5"
                      fontFamily="JetBrains Mono"
                    >
                      $780B
                    </text>
                    <text
                      x={svgWidth - chartPadding.right + 34}
                      y={yEquilibrium + 3}
                      fill="#00d2ff"
                      fontSize="7.5"
                      fontFamily="JetBrains Mono"
                    >
                      $650B
                    </text>

                    {/* Cursor Tracker */}
                    {activeIdx !== null && (
                      <g>
                        <circle
                          cx={activeX}
                          cy={activePctY}
                          r="4.5"
                          fill={marginDebtStudy.regimeColor}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                        <circle
                          cx={activeX}
                          cy={activeDebtY}
                          r="3"
                          fill="#00d2ff"
                          stroke="#0a0f1d"
                          strokeWidth="1"
                        />
                      </g>
                    )}
                  </g>
                );
              })()}
            </g>
          )}

          {/* ---------------- X-Axis Dates ---------------- */}
          {candles.map((candle, idx) => {
            const step = Math.max(1, Math.floor(candles.length / 8));
            if (idx % step !== 0 && idx !== candles.length - 1) return null;
            const xCenter = chartPadding.left + idx * candleSlotWidth + candleSlotWidth / 2;
            return (
              <text
                key={idx}
                x={xCenter}
                y={subChartBottom + 16}
                fill="#64748b"
                fontSize="9"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {candle.time}
              </text>
            );
          })}

          {/* ---------------- Crosshair & Active Inspector Line ---------------- */}
          {hoveredIndex !== null && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={chartPadding.left + activeIdx * candleSlotWidth + candleSlotWidth / 2}
                y1={chartPadding.top}
                x2={chartPadding.left + activeIdx * candleSlotWidth + candleSlotWidth / 2}
                y2={subChartBottom}
                stroke="#ff9900"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.85"
              />

              {/* Horizontal Crosshair Price Line */}
              <line
                x1={chartPadding.left}
                y1={getPriceY(activeCandle.close)}
                x2={svgWidth - chartPadding.right}
                y2={getPriceY(activeCandle.close)}
                stroke="#ff9900"
                strokeWidth="0.8"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              {/* Price badge on Y-Axis */}
              <rect
                x={svgWidth - chartPadding.right + 2}
                y={getPriceY(activeCandle.close) - 8}
                width={70}
                height={16}
                fill="#ff9900"
                rx="2"
              />
              <text
                x={svgWidth - chartPadding.right + 37}
                y={getPriceY(activeCandle.close) + 3}
                fill="#000000"
                fontSize="9"
                fontWeight="black"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                ${activeCandle.close.toFixed(2)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ========================================================
          4. SUB-CHART SELECTOR TABS & INDICATOR STATS RIBBON
      ======================================================== */}
      <div className="bg-[#080d16] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Sub-Chart Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-wider mr-1">
            Sub-Pane:
          </span>

          {(
            [
              { key: 'RSI', label: 'RSI (14)' },
              { key: 'MACD', label: 'MACD' },
              { key: 'VOLATILITY', label: 'IV vs HV Vol' },
              { key: 'MARGIN_DEBT', label: 'Margin Debt (% GDP)' },
              { key: 'STOCH', label: 'STOCH (14,3)' },
              { key: 'ADX', label: 'ADX Trend' },
              { key: 'ATR', label: 'ATR (14)' },
              { key: 'OBV', label: 'OBV Volume' },
              { key: 'SQUEEZE', label: 'TTM Squeeze' },
              { key: 'VOLUME', label: 'Volume' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                playKeyClick();
                setSubChart(tab.key);
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                subChart === tab.key
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'bg-[#0f1422] text-[#8b9bb4] hover:text-white hover:bg-[#1a233a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Real-time Indicator Snapshot Readout */}
        <div className="flex items-center gap-2.5 text-[11px] text-[#cbd5e1] font-mono flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#ff9900]">MRGN % GDP:</span>
            <strong style={{ color: marginDebtStudy.regimeColor }}>
              {(marginDebtStudy.debtPctOfGdpSeries[activeIdx] ?? marginDebtStudy.currentPctGdp).toFixed(2)}%
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#00d2ff]">DEBT:</span>
            <strong className="text-white">
              ${(marginDebtStudy.marginDebtSeries[activeIdx] ?? marginDebtStudy.currentDebt).toFixed(1)}B
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#ff9900]">IV:</span>
            <strong className="text-white">{volatilityStudy.ivSeries[activeIdx]?.toFixed(1) ?? 'N/A'}%</strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#00d2ff]">HV20:</span>
            <strong className="text-white">{volatilityStudy.hv20Series[activeIdx]?.toFixed(1) ?? 'N/A'}%</strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#8b9bb4]">VRP:</span>
            <strong className={(volatilityStudy.vrpSeries[activeIdx] ?? 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
              {(volatilityStudy.vrpSeries[activeIdx] ?? 0) >= 0 ? '+' : ''}
              {volatilityStudy.vrpSeries[activeIdx]?.toFixed(1) ?? '0.0'}%
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#8b9bb4]">RSI:</span>
            <strong
              className={
                (activeRsi ?? 50) >= 70
                  ? 'text-[#ff334b]'
                  : (activeRsi ?? 50) <= 30
                  ? 'text-[#00e676]'
                  : 'text-[#ffd600]'
              }
            >
              {activeRsi?.toFixed(1) ?? 'N/A'}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#8b9bb4]">MACD Hist:</span>
            <strong
              className={(activeMacdHist ?? 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}
            >
              {(activeMacdHist ?? 0) > 0 ? '+' : ''}
              {activeMacdHist?.toFixed(2) ?? 'N/A'}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 bg-[#05070a] px-2 py-0.5 rounded border border-[#1e2638]">
            <span className="text-[#8b9bb4]">Squeeze:</span>
            <strong className={activeSqueeze ? 'text-[#ff334b]' : 'text-[#00e676]'}>
              {activeSqueeze ? 'ACTIVE' : 'OFF'}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================
          4B. MACRO EVENTS TIMELINE STREAM & CATALYSTS
      ======================================================== */}
      {overlays.macroEvents && (
        <div className="bg-[#0c1017] border border-[#1e2638] rounded-lg p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
            <span className="text-white font-extrabold text-xs flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#ff9900]" />
              <span>MACRO ECONOMIC CATALYSTS &amp; EVENT SCHEDULE</span>
              <span className="text-[#8b9bb4] text-[10px] font-normal">// TIMELINE ALIGNED TO CHART</span>
            </span>
            <span className="text-[#ff9900] text-[10px] font-bold">
              {MACRO_EVENTS_DATA.length} Key Catalysts Tracked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {MACRO_EVENTS_DATA.map((evt) => {
              const isSelected = selectedMacroEvent?.id === evt.id;
              const isHovered = hoveredMacroEvent?.id === evt.id;
              const catColor =
                evt.category === 'CENTRAL_BANK'
                  ? 'border-[#ff9900]/50 text-[#ff9900] bg-[#ff9900]/10'
                  : evt.category === 'INFLATION'
                  ? 'border-[#c084fc]/50 text-[#c084fc] bg-[#c084fc]/10'
                  : evt.category === 'COMMODITY_OPEC'
                  ? 'border-[#f97316]/50 text-[#f97316] bg-[#f97316]/10'
                  : evt.category === 'EMPLOYMENT'
                  ? 'border-[#00d2ff]/50 text-[#00d2ff] bg-[#00d2ff]/10'
                  : 'border-[#10b981]/50 text-[#10b981] bg-[#10b981]/10';

              return (
                <div
                  key={evt.id}
                  onClick={() => {
                    playKeyClick();
                    setSelectedMacroEvent(isSelected ? null : evt);
                  }}
                  onMouseEnter={() => setHoveredMacroEvent(evt)}
                  onMouseLeave={() => setHoveredMacroEvent(null)}
                  className={`p-2 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#182338] border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.3)]'
                      : isHovered
                      ? 'bg-[#121927] border-[#2b3a56]'
                      : 'bg-[#070b13] border-[#182030] hover:bg-[#0f1522]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${catColor}`}>
                      {evt.shortLabel}
                    </span>
                    <span className="text-[10px] text-[#8b9bb4] font-mono">{evt.date}</span>
                  </div>
                  <div className="text-[11px] font-bold text-white line-clamp-1">{evt.title}</div>
                  <div className="text-[10px] text-[#8b9bb4] mt-0.5 line-clamp-1">
                    Actual: <strong className="text-white">{evt.actual}</strong> vs Est: {evt.forecast}
                  </div>
                  <div className="text-[9px] text-[#00d2ff] font-mono mt-1 pt-1 border-t border-[#1e2638]/70">
                    {evt.ivImpact}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Selected Macro Event Card */}
          {selectedMacroEvent && (
            <div className="bg-[#141d2e] border border-[#ff9900]/40 rounded p-3 mt-1 relative text-xs animate-in fade-in">
              <button
                onClick={() => setSelectedMacroEvent(null)}
                className="absolute top-2 right-2 text-[#8b9bb4] hover:text-white text-xs px-1"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 bg-[#ff9900] text-black font-black rounded text-[10px]">
                  {selectedMacroEvent.shortLabel}
                </span>
                <span className="text-white font-extrabold text-sm">{selectedMacroEvent.title}</span>
                <span className="text-[#8b9bb4] text-[11px] font-mono">
                  {selectedMacroEvent.date} @ {selectedMacroEvent.time}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#090d15] p-2 rounded border border-[#1e2638] my-2 text-[11px]">
                <div>
                  <span className="text-[#888] block text-[9px]">Actual Outcome</span>
                  <span className="text-[#00e676] font-extrabold">{selectedMacroEvent.actual}</span>
                </div>
                <div>
                  <span className="text-[#888] block text-[9px]">Consensus Forecast</span>
                  <span className="text-white font-bold">{selectedMacroEvent.forecast}</span>
                </div>
                <div>
                  <span className="text-[#888] block text-[9px]">Volatility Impact</span>
                  <span className="text-[#ff9900] font-bold">{selectedMacroEvent.ivImpact}</span>
                </div>
              </div>
              <p className="text-[#cbd5e1] text-[11px] leading-relaxed mb-1">
                {selectedMacroEvent.impactSummary}
              </p>
              <div className="text-[10px] text-[#00d2ff] font-mono">
                Market Reaction: {selectedMacroEvent.marketReactionNote}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          4C. CORPORATE EARNINGS CALENDAR & IV CRUSH CATALYSTS
      ======================================================== */}
      {overlays.earnings && (
        <div className="bg-[#0b0e17] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2.5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between border-b border-[#1e2638] pb-2 gap-2">
            <span className="text-white font-black text-xs flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="text-[#fbbf24] font-black">[E] CORPORATE EARNINGS &amp; OPTIONS IV CRUSH RADAR</span>
              <span className="text-[#8b9bb4] text-[10px] font-normal">// QUARTERLY CATALYSTS &amp; STRADDLE DYNAMICS</span>
            </span>

            {/* Aggregate Earnings Volatility Metrics */}
            <div className="flex flex-wrap items-center gap-3 text-[10px]">
              <span className="text-[#8b9bb4]">
                Beat Rate: <strong className="text-[#00e676]">{earningsStats.beatRatePct}%</strong>
              </span>
              <span className="text-[#8b9bb4]">
                Avg Implied Move: <strong className="text-[#fbbf24]">±{earningsStats.avgImpliedMovePct}%</strong>
              </span>
              <span className="text-[#8b9bb4]">
                Avg Actual Move: <strong className="text-white">±{earningsStats.avgActualMovePct}%</strong>
              </span>
              <span className="text-[#8b9bb4]">
                Avg IV Crush: <strong className="text-[#00e5ff]">-{earningsStats.avgIvCrushPts} pts</strong>
              </span>
              {ticker.daysToEarnings !== null && ticker.daysToEarnings !== undefined && (
                <span className="px-2 py-0.5 rounded bg-[#fbbf24]/15 border border-[#fbbf24]/50 text-[#fbbf24] font-black">
                  Next: {ticker.earningsDate || upcomingEarnings?.displayDate} ({ticker.daysToEarnings}d)
                </span>
              )}
            </div>
          </div>

          {/* Quarterly Earnings Event Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {getEarningsForTicker(ticker.symbol).map((report) => {
              const isSelected = selectedEarnings?.id === report.id;
              const isHovered = hoveredEarnings?.id === report.id;
              const isBeat = report.resultType === 'BEAT';
              const isMiss = report.resultType === 'MISS';
              const isUpcoming = report.resultType === 'UPCOMING';

              return (
                <div
                  key={report.id}
                  onClick={() => {
                    playKeyClick();
                    setSelectedEarnings(isSelected ? null : report);
                  }}
                  onMouseEnter={() => setHoveredEarnings(report)}
                  onMouseLeave={() => setHoveredEarnings(null)}
                  className={`p-2.5 rounded border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1a2336] border-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                      : isHovered
                      ? 'bg-[#121927] border-[#3b4c6e]'
                      : 'bg-[#070b13] border-[#182030] hover:bg-[#0f1522]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                        isUpcoming
                          ? 'border-[#fbbf24] text-[#fbbf24] bg-[#fbbf24]/10 animate-pulse'
                          : isBeat
                          ? 'border-[#00e676] text-[#00e676] bg-[#00e676]/10'
                          : isMiss
                          ? 'border-[#ff334b] text-[#ff334b] bg-[#ff334b]/10'
                          : 'border-[#fbbf24] text-[#fbbf24] bg-[#fbbf24]/10'
                      }`}
                    >
                      {report.fiscalQuarter}
                    </span>
                    <span className="text-[10px] text-[#8b9bb4] font-mono">
                      {report.displayDate} ({report.timing})
                    </span>
                  </div>

                  <div className="flex items-center justify-between my-1 text-[11px]">
                    <span className="text-[#8b9bb4]">
                      EPS: <strong className="text-white">{report.reportedEps !== undefined ? `$${report.reportedEps.toFixed(2)}` : 'Est'}</strong>{' '}
                      vs ${report.consensusEps.toFixed(2)}
                    </span>
                    {report.epsSurprisePct !== undefined && (
                      <span
                        className={`text-[10px] font-black ${
                          report.epsSurprisePct >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                        }`}
                      >
                        {report.epsSurprisePct >= 0 ? '+' : ''}
                        {report.epsSurprisePct.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#8b9bb4]">
                    <span>
                      Stock Reaction:{' '}
                      <strong
                        className={
                          (report.stockReactionPct ?? 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                        }
                      >
                        {report.stockReactionPct !== undefined
                          ? `${report.stockReactionPct >= 0 ? '+' : ''}${report.stockReactionPct.toFixed(1)}%`
                          : `Exp ±${report.impliedMovePct}%`}
                      </strong>
                    </span>
                    <span className="text-[#00e5ff] font-mono">
                      {report.ivCrushPts !== undefined ? `IV ${report.ivCrushPts} pts` : `Straddle ±${report.impliedMovePct}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Selected Earnings Report Detail Card */}
          {selectedEarnings && (
            <div className="bg-[#121927] border border-[#fbbf24]/60 rounded-lg p-3.5 relative text-xs shadow-2xl animate-in fade-in">
              <button
                onClick={() => setSelectedEarnings(null)}
                className="absolute top-2.5 right-2.5 text-[#8b9bb4] hover:text-white px-2 py-0.5 rounded bg-black/40 border border-[#2d3748]"
              >
                ✕ CLOSE
              </button>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-[#fbbf24] text-black font-black rounded text-[10px]">
                  [E] EARNINGS AUDIT
                </span>
                <span className="text-white font-black text-sm">
                  {ticker.symbol} // {selectedEarnings.fiscalQuarter} Earnings Catalyst Analysis
                </span>
                <span className="text-[#8b9bb4] text-[11px] font-mono">
                  Reported on {selectedEarnings.displayDate} ({selectedEarnings.timing})
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    selectedEarnings.resultType === 'BEAT'
                      ? 'border-[#00e676] text-[#00e676] bg-[#00e676]/10'
                      : selectedEarnings.resultType === 'MISS'
                      ? 'border-[#ff334b] text-[#ff334b] bg-[#ff334b]/10'
                      : 'border-[#fbbf24] text-[#fbbf24] bg-[#fbbf24]/10'
                  }`}
                >
                  {selectedEarnings.resultType}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 bg-[#080c14] p-2.5 rounded border border-[#1e2638] my-2 text-[11px]">
                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">REPORTED EPS</span>
                  <span className="text-white font-extrabold text-sm">
                    {selectedEarnings.reportedEps !== undefined ? `$${selectedEarnings.reportedEps.toFixed(2)}` : 'Pending'}
                  </span>
                  <span className="text-[#8b9bb4] text-[9px] block">
                    Consensus: ${selectedEarnings.consensusEps.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">EPS SURPRISE</span>
                  <span
                    className={`font-black text-sm ${
                      (selectedEarnings.epsSurprisePct ?? 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                    }`}
                  >
                    {selectedEarnings.epsSurprisePct !== undefined
                      ? `${selectedEarnings.epsSurprisePct >= 0 ? '+' : ''}${selectedEarnings.epsSurprisePct.toFixed(1)}%`
                      : 'N/A'}
                  </span>
                  <span className="text-[#8b9bb4] text-[9px] block">
                    {(selectedEarnings.epsSurprisePct ?? 0) >= 0 ? 'BEAT CONSENSUS' : 'MISSED CONSENSUS'}
                  </span>
                </div>

                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">REVENUE</span>
                  <span className="text-white font-extrabold text-sm">
                    {selectedEarnings.reportedRev ?? selectedEarnings.consensusRev ?? 'Pending'}
                  </span>
                  <span className="text-[#8b9bb4] text-[9px] block">
                    Est: {selectedEarnings.consensusRev ?? 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">DAY-1 STOCK MOVE</span>
                  <span
                    className={`font-black text-sm ${
                      (selectedEarnings.stockReactionPct ?? 0) >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                    }`}
                  >
                    {selectedEarnings.stockReactionPct !== undefined
                      ? `${selectedEarnings.stockReactionPct >= 0 ? '+' : ''}${selectedEarnings.stockReactionPct.toFixed(1)}%`
                      : 'Pending'}
                  </span>
                  <span className="text-[#8b9bb4] text-[9px] block">
                    Actual Realization
                  </span>
                </div>

                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">IMPLIED STRADDLE</span>
                  <span className="text-[#fbbf24] font-black text-sm">
                    ±{selectedEarnings.impliedMovePct}%
                  </span>
                  <span className="text-[#8b9bb4] text-[9px] block">
                    {selectedEarnings.actualMovePct !== undefined
                      ? Math.abs(selectedEarnings.actualMovePct) <= selectedEarnings.impliedMovePct
                        ? 'OVERPRICED (Condor Win)'
                        : 'UNDERPRICED (Straddle Win)'
                      : 'Market Maker Move'}
                  </span>
                </div>

                <div>
                  <span className="text-[#8b9bb4] block text-[9px]">IV CRUSH DYNAMICS</span>
                  <span className="text-[#00e5ff] font-black text-sm">
                    {selectedEarnings.ivCrushPts !== undefined
                      ? `${selectedEarnings.ivCrushPts} pts`
                      : 'Spike Phase'}
                  </span>
                  <span className="text-[#8b9bb4] text-[9px] block">
                    {selectedEarnings.preEarningsIv !== undefined
                      ? `${selectedEarnings.preEarningsIv}% → ${selectedEarnings.postEarningsIv}%`
                      : 'Elevated Pre-Print'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div className="bg-[#080d16] p-2.5 rounded border border-[#1e2638]">
                  <span className="text-[#fbbf24] font-bold text-[10px] block mb-1">
                    MANAGEMENT GUIDANCE &amp; CATALYSTS
                  </span>
                  <p className="text-[#cbd5e1] text-[11px] leading-relaxed">
                    {selectedEarnings.guidanceSummary}
                  </p>
                </div>

                <div className="bg-[#080d16] p-2.5 rounded border border-[#1e2638]">
                  <span className="text-[#00e5ff] font-bold text-[10px] block mb-1">
                    OPTIONS MARKET VOLATILITY &amp; PRICING EFFICIENCY
                  </span>
                  <p className="text-[#94a3b8] text-[11px] leading-relaxed">
                    {selectedEarnings.volatilityNote}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          5. TECHNICAL SUMMARY CARDS & CANDLESTICK PATTERNS
      ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Trend & Moving Averages */}
        <div className="bg-[#080d16] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
            <span className="text-[#ff9900] font-black text-xs flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>TREND & MOVING AVERAGES</span>
            </span>
            <span className="text-[10px] text-[#8b9bb4]">20 / 50 / 200 SMA</span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-[#8b9bb4]">20-Day SMA</span>
              <div className="flex items-center gap-2">
                <span className="text-white">${activeSma20?.toFixed(2) ?? 'N/A'}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    activeCandle.close >= (activeSma20 ?? 0)
                      ? 'bg-[#00e676]/20 text-[#00e676]'
                      : 'bg-[#ff334b]/20 text-[#ff334b]'
                  }`}
                >
                  {activeCandle.close >= (activeSma20 ?? 0) ? 'ABOVE' : 'BELOW'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8b9bb4]">50-Day SMA</span>
              <div className="flex items-center gap-2">
                <span className="text-white">${activeSma50?.toFixed(2) ?? 'N/A'}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    activeCandle.close >= (activeSma50 ?? 0)
                      ? 'bg-[#00e676]/20 text-[#00e676]'
                      : 'bg-[#ff334b]/20 text-[#ff334b]'
                  }`}
                >
                  {activeCandle.close >= (activeSma50 ?? 0) ? 'ABOVE' : 'BELOW'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8b9bb4]">200-Day SMA</span>
              <div className="flex items-center gap-2">
                <span className="text-white">${activeSma200?.toFixed(2) ?? 'N/A'}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    activeCandle.close >= (activeSma200 ?? 0)
                      ? 'bg-[#00e676]/20 text-[#00e676]'
                      : 'bg-[#ff334b]/20 text-[#ff334b]'
                  }`}
                >
                  {activeCandle.close >= (activeSma200 ?? 0) ? 'BULL' : 'BEAR'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8b9bb4]">Supertrend (10,3)</span>
              <div className="flex items-center gap-2">
                <span className="text-white">${activeSupertrend?.toFixed(2) ?? 'N/A'}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    activeSupertrendDir === 'bullish'
                      ? 'bg-[#00e676]/20 text-[#00e676]'
                      : 'bg-[#ff334b]/20 text-[#ff334b]'
                  }`}
                >
                  {activeSupertrendDir ?? 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Volatility & Options Cones */}
        <div className="bg-[#080d16] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
            <span className="text-[#00d2ff] font-black text-xs flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>VOLATILITY & OPTIONS EXPECTED MOVE</span>
            </span>
            <span className="text-[10px] text-[#8b9bb4]">1σ Cones & Squeeze</span>
          </div>

          <div className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-[#8b9bb4]">Bollinger Bands</span>
              <span className="text-white font-mono">
                ${activeBbLower?.toFixed(2)} — ${activeBbUpper?.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8b9bb4]">Bollinger %B</span>
              <span className="text-white font-mono font-bold">
                {activeBbPercentB?.toFixed(2) ?? 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#8b9bb4]">TTM Squeeze State</span>
              <span
                className={`font-bold ${
                  activeSqueeze ? 'text-[#ff334b]' : 'text-[#00e676]'
                }`}
              >
                {activeSqueeze ? 'COMPRESSION / PRE-BREAKOUT' : 'MOMENTUM EXPANDING'}
              </span>
            </div>

            {optionsContext && (
              <div className="flex justify-between items-center">
                <span className="text-[#8b9bb4]">Options Expected Move</span>
                <span className="text-[#f43f5e] font-bold">
                  ±${optionsContext.expectedMove.toFixed(2)} (
                  {((optionsContext.expectedMove / ticker.price) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Candlestick Patterns & Pivots */}
        <div className="bg-[#080d16] border border-[#1e2638] rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
            <span className="text-[#00e676] font-black text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DETECTED PATTERNS & PIVOTS</span>
            </span>
            <button
              onClick={() => {
                playKeyClick();
                setShowTechoModal(true);
              }}
              className="text-[10px] text-[#ff9900] hover:underline"
            >
              VIEW MATRIX →
            </button>
          </div>

          <div className="flex flex-col gap-1 text-[11px]">
            {patterns.length === 0 ? (
              <span className="text-[#64748b] italic py-2">
                No major reversal candlestick pattern detected on recent sessions.
              </span>
            ) : (
              patterns.map((pat, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        pat.type === 'bullish'
                          ? 'bg-[#00e676]'
                          : pat.type === 'bearish'
                          ? 'bg-[#ff334b]'
                          : 'bg-[#ffd600]'
                      }`}
                    />
                    <strong className="text-white">{pat.name}</strong>
                    <span className="text-[10px] text-[#64748b]">({pat.time})</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      pat.type === 'bullish'
                        ? 'bg-[#00e676]/20 text-[#00e676]'
                        : pat.type === 'bearish'
                        ? 'bg-[#ff334b]/20 text-[#ff334b]'
                        : 'bg-[#ffd600]/20 text-[#ffd600]'
                    }`}
                  >
                    {pat.type}
                  </span>
                </div>
              ))
            )}

            {pivots && (
              <div className="pt-1.5 mt-1 border-t border-[#1e2638] flex items-center justify-between text-[10px]">
                <span className="text-[#8b9bb4]">Pivots:</span>
                <span className="text-[#00e676]">S1 ${pivots.s1}</span>
                <span className="text-[#ffd600] font-bold">P ${pivots.pivot}</span>
                <span className="text-[#ff334b]">R1 ${pivots.r1}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          6. MODAL: BLOOMBERG TECHO QUANTITATIVE SIGNAL MATRIX
      ======================================================== */}
      {showTechoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 font-mono select-none">
          <div className="bg-[#070b14] border-2 border-[#ff9900] rounded-lg max-w-4xl w-full shadow-[0_0_40px_rgba(255,153,0,0.35)] overflow-hidden text-xs flex flex-col max-h-[88vh]">
            {/* Modal Header */}
            <div className="bg-[#ff9900] text-black px-4 py-2 font-black text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>
                  {ticker.symbol} // BLOOMBERG TECHO QUANTITATIVE TECHNICAL MATRIX
                </span>
              </div>
              <button
                onClick={() => {
                  playKeyClick();
                  setShowTechoModal(false);
                }}
                className="text-black hover:bg-black/20 p-0.5 rounded font-black transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-[#cbd5e1]">
              {/* Top Consensus Score Card */}
              <div className="bg-[#0b101d] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider block">
                    Composite Quantitative Signal
                  </span>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span
                      className={`text-lg font-black ${
                        signalMatrix.consensus.includes('BUY')
                          ? 'text-[#00e676]'
                          : signalMatrix.consensus.includes('SELL')
                          ? 'text-[#ff334b]'
                          : 'text-[#ffd600]'
                      }`}
                    >
                      {signalMatrix.consensus}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-black/50 border border-[#2d3748] rounded text-[#ff9900] font-bold">
                      Net Score: {signalMatrix.score > 0 ? `+${signalMatrix.score}` : signalMatrix.score} / 10
                    </span>
                  </div>
                </div>

                {/* Score Breakdown Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-[#00e676]/15 border border-[#00e676]/40 px-3 py-1.5 rounded">
                    <span className="text-[#00e676] font-black text-sm">
                      {signalMatrix.buyCount}
                    </span>
                    <span className="text-[10px] text-[#00e676] font-bold">BUY</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#ffd600]/15 border border-[#ffd600]/40 px-3 py-1.5 rounded">
                    <span className="text-[#ffd600] font-black text-sm">
                      {signalMatrix.neutralCount}
                    </span>
                    <span className="text-[10px] text-[#ffd600] font-bold">NEUTRAL</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#ff334b]/15 border border-[#ff334b]/40 px-3 py-1.5 rounded">
                    <span className="text-[#ff334b] font-black text-sm">
                      {signalMatrix.sellCount}
                    </span>
                    <span className="text-[10px] text-[#ff334b] font-bold">SELL</span>
                  </div>
                </div>
              </div>

              {/* Indicator Breakdown Blotter */}
              <div className="border border-[#1e2638] rounded-lg overflow-hidden">
                <div className="bg-[#0e1424] px-3 py-2 font-bold text-white text-[11px] border-b border-[#1e2638] flex items-center justify-between">
                  <span>DISSECTED TECHNICAL INDICATORS ({signalMatrix.indicators.length})</span>
                  <span className="text-[#8b9bb4] text-[10px]">
                    REAL-TIME MULTI-FACTOR QUANTITATIVE MODEL
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#090e1a] text-[#8b9bb4] border-b border-[#1e2638]">
                      <tr>
                        <th className="py-1.5 px-3">CATEGORY</th>
                        <th className="py-1.5 px-3">INDICATOR</th>
                        <th className="py-1.5 px-3">READING</th>
                        <th className="py-1.5 px-3 text-center">SIGNAL</th>
                        <th className="py-1.5 px-3">INSTITUTIONAL RATIONALE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141b2a]">
                      {signalMatrix.indicators.map((card, idx) => (
                        <tr key={idx} className="hover:bg-[#0f172a] transition-colors">
                          <td className="py-2 px-3 text-[#64748b] font-bold">{card.category}</td>
                          <td className="py-2 px-3 text-white font-bold">{card.indicator}</td>
                          <td className="py-2 px-3 text-[#ff9900] font-mono">{card.value}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                card.signal === 'BUY'
                                  ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                                  : card.signal === 'SELL'
                                  ? 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                                  : 'bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/40'
                              }`}
                            >
                              {card.signal}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#cbd5e1]">{card.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Classic Pivot Levels Grid */}
              {pivots && (
                <div className="border border-[#1e2638] rounded-lg p-3 bg-[#090d16] flex flex-col gap-2">
                  <span className="text-[#ffd600] font-bold text-xs">
                    FLOOR TRADER PIVOT LEVELS
                  </span>
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px]">
                    <div className="bg-[#141b2a] p-1.5 rounded border border-[#1e2638]">
                      <span className="text-[#ff334b] block font-bold">R3</span>
                      <strong className="text-white">${pivots.r3}</strong>
                    </div>
                    <div className="bg-[#141b2a] p-1.5 rounded border border-[#1e2638]">
                      <span className="text-[#ff334b] block font-bold">R2</span>
                      <strong className="text-white">${pivots.r2}</strong>
                    </div>
                    <div className="bg-[#141b2a] p-1.5 rounded border border-[#1e2638]">
                      <span className="text-[#fb7185] block font-bold">R1</span>
                      <strong className="text-white">${pivots.r1}</strong>
                    </div>
                    <div className="bg-[#ffd600]/15 p-1.5 rounded border border-[#ffd600]/50">
                      <span className="text-[#ffd600] block font-bold">PIVOT (P)</span>
                      <strong className="text-white">${pivots.pivot}</strong>
                    </div>
                    <div className="bg-[#141b2a] p-1.5 rounded border border-[#1e2638]">
                      <span className="text-[#34d399] block font-bold">S1</span>
                      <strong className="text-white">${pivots.s1}</strong>
                    </div>
                    <div className="bg-[#141b2a] p-1.5 rounded border border-[#1e2638]">
                      <span className="text-[#00e676] block font-bold">S2</span>
                      <strong className="text-white">${pivots.s2}</strong>
                    </div>
                    <div className="bg-[#141b2a] p-1.5 rounded border border-[#1e2638]">
                      <span className="text-[#00e676] block font-bold">S3</span>
                      <strong className="text-white">${pivots.s3}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#0b101d] border-t border-[#1e2638] px-4 py-2.5 flex items-center justify-between">
              <span className="text-[#8b9bb4] text-[10px]">
                Type <strong className="text-white">TECHO {'<GO>'}</strong> or{' '}
                <strong className="text-white">TA {'<GO>'}</strong> from any terminal screen.
              </span>
              <button
                onClick={() => {
                  playKeyClick();
                  setShowTechoModal(false);
                }}
                className="px-4 py-1.5 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold rounded text-xs transition-all"
              >
                CLOSE {'<ESC>'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
