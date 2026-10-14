import React, { useState, useMemo } from 'react';
import { Ticker, ExpirationOptionChain } from '../types/options';
import {
  calculateAggregatePCRAnalysis,
  AggregatePCRAnalysis,
  StrikePCRDistribution,
} from '../utils/putCallRatioAnalytics';
import { playKeyClick } from '../utils/terminalSound';
import {
  BarChart2,
  TrendingUp,
  Activity,
  ShieldAlert,
  Flame,
  Layers,
  ArrowRight,
  Info,
  Maximize2,
  Crosshair,
  Percent,
  Sliders,
  Zap,
} from 'lucide-react';

interface PutCallRatioViewProps {
  ticker: Ticker;
  allChains: ExpirationOptionChain[];
  onNavigateToChain?: (dte?: number) => void;
  onNavigateToFlow?: () => void;
  onNavigateToVols?: () => void;
  onNavigateToValuation?: () => void;
  onOpenNetGamma?: () => void;
}

export const PutCallRatioView: React.FC<PutCallRatioViewProps> = ({
  ticker,
  allChains,
  onNavigateToChain,
  onNavigateToFlow,
  onNavigateToVols,
  onNavigateToValuation,
  onOpenNetGamma,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<'historical' | 'strikes'>('historical');
  const [strikeMetric, setStrikeMetric] = useState<'oi' | 'volume'>('oi');
  const [hoveredHistIndex, setHoveredHistIndex] = useState<number | null>(null);
  const [hoveredStrike, setHoveredStrike] = useState<StrikePCRDistribution | null>(null);

  // Compute institutional PCR analysis
  const pcrData: AggregatePCRAnalysis = useMemo(() => {
    return calculateAggregatePCRAnalysis(ticker, allChains);
  }, [ticker, allChains]);

  const { metrics, expirations, strikes, historicalSeries } = pcrData;

  // Chart 1: Historical PCR Dimensions
  const histSvgWidth = 860;
  const histSvgHeight = 280;
  const histPadding = { top: 25, right: 65, bottom: 35, left: 55 };
  const histInnerWidth = histSvgWidth - histPadding.left - histPadding.right;
  const histInnerHeight = histSvgHeight - histPadding.top - histPadding.bottom;

  const minPcr = 0.4;
  const maxPcr = Math.max(1.8, ...historicalSeries.map((h) => Math.max(h.pcrVolume, h.sma20PCR)));
  const minPrice = Math.min(...historicalSeries.map((h) => h.underlyingPrice)) * 0.985;
  const maxPrice = Math.max(...historicalSeries.map((h) => h.underlyingPrice)) * 1.015;

  const getHistX = (idx: number) => {
    if (historicalSeries.length <= 1) return histPadding.left;
    return histPadding.left + (idx / (historicalSeries.length - 1)) * histInnerWidth;
  };

  const getHistPcrY = (val: number) => {
    const clamped = Math.max(minPcr, Math.min(maxPcr, val));
    const pct = (clamped - minPcr) / (maxPcr - minPcr);
    return histPadding.top + histInnerHeight - pct * histInnerHeight;
  };

  const getHistPriceY = (val: number) => {
    const pct = (val - minPrice) / (maxPrice - minPrice || 1);
    return histPadding.top + histInnerHeight - pct * histInnerHeight;
  };

  // Build SVG Paths for Historical Chart
  const pcrLinePath = historicalSeries
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getHistX(idx).toFixed(1)} ${getHistPcrY(pt.pcrVolume).toFixed(1)}`)
    .join(' ');

  const sma20LinePath = historicalSeries
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getHistX(idx).toFixed(1)} ${getHistPcrY(pt.sma20PCR).toFixed(1)}`)
    .join(' ');

  const priceLinePath = historicalSeries
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${getHistX(idx).toFixed(1)} ${getHistPriceY(pt.underlyingPrice).toFixed(1)}`)
    .join(' ');

  // Chart 2: Strike Profile Dimensions
  const maxOI = Math.max(1, ...strikes.map((s) => Math.max(s.callOI, s.putOI)));
  const maxVol = Math.max(1, ...strikes.map((s) => Math.max(s.callVolume, s.putVolume)));
  const currentMaxStrikeVal = strikeMetric === 'oi' ? maxOI : maxVol;

  const formatLargeNum = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDollar = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="flex flex-col gap-4 font-mono text-xs w-full max-w-full ml-0 mr-auto text-left p-3 sm:p-5 select-none">
      {/* SCREEN BANNER */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded shadow-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 flex items-center justify-center text-[#ff9900]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#ff9900] font-black text-sm tracking-wider">
                {ticker.symbol} US Equity PCR
              </span>
              <span className="bg-[#00e676]/20 text-[#00e676] px-2 py-0.5 rounded text-[10px] font-bold">
                INSTITUTIONAL SENTIMENT
              </span>
            </div>
            <div className="text-[11px] text-[#8b9bb4] mt-0.5">
              Live Put/Call Ratio (Volume · Open Interest · Premium) & Max Pain Positioning Engine
            </div>
          </div>
        </div>

        {/* Quick Screen Shortcuts */}
        <div className="flex items-center gap-2">
          {onNavigateToChain && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToChain();
              }}
              className="px-2.5 py-1 bg-[#0f1422] hover:bg-[#182034] text-[#8b9bb4] hover:text-white border border-[#1e2638] rounded text-[11px] font-bold transition-all flex items-center gap-1.5"
            >
              <span>{'<F1 OMON>'}</span>
              <span className="hidden sm:inline">Options Chain</span>
            </button>
          )}
          {onNavigateToFlow && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToFlow();
              }}
              className="px-2.5 py-1 bg-[#0f1422] hover:bg-[#182034] text-[#8b9bb4] hover:text-[#00e676] border border-[#1e2638] rounded text-[11px] font-bold transition-all flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-[#00e676]" />
              <span>{'<F6 FLOW>'}</span>
              <span className="hidden sm:inline">Whale Tape</span>
            </button>
          )}
          {onNavigateToVols && (
            <button
              onClick={() => {
                playKeyClick();
                onNavigateToVols();
              }}
              className="px-2.5 py-1 bg-[#0f1422] hover:bg-[#182034] text-[#8b9bb4] hover:text-[#00d2ff] border border-[#1e2638] rounded text-[11px] font-bold transition-all flex items-center gap-1.5"
            >
              <span>{'<F7 VOLS>'}</span>
              <span className="hidden sm:inline">Skews</span>
            </button>
          )}
        </div>
      </div>

      {/* INSTITUTIONAL METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Volume PCR */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold tracking-wider">
            <span>VOLUME P/C RATIO</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-extrabold"
              style={{
                backgroundColor: `${pcrData.sentimentColor}22`,
                color: pcrData.sentimentColor,
                border: `1px solid ${pcrData.sentimentColor}55`,
              }}
            >
              {pcrData.metrics.pcrVolume < 0.8 ? 'CALL HEAVY' : pcrData.metrics.pcrVolume > 1.1 ? 'PUT HEAVY' : 'BALANCED'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl sm:text-3xl font-black font-mono tracking-tight"
                style={{ color: pcrData.sentimentColor }}
              >
                {metrics.pcrVolume.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#8b9bb4]">
                vs 20D {historicalSeries[historicalSeries.length - 1]?.sma20PCR.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#8b9bb4] flex justify-between border-t border-[#141b2a] pt-1.5">
            <span>Calls: <strong className="text-[#00e676]">{formatLargeNum(metrics.totalCallVolume)}</strong></span>
            <span>Puts: <strong className="text-[#ff334b]">{formatLargeNum(metrics.totalPutVolume)}</strong></span>
          </div>
        </div>

        {/* Card 2: Open Interest PCR */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold tracking-wider">
            <span>OPEN INTEREST P/C</span>
            <span className="text-[#00d2ff] bg-[#00d2ff]/10 border border-[#00d2ff]/30 px-1.5 py-0.5 rounded text-[9px]">
              STRUCTURAL
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#00d2ff] tracking-tight">
                {metrics.pcrOI.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#8b9bb4]">
                Rank: <strong className="text-[#ff9900]">{pcrData.pcrPercentile30d}th %ile</strong>
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#8b9bb4] flex justify-between border-t border-[#141b2a] pt-1.5">
            <span>Call OI: <strong className="text-[#00e676]">{formatLargeNum(metrics.totalCallOI)}</strong></span>
            <span>Put OI: <strong className="text-[#ff334b]">{formatLargeNum(metrics.totalPutOI)}</strong></span>
          </div>
        </div>

        {/* Card 3: Premium-Weighted PCR */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold tracking-wider">
            <span>DOLLAR-WEIGHTED P/C</span>
            <span className="text-[#ffd600] bg-[#ffd600]/10 border border-[#ffd600]/30 px-1.5 py-0.5 rounded text-[9px]">
              CAPITAL FLOW
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#ffd600] tracking-tight">
                {metrics.pcrPremium.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#8b9bb4]">
                ATM: <strong className="text-white">{metrics.atmPCR.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#8b9bb4] flex justify-between border-t border-[#141b2a] pt-1.5">
            <span>Call $: <strong className="text-[#00e676]">{formatDollar(metrics.totalCallPremium)}</strong></span>
            <span>Put $: <strong className="text-[#ff334b]">{formatDollar(metrics.totalPutPremium)}</strong></span>
          </div>
        </div>

        {/* Card 4: Max Pain & Gamma Walls */}
        <div className="bg-[#07090e] border border-[#1e2638] rounded p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold tracking-wider">
            <span>MAX PAIN STRIKE</span>
            <span className="text-[#ff9900] bg-[#ff9900]/10 border border-[#ff9900]/30 px-1.5 py-0.5 rounded text-[9px]">
              PIN TARGET
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                ${pcrData.maxPainStrike.toFixed(2)}
              </span>
              <span
                className={`text-[11px] font-bold ${
                  pcrData.maxPainDiffPct >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
                }`}
              >
                {pcrData.maxPainDiffPct >= 0 ? '+' : ''}
                {pcrData.maxPainDiffPct}%
              </span>
            </div>
          </div>

          <div className="text-[11px] text-[#8b9bb4] flex justify-between border-t border-[#141b2a] pt-1.5">
            <span>Put Wall: <strong className="text-[#ff334b]">${pcrData.putWallStrike}</strong></span>
            <span>Call Wall: <strong className="text-[#00e676]">${pcrData.callWallStrike}</strong></span>
          </div>
        </div>

        {/* Card 5: Net Gamma Exposure (GEX) & Zero Flip */}
        <div
          onClick={() => {
            if (onOpenNetGamma) {
              playKeyClick();
              onOpenNetGamma();
            }
          }}
          className="bg-[#07090e] border border-[#1e2638] hover:border-[#a855f7]/60 rounded p-3 flex flex-col justify-between cursor-pointer transition-all group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-[#8b9bb4] text-[10px] uppercase font-bold tracking-wider group-hover:text-[#a855f7]">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#a855f7]" />
              <span>NET GAMMA (GEX)</span>
            </span>
            <span className="text-[#a855f7] bg-[#a855f7]/10 border border-[#a855f7]/30 px-1.5 py-0.5 rounded text-[9px] font-bold">
              {ticker.ivRank < 50 ? 'LONG Γ' : 'SHORT Γ'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  ticker.ivRank < 50 ? 'text-[#00e676]' : 'text-[#ff334b]'
                }`}
              >
                {ticker.ivRank < 50 ? '+$1.84B' : '-$420M'}
              </span>
            </div>
            <div className="text-[10px] text-[#ffd600] font-bold mt-0.5">
              Zero Flip: ${(ticker.price * (ticker.ivRank < 50 ? 0.985 : 1.015)).toFixed(1)}
            </div>
          </div>

          <div className="text-[11px] text-[#8b9bb4] flex justify-between border-t border-[#141b2a] pt-1.5">
            <span className="text-[#a855f7] font-bold group-hover:underline flex items-center gap-1">
              <span>Analyze GEX</span>
              <ArrowRight className="w-3 h-3" />
            </span>
            <span className="text-[#64748b] text-[10px]">Dealer Convexity</span>
          </div>
        </div>
      </div>

      {/* SENTIMENT GAUGE & CONTRARIAN INTERPRETATION */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141b2a] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[#8b9bb4] text-[10px] uppercase font-bold tracking-wider">
              MARKET SENTIMENT REGIME:
            </span>
            <span
              className="text-xs font-black tracking-wide"
              style={{ color: pcrData.sentimentColor }}
            >
              {pcrData.sentimentLabel}
            </span>
          </div>
          <div className="text-[11px] text-[#8b9bb4]">
            30-Day Historical PCR Percentile: <strong className="text-[#ff9900]">{pcrData.pcrPercentile30d}%</strong>
          </div>
        </div>

        {/* Visual Sentiment Spectrum Bar */}
        <div className="relative pt-2 pb-5">
          <div className="h-3 rounded-full overflow-hidden flex shadow-inner border border-[#1e2638]">
            {/* Extreme Greed */}
            <div className="w-[20%] bg-gradient-to-r from-emerald-600 to-emerald-400" title="Extreme Call Greed (< 0.60)" />
            {/* Bullish */}
            <div className="w-[20%] bg-gradient-to-r from-emerald-400 to-cyan-400" title="Bullish Call Accumulation (0.60 - 0.82)" />
            {/* Neutral */}
            <div className="w-[20%] bg-gradient-to-r from-cyan-400 to-amber-400" title="Balanced Neutral (0.82 - 1.05)" />
            {/* Bearish */}
            <div className="w-[20%] bg-gradient-to-r from-amber-400 to-orange-500" title="Elevated Put Hedging (1.05 - 1.35)" />
            {/* Extreme Fear */}
            <div className="w-[20%] bg-gradient-to-r from-orange-500 to-rose-600" title="Extreme Put Capitulation (> 1.35)" />
          </div>

          {/* Current Needle / Marker */}
          <div
            className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{
              left: `${Math.max(5, Math.min(95, pcrData.sentimentScore))}%`,
            }}
          >
            <div
              className="w-3.5 h-3.5 rotate-45 border-2 border-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ backgroundColor: pcrData.sentimentColor }}
            />
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap"
              style={{
                backgroundColor: '#0a0e18',
                color: pcrData.sentimentColor,
                border: `1px solid ${pcrData.sentimentColor}`,
              }}
            >
              PCR {metrics.pcrVolume.toFixed(2)}
            </span>
          </div>

          {/* Scale Labels */}
          <div className="flex justify-between text-[9px] text-[#8b9bb4] mt-3 font-mono">
            <span className="text-emerald-400">{'< 0.60 (Extreme Greed)'}</span>
            <span className="text-cyan-400">0.75 (Bullish)</span>
            <span className="text-amber-400">0.95 (Neutral Baseline)</span>
            <span className="text-orange-400">1.20 (Hedging)</span>
            <span className="text-rose-400">{'> 1.35 (Capitulation Fear)'}</span>
          </div>
        </div>

        {/* Contrarian Intelligence Alert Box */}
        <div className="bg-[#0b0f1a] border border-[#1e2638] rounded p-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#ff9900] shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="text-[#ff9900] font-bold">Quantitative Note: </span>
            <span className="text-[#cbd5e1]">{pcrData.contrarianInterpretation}</span>
          </div>
        </div>
      </div>

      {/* CHART TABS: HISTORICAL PCR TREND VS STRIKE PROFILE */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded shadow-2xl overflow-hidden flex flex-col">
        {/* Tab Selector Header */}
        <div className="bg-[#0b0f1a] border-b border-[#1e2638] px-3 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playKeyClick();
                setActiveChartTab('historical');
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChartTab === 'historical'
                  ? 'bg-[#ff9900] text-black shadow-sm font-extrabold'
                  : 'bg-[#0f1422] text-[#8b9bb4] hover:text-white border border-[#1e2638]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>30-DAY PCR TREND VS UNDERLYING</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                setActiveChartTab('strikes');
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeChartTab === 'strikes'
                  ? 'bg-[#ff9900] text-black shadow-sm font-extrabold'
                  : 'bg-[#0f1422] text-[#8b9bb4] hover:text-white border border-[#1e2638]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>STRIKE CALL VS PUT PROFILE</span>
            </button>
          </div>

          {/* Sub-controls */}
          {activeChartTab === 'strikes' && (
            <div className="flex items-center gap-2">
              <span className="text-[#8b9bb4] text-[10px] uppercase">Metric:</span>
              <div className="flex bg-[#05070a] border border-[#1e2638] rounded p-0.5">
                <button
                  onClick={() => {
                    playKeyClick();
                    setStrikeMetric('oi');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    strikeMetric === 'oi' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  OPEN INTEREST
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setStrikeMetric('volume');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    strikeMetric === 'volume' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  DAILY VOLUME
                </button>
              </div>
            </div>
          )}

          {activeChartTab === 'historical' && (
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#ff9900]" />
                <span className="text-[#ff9900]">Daily PCR (Vol)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#00d2ff]" />
                <span className="text-[#00d2ff]">20D SMA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 border-t border-dashed border-[#00e676]" />
                <span className="text-[#00e676]">{ticker.symbol} Price</span>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: 30-DAY HISTORICAL PCR CHART */}
        {activeChartTab === 'historical' && (
          <div className="p-3 sm:p-4 flex flex-col gap-2">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${histSvgWidth} ${histSvgHeight}`}
                className="w-full h-auto min-w-[650px] overflow-visible"
              >
                <defs>
                  {/* Background horizontal zone gradients */}
                  <linearGradient id="pcrZoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff334b" stopOpacity="0.08" />
                    <stop offset="50%" stopColor="#ff9900" stopOpacity="0.03" />
                    <stop offset="100%" stopColor="#00e676" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Plot Area Background */}
                <rect
                  x={histPadding.left}
                  y={histPadding.top}
                  width={histInnerWidth}
                  height={histInnerHeight}
                  fill="url(#pcrZoneGrad)"
                  stroke="#1e2638"
                  strokeWidth="1"
                />

                {/* Horizontal PCR reference grid lines */}
                {[0.6, 0.8, 1.0, 1.2, 1.4].map((ratioVal) => {
                  const y = getHistPcrY(ratioVal);
                  return (
                    <g key={ratioVal}>
                      <line
                        x1={histPadding.left}
                        y1={y}
                        x2={histPadding.left + histInnerWidth}
                        y2={y}
                        stroke="#1a2336"
                        strokeDasharray={ratioVal === 1.0 ? '4 2' : '2 4'}
                        strokeWidth="1"
                      />
                      <text
                        x={histPadding.left - 8}
                        y={y + 3}
                        fill={ratioVal === 1.0 ? '#ff9900' : '#64748b'}
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="monospace"
                        fontWeight={ratioVal === 1.0 ? 'bold' : 'normal'}
                      >
                        {ratioVal.toFixed(1)}x
                      </text>
                    </g>
                  );
                })}

                {/* Right Axis: Stock Price Labels */}
                {[0.1, 0.5, 0.9].map((fraction) => {
                  const priceVal = minPrice + fraction * (maxPrice - minPrice);
                  const y = getHistPriceY(priceVal);
                  return (
                    <g key={fraction}>
                      <text
                        x={histPadding.left + histInnerWidth + 8}
                        y={y + 3}
                        fill="#00e676"
                        fontSize="9"
                        textAnchor="start"
                        fontFamily="monospace"
                        opacity="0.8"
                      >
                        ${priceVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Underlying Stock Price Curve (Dashed Green) */}
                <path
                  d={priceLinePath}
                  fill="none"
                  stroke="#00e676"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.65"
                />

                {/* 20-Day SMA PCR Line (Cyan) */}
                <path
                  d={sma20LinePath}
                  fill="none"
                  stroke="#00d2ff"
                  strokeWidth="1.5"
                  opacity="0.9"
                />

                {/* Daily PCR Line (Amber) */}
                <path
                  d={pcrLinePath}
                  fill="none"
                  stroke="#ff9900"
                  strokeWidth="2.2"
                />

                {/* Historical Points & Hover Trigger Area */}
                {historicalSeries.map((pt, idx) => {
                  const cx = getHistX(idx);
                  const cyPcr = getHistPcrY(pt.pcrVolume);
                  const cyPrice = getHistPriceY(pt.underlyingPrice);
                  const isHovered = hoveredHistIndex === idx;

                  return (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredHistIndex(idx)}
                      onMouseLeave={() => setHoveredHistIndex(null)}
                    >
                      {/* Vertical highlight line on hover */}
                      {isHovered && (
                        <line
                          x1={cx}
                          y1={histPadding.top}
                          x2={cx}
                          y2={histPadding.top + histInnerHeight}
                          stroke="#ff9900"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* PCR Point circle */}
                      <circle
                        cx={cx}
                        cy={cyPcr}
                        r={isHovered ? 5 : 2.5}
                        fill={isHovered ? '#ffffff' : '#ff9900'}
                        stroke="#ff9900"
                        strokeWidth="1.5"
                      />

                      {/* Stock price point circle on hover */}
                      {isHovered && (
                        <circle
                          cx={cx}
                          cy={cyPrice}
                          r={4}
                          fill="#00e676"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                      )}

                      {/* Date labels at bottom */}
                      {idx % 4 === 0 && (
                        <text
                          x={cx}
                          y={histPadding.top + histInnerHeight + 16}
                          fill="#64748b"
                          fontSize="9"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {pt.date}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Hover Inspector Box */}
                {hoveredHistIndex !== null && (
                  <g
                    transform={`translate(${Math.min(
                      histInnerWidth - 110,
                      Math.max(histPadding.left + 10, getHistX(hoveredHistIndex) - 75)
                    )}, ${histPadding.top + 10})`}
                  >
                    <rect
                      x="0"
                      y="0"
                      width="150"
                      height="75"
                      rx="4"
                      fill="#0b0f1a"
                      stroke="#ff9900"
                      strokeWidth="1.2"
                      opacity="0.95"
                    />
                    <text x="8" y="16" fill="#8b9bb4" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {historicalSeries[hoveredHistIndex].date}
                    </text>
                    <text x="8" y="32" fill="#ff9900" fontSize="10" fontFamily="monospace">
                      PCR Vol: <tspan fontWeight="bold" fill="#ffffff">{historicalSeries[hoveredHistIndex].pcrVolume.toFixed(2)}x</tspan>
                    </text>
                    <text x="8" y="47" fill="#00d2ff" fontSize="10" fontFamily="monospace">
                      20D SMA: <tspan fontWeight="bold" fill="#ffffff">{historicalSeries[hoveredHistIndex].sma20PCR.toFixed(2)}x</tspan>
                    </text>
                    <text x="8" y="62" fill="#00e676" fontSize="10" fontFamily="monospace">
                      Price: <tspan fontWeight="bold" fill="#ffffff">${historicalSeries[hoveredHistIndex].underlyingPrice.toFixed(2)}</tspan>
                    </text>
                  </g>
                )}
              </svg>
            </div>
            <div className="text-[10px] text-[#64748b] flex justify-between px-2">
              <span>Left Axis: Put/Call Volume Ratio</span>
              <span>Right Axis: Stock Price ($)</span>
            </div>
          </div>
        )}

        {/* TAB 2: STRIKE PROFILE (CALLS VS PUTS SIDE-BY-SIDE) */}
        {activeChartTab === 'strikes' && (
          <div className="p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between text-[11px] bg-[#05070a] border border-[#1e2638] p-2.5 rounded">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[#00e676]">
                  <span className="w-2.5 h-2.5 bg-[#00e676] rounded-sm" />
                  <span>Call {strikeMetric.toUpperCase()}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#ff334b]">
                  <span className="w-2.5 h-2.5 bg-[#ff334b] rounded-sm" />
                  <span>Put {strikeMetric.toUpperCase()}</span>
                </span>
              </div>

              <div className="flex items-center gap-4 text-[10px] text-[#8b9bb4]">
                <span>Spot: <strong className="text-white">${ticker.price.toFixed(2)}</strong></span>
                <span>Max Pain: <strong className="text-[#ffd600]">${pcrData.maxPainStrike}</strong></span>
                <span>Put Wall: <strong className="text-[#ff334b]">${pcrData.putWallStrike}</strong></span>
                <span>Call Wall: <strong className="text-[#00e676]">${pcrData.callWallStrike}</strong></span>
              </div>
            </div>

            {/* Strike Bars Grid */}
            <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {strikes.map((s) => {
                const callVal = strikeMetric === 'oi' ? s.callOI : s.callVolume;
                const putVal = strikeMetric === 'oi' ? s.putOI : s.putVolume;
                const callBarPct = Math.min(100, (callVal / currentMaxStrikeVal) * 100);
                const putBarPct = Math.min(100, (putVal / currentMaxStrikeVal) * 100);

                const isCurrentAtm = Math.abs(s.strike - ticker.price) <= 1.5;

                return (
                  <div
                    key={s.strike}
                    onMouseEnter={() => setHoveredStrike(s)}
                    className={`flex items-center text-[11px] py-1 px-2 rounded transition-colors ${
                      isCurrentAtm
                        ? 'bg-[#ff9900]/10 border border-[#ff9900]/40'
                        : s.isMaxPain
                        ? 'bg-[#ffd600]/10 border border-[#ffd600]/30'
                        : 'hover:bg-[#0b101c] border border-transparent'
                    }`}
                  >
                    {/* Left: Call Bar (right-aligned to center) */}
                    <div className="flex-1 flex items-center justify-end gap-2 pr-2">
                      <span className="text-[#8b9bb4] text-[10px] hidden sm:inline">
                        {formatLargeNum(callVal)}
                      </span>
                      <div className="h-4 w-32 sm:w-44 bg-[#0a0e18] rounded overflow-hidden flex justify-end">
                        <div
                          className="h-full bg-gradient-to-l from-emerald-500 to-emerald-700 rounded-l"
                          style={{ width: `${callBarPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Center: Strike Pill */}
                    <div className="w-20 shrink-0 text-center flex flex-col items-center">
                      <span
                        className={`font-black font-mono text-xs px-1.5 py-0.5 rounded ${
                          isCurrentAtm
                            ? 'bg-[#ff9900] text-black font-extrabold'
                            : s.isMaxPain
                            ? 'bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/50'
                            : 'text-white'
                        }`}
                      >
                        ${s.strike.toFixed(1)}
                      </span>
                      {s.isMaxPain && (
                        <span className="text-[8px] text-[#ffd600] font-bold">MAX PAIN</span>
                      )}
                      {s.isCallWall && !s.isMaxPain && (
                        <span className="text-[8px] text-[#00e676] font-bold">CALL WALL</span>
                      )}
                      {s.isPutWall && !s.isMaxPain && (
                        <span className="text-[8px] text-[#ff334b] font-bold">PUT WALL</span>
                      )}
                    </div>

                    {/* Right: Put Bar (left-aligned from center) */}
                    <div className="flex-1 flex items-center justify-start gap-2 pl-2">
                      <div className="h-4 w-32 sm:w-44 bg-[#0a0e18] rounded overflow-hidden flex justify-start">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-rose-700 rounded-r"
                          style={{ width: `${putBarPct}%` }}
                        />
                      </div>
                      <span className="text-[#8b9bb4] text-[10px] hidden sm:inline">
                        {formatLargeNum(putVal)}
                      </span>
                      <span className="text-[9px] text-[#8b9bb4] ml-auto">
                        P/C: <strong className={s.pcrOI > 1.2 ? 'text-[#ff334b]' : s.pcrOI < 0.7 ? 'text-[#00e676]' : 'text-white'}>{s.pcrOI.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* EXPIRATION BREAKDOWN BLOTTER */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl">
        <div className="bg-[#0b0f1a] border-b border-[#1e2638] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#ff9900] font-bold text-xs uppercase tracking-wider">
              MATURITY-LEVEL PUT/CALL BREAKDOWN BLOTTER
            </span>
            <span className="text-[10px] text-[#8b9bb4]">
              // Volume & Open Interest Ratios across all standard expirations
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-[#080c14] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                <th className="py-2.5 px-3">Expiration</th>
                <th className="py-2.5 px-3">DTE</th>
                <th className="py-2.5 px-3 text-right">Call Volume</th>
                <th className="py-2.5 px-3 text-right">Put Volume</th>
                <th className="py-2.5 px-3 text-right text-[#ff9900]">Vol PCR</th>
                <th className="py-2.5 px-3 text-right">Call OI</th>
                <th className="py-2.5 px-3 text-right">Put OI</th>
                <th className="py-2.5 px-3 text-right text-[#00d2ff]">OI PCR</th>
                <th className="py-2.5 px-3 text-right">Call Premium</th>
                <th className="py-2.5 px-3 text-right">Put Premium</th>
                <th className="py-2.5 px-3 text-right text-[#ffd600]">Dollar PCR</th>
                <th className="py-2.5 px-3 text-center">Bias</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b28]">
              {expirations.map((exp) => {
                return (
                  <tr
                    key={exp.dte}
                    className="hover:bg-[#0c1220] transition-colors font-mono"
                  >
                    <td className="py-2 px-3 font-bold text-white">{exp.formattedDate}</td>
                    <td className="py-2 px-3 text-[#8b9bb4]">{exp.dte}d</td>
                    <td className="py-2 px-3 text-right text-[#00e676]">{formatLargeNum(exp.callVolume)}</td>
                    <td className="py-2 px-3 text-right text-[#ff334b]">{formatLargeNum(exp.putVolume)}</td>
                    <td className="py-2 px-3 text-right font-black text-[#ff9900]">
                      {exp.pcrVolume.toFixed(2)}x
                    </td>
                    <td className="py-2 px-3 text-right text-[#00e676]">{formatLargeNum(exp.callOI)}</td>
                    <td className="py-2 px-3 text-right text-[#ff334b]">{formatLargeNum(exp.putOI)}</td>
                    <td className="py-2 px-3 text-right font-black text-[#00d2ff]">
                      {exp.pcrOI.toFixed(2)}x
                    </td>
                    <td className="py-2 px-3 text-right text-[#8b9bb4]">{formatDollar(exp.callPremium)}</td>
                    <td className="py-2 px-3 text-right text-[#8b9bb4]">{formatDollar(exp.putPremium)}</td>
                    <td className="py-2 px-3 text-right font-bold text-[#ffd600]">
                      {exp.pcrPremium.toFixed(2)}x
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          exp.sentiment === 'BULLISH'
                            ? 'bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30'
                            : exp.sentiment === 'BEARISH'
                            ? 'bg-[#ff334b]/10 text-[#ff334b] border border-[#ff334b]/30'
                            : 'bg-[#ffb020]/10 text-[#ffb020] border border-[#ffb020]/30'
                        }`}
                      >
                        {exp.sentiment}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {onNavigateToChain && (
                        <button
                          onClick={() => {
                            playKeyClick();
                            onNavigateToChain(exp.dte);
                          }}
                          className="px-2 py-0.5 bg-[#141b2a] hover:bg-[#ff9900] hover:text-black text-[#8b9bb4] border border-[#1e2638] rounded text-[10px] font-bold transition-colors"
                        >
                          View Chain
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
