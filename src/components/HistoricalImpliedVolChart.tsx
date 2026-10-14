import React, { useState, useMemo } from 'react';
import { Ticker, ExpirationOptionChain } from '../types/options';
import {
  buildHistoricalVolTimeSeries,
  calculateVolStatsSummary,
  calculateVolatilityCones,
  VolDataPoint,
} from '../utils/volatilityAnalytics';
import { playKeyClick } from '../utils/terminalSound';
import {
  TrendingUp,
  Activity,
  Layers,
  BarChart2,
  Calendar,
  Info,
  Check,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Maximize2,
} from 'lucide-react';

interface HistoricalImpliedVolChartProps {
  ticker: Ticker;
  allChains?: ExpirationOptionChain[];
  onNavigateToChain?: () => void;
  onNavigateToValuation?: () => void;
  onNavigateToCone?: () => void;
  onNavigateToSkews?: () => void;
}

export const HistoricalImpliedVolChart: React.FC<HistoricalImpliedVolChartProps> = ({
  ticker,
  allChains,
  onNavigateToChain,
  onNavigateToValuation,
  onNavigateToCone,
  onNavigateToSkews,
}) => {
  // Timeframe selector
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M');

  // Series visibility toggles
  const [showIV30, setShowIV30] = useState(true);
  const [showHV30, setShowHV30] = useState(true);
  const [showHV10, setShowHV10] = useState(true);
  const [showHV60, setShowHV60] = useState(false);
  const [showPrice, setShowPrice] = useState(true);

  // Estimator type: 'close' (Close-to-Close) vs 'parkinson' (Parkinson High-Low)
  const [estimator, setEstimator] = useState<'close' | 'parkinson'>('close');

  // Sub-chart display: 'spread' (IV - HV points) vs 'ratio' (IV / HV)
  const [subChartMode, setSubChartMode] = useState<'spread' | 'ratio'>('spread');

  // Active secondary tab / view in this screen
  const [viewMode, setViewMode] = useState<'chart' | 'cone' | 'matrix'>('chart');

  // Hover state
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate full historical volatility series
  const fullSeries = useMemo(() => {
    return buildHistoricalVolTimeSeries(ticker, ticker.candles, allChains);
  }, [ticker, allChains]);

  // Filter series based on selected timeframe
  const series = useMemo(() => {
    if (fullSeries.length === 0) return [];
    if (timeframe === '1M') return fullSeries.slice(-22);
    if (timeframe === '3M') return fullSeries.slice(-65);
    if (timeframe === '6M') return fullSeries.slice(-130);
    return fullSeries; // 1Y
  }, [fullSeries, timeframe]);

  // Quantitative Stats Summary
  const stats = useMemo(() => {
    return calculateVolStatsSummary(series, ticker);
  }, [series, ticker]);

  // Volatility Cones
  const cones = useMemo(() => {
    return calculateVolatilityCones(ticker.candles, ticker, allChains);
  }, [ticker, allChains]);

  // Chart layout dimensions
  const svgWidth = 920;
  const svgHeight = 360;
  const chartPadding = { top: 30, right: 65, bottom: 40, left: 55 };
  const subChartHeight = 90;
  const mainPlotHeight = svgHeight - chartPadding.top - chartPadding.bottom;

  // Calculate min & max volatility for Y-axis scaling
  const { minVol, maxVol, minPrice, maxPrice } = useMemo(() => {
    if (series.length === 0) {
      return { minVol: 0.1, maxVol: 0.6, minPrice: 100, maxPrice: 200 };
    }

    const vols: number[] = [];
    const prices: number[] = [];

    series.forEach((d) => {
      prices.push(d.price);
      if (showIV30 && d.iv30) vols.push(d.iv30);
      if (showHV30) {
        const hv = estimator === 'parkinson' ? d.hvParkinson30 : d.hv30;
        if (hv) vols.push(hv);
      }
      if (showHV10 && d.hv10) vols.push(d.hv10);
      if (showHV60 && d.hv60) vols.push(d.hv60);
    });

    if (vols.length === 0) {
      vols.push(stats.currentIV30, stats.currentHV30);
    }

    const rawMinV = Math.min(...vols);
    const rawMaxV = Math.max(...vols);
    const vMargin = (rawMaxV - rawMinV) * 0.12 || 0.05;

    const rawMinP = Math.min(...prices);
    const rawMaxP = Math.max(...prices);
    const pMargin = (rawMaxP - rawMinP) * 0.1 || 5;

    return {
      minVol: Math.max(0.02, rawMinV - vMargin),
      maxVol: rawMaxV + vMargin,
      minPrice: Math.max(1, rawMinP - pMargin),
      maxPrice: rawMaxP + pMargin,
    };
  }, [series, showIV30, showHV30, showHV10, showHV60, estimator, stats]);

  // Coordinate mapping functions
  const getX = (index: number) => {
    const usableWidth = svgWidth - chartPadding.left - chartPadding.right;
    const count = Math.max(1, series.length - 1);
    return chartPadding.left + (index / count) * usableWidth;
  };

  const getVolY = (vol: number) => {
    const range = maxVol - minVol || 0.1;
    const clamped = Math.max(minVol, Math.min(maxVol, vol));
    return chartPadding.top + mainPlotHeight - ((clamped - minVol) / range) * mainPlotHeight;
  };

  const getPriceY = (p: number) => {
    const range = maxPrice - minPrice || 1;
    return chartPadding.top + mainPlotHeight - ((p - minPrice) / range) * mainPlotHeight;
  };

  // Build SVG path strings
  const iv30Path = useMemo(() => {
    let p = '';
    series.forEach((d, idx) => {
      const x = getX(idx);
      const y = getVolY(d.iv30);
      p += `${idx === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return p;
  }, [series, minVol, maxVol]);

  const hv30Path = useMemo(() => {
    let p = '';
    let started = false;
    series.forEach((d, idx) => {
      const hv = estimator === 'parkinson' ? d.hvParkinson30 : d.hv30;
      if (hv === null) return;
      const x = getX(idx);
      const y = getVolY(hv);
      p += `${!started ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      started = true;
    });
    return p;
  }, [series, estimator, minVol, maxVol]);

  const hv10Path = useMemo(() => {
    let p = '';
    let started = false;
    series.forEach((d, idx) => {
      if (d.hv10 === null) return;
      const x = getX(idx);
      const y = getVolY(d.hv10);
      p += `${!started ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      started = true;
    });
    return p;
  }, [series, minVol, maxVol]);

  const hv60Path = useMemo(() => {
    let p = '';
    let started = false;
    series.forEach((d, idx) => {
      if (d.hv60 === null) return;
      const x = getX(idx);
      const y = getVolY(d.hv60);
      p += `${!started ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      started = true;
    });
    return p;
  }, [series, minVol, maxVol]);

  const pricePath = useMemo(() => {
    let p = '';
    series.forEach((d, idx) => {
      const x = getX(idx);
      const y = getPriceY(d.price);
      p += `${idx === 0 ? 'M' : ' L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return p;
  }, [series, minPrice, maxPrice]);

  // Sub-chart spread max & min
  const { maxSpreadAbs, maxRatioDiff } = useMemo(() => {
    const spreads = series.map((s) => Math.abs(s.spread ?? 0));
    const ratios = series.map((s) => Math.abs((s.ratio ?? 1) - 1));
    return {
      maxSpreadAbs: Math.max(0.04, Math.max(...spreads) * 1.15),
      maxRatioDiff: Math.max(0.2, Math.max(...ratios) * 1.15),
    };
  }, [series]);

  // Mouse hover resolution
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const usableWidth = svgWidth - chartPadding.left - chartPadding.right;

    if (mouseX < chartPadding.left || mouseX > svgWidth - chartPadding.right) {
      setHoverIndex(null);
      return;
    }

    const ratio = (mouseX - chartPadding.left) / usableWidth;
    const index = Math.round(ratio * (series.length - 1));
    if (index >= 0 && index < series.length) {
      setHoverIndex(index);
    }
  };

  const activePoint: VolDataPoint =
    hoverIndex !== null && series[hoverIndex]
      ? series[hoverIndex]
      : series[series.length - 1] || fullSeries[fullSeries.length - 1];

  const activeHV30 =
    activePoint ? (estimator === 'parkinson' ? activePoint.hvParkinson30 : activePoint.hv30) : null;

  return (
    <div className="p-2 sm:p-3 lg:p-4 w-full max-w-full ml-0 mr-auto flex flex-col gap-4 font-mono text-xs select-none text-left">
      {/* Institutional Bloomberg Terminal Header */}
      <div className="bg-[#07090e] border border-[#1e2638] rounded overflow-hidden shadow-2xl">
        <div className="bg-[#090d16] px-4 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[#ff9900] font-black text-sm tracking-wider">
              {ticker.symbol} US Equity HIVG
            </span>
            <span className="text-[#8b9bb4] text-[11px] hidden sm:inline">
              // HISTORICAL & IMPLIED VOLATILITY (HVT)
            </span>
            <div className="flex items-center gap-2 text-xs bg-[#111726] px-2.5 py-0.5 rounded border border-[#1e2638]">
              <span className="text-[#8b9bb4]">LAST:</span>
              <strong className="text-white">${ticker.price.toFixed(2)}</strong>
              <span
                className={`font-bold ${
                  ticker.change >= 0 ? 'text-[#00e676]' : 'text-[#f43f5e]'
                }`}
              >
                {ticker.change >= 0 ? '+' : ''}
                {ticker.change.toFixed(2)} ({ticker.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Quick Screen Navigation Links */}
          <div className="flex items-center gap-2 text-[11px]">
            {onNavigateToSkews && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToSkews();
                }}
                className="px-2 py-0.5 rounded border border-[#2d3748] bg-[#141b2a] text-[#8b9bb4] hover:text-[#ff9900] hover:border-[#ff9900] transition-colors flex items-center gap-1"
              >
                <Layers className="w-3 h-3 text-[#ff9900]" />
                <span>EXPIRATION SKEWS</span>
              </button>
            )}
            {onNavigateToCone && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToCone();
                }}
                className="px-2 py-0.5 rounded border border-[#2d3748] bg-[#141b2a] text-[#8b9bb4] hover:text-[#ff9900] hover:border-[#ff9900] transition-colors flex items-center gap-1"
              >
                <TrendingUp className="w-3 h-3 text-[#fbbf24]" />
                <span>PROB CONE</span>
              </button>
            )}
            {onNavigateToChain && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToChain();
                }}
                className="px-2 py-0.5 rounded border border-[#ff9900]/40 bg-[#ff9900]/10 text-[#ff9900] hover:bg-[#ff9900] hover:text-black font-bold transition-all flex items-center gap-1"
              >
                <span>OMON CHAIN</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Real-time Volatility Diagnostics Ticker Strip */}
        <div className="bg-[#05070a] px-4 py-2 border-b border-[#141b2a] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-[11px]">
          <div>
            <div className="text-[#8b9bb4] text-[10px]">30D IMPL VOL (IV)</div>
            <div className="text-base font-black text-[#ff9900]">
              {(stats.currentIV30 * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#8b9bb4]">Rank: {stats.ivRank}%</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">30D REALIZED (HV)</div>
            <div className="text-base font-black text-[#00e5ff]">
              {(stats.currentHV30 * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#8b9bb4]">Rank: {stats.hvRank}%</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">VOL SPREAD (IV - HV)</div>
            <div
              className={`text-base font-black ${
                stats.currentSpread >= 0 ? 'text-[#00e676]' : 'text-[#f43f5e]'
              }`}
            >
              {stats.currentSpread >= 0 ? '+' : ''}
              {(stats.currentSpread * 100).toFixed(2)} pts
            </div>
            <div className="text-[10px] text-[#8b9bb4]">Z-Score: {stats.spreadZScore}σ</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">IV / HV RATIO</div>
            <div className="text-base font-black text-white">
              {stats.currentHV30 > 0 ? (stats.currentIV30 / stats.currentHV30).toFixed(2) : '1.00'}x
            </div>
            <div className="text-[10px] text-[#8b9bb4]">
              {stats.currentIV30 > stats.currentHV30 ? 'IV Premium' : 'IV Discount'}
            </div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">10D FAST HV</div>
            <div className="text-sm font-bold text-[#00e676]">
              {(stats.currentHV10 * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#8b9bb4]">Responsive Realized</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">60D SLOW HV</div>
            <div className="text-sm font-bold text-[#c084fc]">
              {(stats.currentHV60 * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#8b9bb4]">Base Realized</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">PRICE/IV CORRELATION</div>
            <div className="text-sm font-bold text-[#38bdf8]">
              {stats.priceIvCorrelation > 0 ? '+' : ''}
              {stats.priceIvCorrelation.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#8b9bb4]">Negative Asymmetry</div>
          </div>

          <div>
            <div className="text-[#8b9bb4] text-[10px]">VOLATILITY REGIME</div>
            <div
              className="text-xs font-bold truncate mt-0.5"
              style={{ color: stats.regimeColor }}
            >
              {stats.regimeLabel.split(' ')[0]} {stats.regimeLabel.split(' ')[1] || ''}
            </div>
            <div className="text-[10px] text-[#8b9bb4] truncate">
              {stats.currentSpread > 0 ? 'Vega Harvest Edge' : 'Long Gamma Edge'}
            </div>
          </div>
        </div>

        {/* View Mode & Control Strip */}
        <div className="bg-[#0b0f19] px-4 py-2 border-b border-[#1e2638] flex flex-wrap items-center justify-between gap-3">
          {/* Main View Selector */}
          <div className="flex items-center gap-1.5 bg-[#07090e] p-1 rounded border border-[#1e2638]">
            <button
              onClick={() => {
                playKeyClick();
                setViewMode('chart');
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'chart'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b2a]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>TIME-SERIES (HV vs IV)</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                setViewMode('cone');
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cone'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b2a]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>VOLATILITY CONE</span>
            </button>

            <button
              onClick={() => {
                playKeyClick();
                setViewMode('matrix');
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'text-[#8b9bb4] hover:text-white hover:bg-[#141b2a]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>QUANT DIAGNOSTICS & PLAYBOOK</span>
            </button>
          </div>

          {/* Timeframe & Model Controls */}
          {viewMode === 'chart' && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Timeframe Buttons */}
              <div className="flex items-center gap-1 bg-[#07090e] p-0.5 rounded border border-[#1e2638]">
                {(['1M', '3M', '6M', '1Y'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      playKeyClick();
                      setTimeframe(tf);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      timeframe === tf
                        ? 'bg-[#ff9900] text-black'
                        : 'text-[#8b9bb4] hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Estimator Toggle */}
              <div className="flex items-center gap-1 text-[11px] bg-[#07090e] px-2 py-1 rounded border border-[#1e2638]">
                <span className="text-[#8b9bb4]">HV MODEL:</span>
                <button
                  onClick={() => {
                    playKeyClick();
                    setEstimator(estimator === 'close' ? 'parkinson' : 'close');
                  }}
                  className="font-bold text-[#00e5ff] hover:underline"
                >
                  {estimator === 'close' ? 'CLOSE-TO-CLOSE' : 'PARKINSON (H-L)'}
                </button>
              </div>

              {/* Sub-chart mode */}
              <div className="flex items-center gap-1 bg-[#07090e] p-0.5 rounded border border-[#1e2638]">
                <button
                  onClick={() => {
                    playKeyClick();
                    setSubChartMode('spread');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    subChartMode === 'spread'
                      ? 'bg-[#1e2638] text-white'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  VRP SPREAD
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setSubChartMode('ratio');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    subChartMode === 'ratio'
                      ? 'bg-[#1e2638] text-white'
                      : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  IV/HV RATIO
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend & Metric Checkbox Toggle Bar */}
        {viewMode === 'chart' && (
          <div className="bg-[#080b12] px-4 py-2 border-b border-[#141b2a] flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-4">
              {/* 30D IV */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showIV30}
                  onChange={(e) => {
                    playKeyClick();
                    setShowIV30(e.target.checked);
                  }}
                  className="accent-[#ff9900] rounded"
                />
                <span className="w-3 h-1 bg-[#ff9900] inline-block rounded-full" />
                <span className="text-white font-bold">30D Implied Vol (IV)</span>
                <span className="text-[#ff9900]">
                  {(activePoint.iv30 * 100).toFixed(1)}%
                </span>
              </label>

              {/* 30D HV */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHV30}
                  onChange={(e) => {
                    playKeyClick();
                    setShowHV30(e.target.checked);
                  }}
                  className="accent-[#00e5ff] rounded"
                />
                <span className="w-3 h-1 bg-[#00e5ff] inline-block rounded-full" />
                <span className="text-white font-bold">30D Realized Vol (HV)</span>
                <span className="text-[#00e5ff]">
                  {activeHV30 !== null ? `${(activeHV30 * 100).toFixed(1)}%` : '--'}
                </span>
              </label>

              {/* 10D HV */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHV10}
                  onChange={(e) => {
                    playKeyClick();
                    setShowHV10(e.target.checked);
                  }}
                  className="accent-[#00e676] rounded"
                />
                <span className="w-3 h-1 bg-[#00e676] inline-block rounded-full" />
                <span className="text-[#8b9bb4]">10D Fast HV</span>
                <span className="text-[#00e676]">
                  {activePoint.hv10 !== null ? `${(activePoint.hv10 * 100).toFixed(1)}%` : '--'}
                </span>
              </label>

              {/* 60D HV */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHV60}
                  onChange={(e) => {
                    playKeyClick();
                    setShowHV60(e.target.checked);
                  }}
                  className="accent-[#c084fc] rounded"
                />
                <span className="w-3 h-1 bg-[#c084fc] inline-block rounded-full" />
                <span className="text-[#8b9bb4]">60D Slow HV</span>
                <span className="text-[#c084fc]">
                  {activePoint.hv60 !== null ? `${(activePoint.hv60 * 100).toFixed(1)}%` : '--'}
                </span>
              </label>

              {/* Underlying Price */}
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => {
                    playKeyClick();
                    setShowPrice(e.target.checked);
                  }}
                  className="accent-[#94a3b8] rounded"
                />
                <span className="w-3 h-0.5 border-t border-dashed border-[#94a3b8] inline-block" />
                <span className="text-[#8b9bb4]">Stock Price</span>
                <span className="text-[#94a3b8] font-bold">${activePoint.price.toFixed(2)}</span>
              </label>
            </div>

            {/* Hovered Date & Spread Display */}
            <div className="flex items-center gap-3 text-xs bg-[#111726] px-3 py-1 rounded border border-[#1e2638]">
              <span className="text-[#ff9900] font-bold">{activePoint.date}</span>
              <span className="text-[#8b9bb4]">|</span>
              <span className="text-[#8b9bb4]">Spread:</span>
              <span
                className={`font-black ${
                  (activePoint.spread ?? 0) >= 0 ? 'text-[#00e676]' : 'text-[#f43f5e]'
                }`}
              >
                {(activePoint.spread ?? 0) >= 0 ? '+' : ''}
                {(((activePoint.spread ?? 0) * 100)).toFixed(2)} pts
              </span>
              <span className="text-[#8b9bb4]">|</span>
              <span className="text-[#8b9bb4]">Ratio:</span>
              <span className="text-white font-bold">{activePoint.ratio ?? '--'}x</span>
            </div>
          </div>
        )}

        {/* VIEW 1: TIME-SERIES MAIN CHART & SUB-CHART */}
        {viewMode === 'chart' && (
          <div className="p-4 bg-[#05070a]">
            <div className="relative w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight + subChartHeight + 20}`}
                className="w-full h-auto cursor-crosshair select-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <defs>
                  {/* Linear gradient for IV curve */}
                  <linearGradient id="ivGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ff9900" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ff9900" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Linear gradient for HV curve */}
                  <linearGradient id="hvGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradient for Positive Spread */}
                  <linearGradient id="posSpreadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00e676" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00e676" stopOpacity="0.2" />
                  </linearGradient>

                  {/* Gradient for Negative Spread */}
                  <linearGradient id="negSpreadGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* Background Grid & Plot Region */}
                <rect
                  x={chartPadding.left}
                  y={chartPadding.top}
                  width={svgWidth - chartPadding.left - chartPadding.right}
                  height={mainPlotHeight}
                  fill="#060910"
                  stroke="#141b2a"
                  strokeWidth="1"
                />

                {/* Horizontal Volatility Gridlines */}
                {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((v) => {
                  if (v < minVol || v > maxVol) return null;
                  const y = getVolY(v);
                  return (
                    <g key={v}>
                      <line
                        x1={chartPadding.left}
                        y1={y}
                        x2={svgWidth - chartPadding.right}
                        y2={y}
                        stroke="#131a29"
                        strokeDasharray="3 3"
                      />
                      {/* Left Y-axis label (% Vol) */}
                      <text
                        x={chartPadding.left - 8}
                        y={y + 3.5}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {(v * 100).toFixed(0)}%
                      </text>
                    </g>
                  );
                })}

                {/* Right Y-axis for Underlying Price */}
                {showPrice && (
                  <>
                    {[0.25, 0.5, 0.75].map((pct) => {
                      const p = minPrice + (maxPrice - minPrice) * pct;
                      const y = getPriceY(p);
                      return (
                        <text
                          key={pct}
                          x={svgWidth - chartPadding.right + 8}
                          y={y + 3.5}
                          fill="#475569"
                          fontSize="9"
                          textAnchor="start"
                          fontFamily="monospace"
                        >
                          ${p.toFixed(0)}
                        </text>
                      );
                    })}
                    <text
                      x={svgWidth - 10}
                      y={chartPadding.top - 8}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="end"
                    >
                      STOCK ($)
                    </text>
                  </>
                )}

                {/* Left Y-axis Header */}
                <text
                  x={chartPadding.left}
                  y={chartPadding.top - 10}
                  fill="#8b9bb4"
                  fontSize="9"
                  fontWeight="bold"
                >
                  VOLATILITY (%)
                </text>

                {/* Vertical Date Gridlines */}
                {series.map((d, idx) => {
                  const step = Math.max(1, Math.floor(series.length / 8));
                  if (idx % step !== 0 && idx !== series.length - 1) return null;
                  const x = getX(idx);
                  return (
                    <g key={d.date + idx}>
                      <line
                        x1={x}
                        y1={chartPadding.top}
                        x2={x}
                        y2={chartPadding.top + mainPlotHeight}
                        stroke="#131a29"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={x}
                        y={chartPadding.top + mainPlotHeight + 16}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                })}

                {/* Stock Price Curve Overlay */}
                {showPrice && (
                  <path
                    d={pricePath}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                    opacity="0.8"
                  />
                )}

                {/* 60D Slow HV Curve */}
                {showHV60 && (
                  <path
                    d={hv60Path}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                    strokeOpacity="0.85"
                  />
                )}

                {/* 10D Fast HV Curve */}
                {showHV10 && (
                  <path
                    d={hv10Path}
                    fill="none"
                    stroke="#00e676"
                    strokeWidth="1.5"
                    strokeOpacity="0.9"
                  />
                )}

                {/* 30D Realized Vol (HV30) Area & Curve */}
                {showHV30 && (
                  <>
                    <path
                      d={`${hv30Path} L ${getX(series.length - 1)} ${chartPadding.top + mainPlotHeight} L ${getX(
                        0
                      )} ${chartPadding.top + mainPlotHeight} Z`}
                      fill="url(#hvGrad)"
                    />
                    <path
                      d={hv30Path}
                      fill="none"
                      stroke="#00e5ff"
                      strokeWidth="2"
                    />
                  </>
                )}

                {/* 30D Implied Vol (IV30) Area & Curve */}
                {showIV30 && (
                  <>
                    <path
                      d={`${iv30Path} L ${getX(series.length - 1)} ${chartPadding.top + mainPlotHeight} L ${getX(
                        0
                      )} ${chartPadding.top + mainPlotHeight} Z`}
                      fill="url(#ivGrad)"
                    />
                    <path
                      d={iv30Path}
                      fill="none"
                      stroke="#ff9900"
                      strokeWidth="2.5"
                    />
                  </>
                )}

                {/* Interactive Crosshair & Cursor Marker */}
                {hoverIndex !== null && hoverIndex < series.length && (
                  <>
                    <line
                      x1={getX(hoverIndex)}
                      y1={chartPadding.top}
                      x2={getX(hoverIndex)}
                      y2={chartPadding.top + mainPlotHeight + subChartHeight + 20}
                      stroke="#ff9900"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />

                    {/* IV30 Marker Dot */}
                    {showIV30 && (
                      <circle
                        cx={getX(hoverIndex)}
                        cy={getVolY(series[hoverIndex].iv30)}
                        r="4"
                        fill="#ff9900"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* HV30 Marker Dot */}
                    {showHV30 && activeHV30 !== null && (
                      <circle
                        cx={getX(hoverIndex)}
                        cy={getVolY(activeHV30)}
                        r="4"
                        fill="#00e5ff"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}
                  </>
                )}

                {/* ======================================================== */}
                {/* SUB-CHART: VARIANCE RISK PREMIUM (IV - HV SPREAD)        */}
                {/* ======================================================== */}
                {(() => {
                  const subY = chartPadding.top + mainPlotHeight + 25;
                  const zeroY = subY + subChartHeight / 2;
                  const barWidth = Math.max(
                    2,
                    ((svgWidth - chartPadding.left - chartPadding.right) / series.length) * 0.75
                  );

                  return (
                    <g>
                      {/* Sub-chart container rect */}
                      <rect
                        x={chartPadding.left}
                        y={subY}
                        width={svgWidth - chartPadding.left - chartPadding.right}
                        height={subChartHeight}
                        fill="#070a12"
                        stroke="#141b2a"
                      />

                      {/* Header label */}
                      <text
                        x={chartPadding.left + 8}
                        y={subY + 12}
                        fill="#8b9bb4"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {subChartMode === 'spread'
                          ? 'VARIANCE RISK PREMIUM: (30D IV - 30D HV SPREAD PTS)'
                          : 'VOLATILITY RATIO: (30D IV / 30D HV)'}
                      </text>

                      {/* Zero baseline */}
                      <line
                        x1={chartPadding.left}
                        y1={zeroY}
                        x2={svgWidth - chartPadding.right}
                        y2={zeroY}
                        stroke="#2d3748"
                        strokeWidth="1"
                      />

                      {/* Zero label */}
                      <text
                        x={chartPadding.left - 6}
                        y={zeroY + 3}
                        fill="#64748b"
                        fontSize="8"
                        textAnchor="end"
                      >
                        {subChartMode === 'spread' ? '0.0 pts' : '1.00x'}
                      </text>

                      {/* Max/Min spread labels */}
                      <text
                        x={chartPadding.left - 6}
                        y={subY + 10}
                        fill="#00e676"
                        fontSize="8"
                        textAnchor="end"
                      >
                        {subChartMode === 'spread'
                          ? `+${(maxSpreadAbs * 100).toFixed(0)}`
                          : `+${maxRatioDiff.toFixed(1)}`}
                      </text>
                      <text
                        x={chartPadding.left - 6}
                        y={subY + subChartHeight - 2}
                        fill="#f43f5e"
                        fontSize="8"
                        textAnchor="end"
                      >
                        {subChartMode === 'spread'
                          ? `-${(maxSpreadAbs * 100).toFixed(0)}`
                          : `-${maxRatioDiff.toFixed(1)}`}
                      </text>

                      {/* Histogram bars */}
                      {series.map((d, idx) => {
                        const x = getX(idx) - barWidth / 2;
                        if (subChartMode === 'spread') {
                          const spread = d.spread ?? 0;
                          const heightPx = Math.min(
                            subChartHeight / 2 - 2,
                            (Math.abs(spread) / maxSpreadAbs) * (subChartHeight / 2)
                          );
                          const isPos = spread >= 0;
                          const barY = isPos ? zeroY - heightPx : zeroY;

                          return (
                            <rect
                              key={'bar-' + idx}
                              x={x}
                              y={barY}
                              width={barWidth}
                              height={Math.max(1, heightPx)}
                              fill={isPos ? 'url(#posSpreadGrad)' : 'url(#negSpreadGrad)'}
                              stroke={isPos ? '#00e676' : '#f43f5e'}
                              strokeWidth="0.5"
                            />
                          );
                        } else {
                          const ratioDiff = (d.ratio ?? 1) - 1;
                          const heightPx = Math.min(
                            subChartHeight / 2 - 2,
                            (Math.abs(ratioDiff) / maxRatioDiff) * (subChartHeight / 2)
                          );
                          const isPos = ratioDiff >= 0;
                          const barY = isPos ? zeroY - heightPx : zeroY;

                          return (
                            <rect
                              key={'bar-' + idx}
                              x={x}
                              y={barY}
                              width={barWidth}
                              height={Math.max(1, heightPx)}
                              fill={isPos ? '#38bdf8' : '#f43f5e'}
                              opacity="0.8"
                            />
                          );
                        }
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* VIEW 2: VOLATILITY CONES (HV CONE VS IMPLIED TERM STRUCTURE) */}
        {viewMode === 'cone' && (
          <div className="p-4 bg-[#05070a] flex flex-col gap-4">
            <div className="bg-[#090d16] p-3 rounded border border-[#1e2638] flex items-center justify-between">
              <div>
                <span className="text-[#ff9900] font-bold text-sm">
                  HISTORICAL VOLATILITY CONE (HV CONE)
                </span>
                <p className="text-[11px] text-[#8b9bb4]">
                  Visualizes historical realized volatility dispersion bands (Min, 25%, Median, 75%, Max)
                  against current implied volatility term structure.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#ff9900] inline-block rounded" />
                  <span className="text-white font-bold">Current Implied Vol (IV)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#00e5ff] inline-block rounded" />
                  <span className="text-white font-bold">Current Realized (HV)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-[#1e293b] border border-[#3b82f6] inline-block rounded" />
                  <span className="text-[#8b9bb4]">25% - 75% Median Range</span>
                </div>
              </div>
            </div>

            {/* SVG Volatility Cone Chart */}
            <div className="bg-[#070a12] p-4 rounded border border-[#1e2638]">
              <svg viewBox="0 0 880 320" className="w-full h-auto font-mono">
                {(() => {
                  const coneWidth = 880;
                  const coneHeight = 320;
                  const pad = { top: 25, right: 40, bottom: 45, left: 60 };
                  const plotW = coneWidth - pad.left - pad.right;
                  const plotH = coneHeight - pad.top - pad.bottom;

                  const allVals = cones.flatMap((c) => [c.minHV, c.maxHV, c.currentIV, c.currentHV]);
                  const minV = Math.max(0.04, Math.min(...allVals) * 0.85);
                  const maxV = Math.max(...allVals) * 1.15;

                  const getConeX = (idx: number) => {
                    const count = Math.max(1, cones.length - 1);
                    return pad.left + (idx / count) * plotW;
                  };

                  const getConeY = (v: number) => {
                    return pad.top + plotH - ((v - minV) / (maxV - minV || 1)) * plotH;
                  };

                  // Max-Min outer envelope area
                  let maxPath = '';
                  let minPath = '';
                  let p75Path = '';
                  let p25Path = '';
                  let medianPath = '';
                  let curIvPath = '';
                  let curHvPath = '';

                  cones.forEach((c, idx) => {
                    const x = getConeX(idx);
                    maxPath += `${idx === 0 ? 'M' : ' L'} ${x} ${getConeY(c.maxHV)}`;
                    p75Path += `${idx === 0 ? 'M' : ' L'} ${x} ${getConeY(c.p75HV)}`;
                    medianPath += `${idx === 0 ? 'M' : ' L'} ${x} ${getConeY(c.medianHV)}`;
                    p25Path += `${idx === 0 ? 'M' : ' L'} ${x} ${getConeY(c.p25HV)}`;
                    minPath = ` L ${x} ${getConeY(c.minHV)}` + minPath;
                    curIvPath += `${idx === 0 ? 'M' : ' L'} ${x} ${getConeY(c.currentIV)}`;
                    curHvPath += `${idx === 0 ? 'M' : ' L'} ${x} ${getConeY(c.currentHV)}`;
                  });

                  // Reverse p25 to create inner band polygon
                  let p25Rev = '';
                  for (let i = cones.length - 1; i >= 0; i--) {
                    p25Rev += ` L ${getConeX(i)} ${getConeY(cones[i].p25HV)}`;
                  }

                  return (
                    <g>
                      {/* Gridlines */}
                      {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((val) => {
                        if (val < minV || val > maxV) return null;
                        const y = getConeY(val);
                        return (
                          <g key={'cgrid-' + val}>
                            <line
                              x1={pad.left}
                              y1={y}
                              x2={coneWidth - pad.right}
                              y2={y}
                              stroke="#141c2c"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={pad.left - 8}
                              y={y + 3.5}
                              fill="#64748b"
                              fontSize="9"
                              textAnchor="end"
                            >
                              {(val * 100).toFixed(0)}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Outer Cone Envelope (Min - Max) */}
                      <path
                        d={`${maxPath} ${minPath} Z`}
                        fill="#10192b"
                        stroke="#1e293b"
                        strokeWidth="1"
                      />

                      {/* Inner Interquartile Band (25% - 75%) */}
                      <path
                        d={`${p75Path} ${p25Rev} Z`}
                        fill="#172554"
                        stroke="#2563eb"
                        strokeWidth="1"
                        opacity="0.8"
                      />

                      {/* Median Realized Line */}
                      <path
                        d={medianPath}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />

                      {/* Current Realized HV Curve */}
                      <path
                        d={curHvPath}
                        fill="none"
                        stroke="#00e5ff"
                        strokeWidth="2"
                      />

                      {/* Current Implied IV Term Structure Curve */}
                      <path
                        d={curIvPath}
                        fill="none"
                        stroke="#ff9900"
                        strokeWidth="2.5"
                      />

                      {/* Markers and X labels */}
                      {cones.map((c, idx) => {
                        const x = getConeX(idx);
                        return (
                          <g key={c.label}>
                            <line
                              x1={x}
                              y1={pad.top}
                              x2={x}
                              y2={pad.top + plotH}
                              stroke="#141b2a"
                              strokeDasharray="2 2"
                            />
                            {/* X-axis Tenor Label */}
                            <text
                              x={x}
                              y={pad.top + plotH + 18}
                              fill="#ff9900"
                              fontSize="10"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {c.label}
                            </text>
                            <text
                              x={x}
                              y={pad.top + plotH + 30}
                              fill="#64748b"
                              fontSize="8"
                              textAnchor="middle"
                            >
                              {c.tenorDays}d
                            </text>

                            {/* IV Dot */}
                            <circle
                              cx={x}
                              cy={getConeY(c.currentIV)}
                              r="4.5"
                              fill="#ff9900"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                            {/* HV Dot */}
                            <circle
                              cx={x}
                              cy={getConeY(c.currentHV)}
                              r="4"
                              fill="#00e5ff"
                              stroke="#000"
                              strokeWidth="1.5"
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Cone Data Breakdown Table */}
            <div className="overflow-x-auto rounded border border-[#1e2638]">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-[#0b0f19] text-[#8b9bb4] uppercase text-[10px] border-b border-[#1e2638]">
                  <tr>
                    <th className="py-2 px-3">TENOR</th>
                    <th className="py-2 px-3 text-right">DAYS</th>
                    <th className="py-2 px-3 text-right text-[#00e5ff]">CURRENT HV</th>
                    <th className="py-2 px-3 text-right text-[#ff9900]">CURRENT IV</th>
                    <th className="py-2 px-3 text-right">SPREAD (IV-HV)</th>
                    <th className="py-2 px-3 text-right text-[#64748b]">MIN HV</th>
                    <th className="py-2 px-3 text-right text-[#60a5fa]">25% HV</th>
                    <th className="py-2 px-3 text-right text-[#93c5fd]">MEDIAN HV</th>
                    <th className="py-2 px-3 text-right text-[#60a5fa]">75% HV</th>
                    <th className="py-2 px-3 text-right text-[#64748b]">MAX HV</th>
                    <th className="py-2 px-3 text-center">IV RELATIVE TO CONE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141c2c] bg-[#07090e]">
                  {cones.map((c) => {
                    const spread = c.currentIV - c.currentHV;
                    const isAboveMedian = c.currentIV >= c.medianHV;
                    const isAbove75 = c.currentIV >= c.p75HV;

                    return (
                      <tr key={c.label} className="hover:bg-[#0f1422] transition-colors">
                        <td className="py-2 px-3 font-bold text-white">{c.label}</td>
                        <td className="py-2 px-3 text-right text-[#8b9bb4]">{c.tenorDays}d</td>
                        <td className="py-2 px-3 text-right font-bold text-[#00e5ff]">
                          {(c.currentHV * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right font-black text-[#ff9900]">
                          {(c.currentIV * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            spread >= 0 ? 'text-[#00e676]' : 'text-[#f43f5e]'
                          }`}
                        >
                          {spread >= 0 ? '+' : ''}
                          {(spread * 100).toFixed(1)} pts
                        </td>
                        <td className="py-2 px-3 text-right text-[#64748b]">
                          {(c.minHV * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right text-[#60a5fa]">
                          {(c.p25HV * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#93c5fd]">
                          {(c.medianHV * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right text-[#60a5fa]">
                          {(c.p75HV * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right text-[#64748b]">
                          {(c.maxHV * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isAbove75 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40">
                              TOP QUARTILE (RICH)
                            </span>
                          ) : isAboveMedian ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40">
                              ABOVE MEDIAN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40">
                              BELOW MEDIAN (CHEAP)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: QUANT DIAGNOSTICS & PLAYBOOK */}
        {viewMode === 'matrix' && (
          <div className="p-4 bg-[#05070a] flex flex-col gap-4">
            {/* Regime Banner */}
            <div className="bg-[#090d16] p-4 rounded border border-[#1e2638] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] text-[#8b9bb4] tracking-wider uppercase font-bold">
                  QUANTITATIVE VOLATILITY REGIME // BLOOMBERG PROFESSIONAL
                </div>
                <div
                  className="text-xl font-black mt-1"
                  style={{ color: stats.regimeColor }}
                >
                  {stats.regimeLabel}
                </div>
                <p className="text-xs text-[#cbd5e1] mt-1">
                  Implied Volatility ({(stats.currentIV30 * 100).toFixed(1)}%) is currently trading at a{' '}
                  <strong className="text-white">
                    {stats.currentSpread >= 0 ? '+' : ''}
                    {(stats.currentSpread * 100).toFixed(2)} vol point spread
                  </strong>{' '}
                  relative to 30-Day Realized Price Movement ({(stats.currentHV30 * 100).toFixed(1)}%).
                </p>
              </div>

              <div className="bg-[#111726] p-3 rounded border border-[#1e2638] min-w-[260px]">
                <div className="text-[10px] text-[#ff9900] font-bold uppercase">
                  RECOMMENDED STRATEGY PLAYBOOK
                </div>
                <div className="text-sm font-black text-white mt-1">
                  {stats.strategyRecommendation}
                </div>
                <div className="text-[10px] text-[#8b9bb4] mt-1">
                  Historical edge favorability: {stats.currentSpread > 0 ? 'Net Short Vega / Theta' : 'Net Long Gamma / Vega'}
                </div>
              </div>
            </div>

            {/* Comprehensive Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Implied Volatility Stats */}
              <div className="bg-[#07090e] border border-[#1e2638] rounded p-4">
                <div className="text-[#ff9900] font-bold text-xs uppercase flex items-center justify-between border-b border-[#1e2638] pb-2 mb-3">
                  <span>IMPLIED VOLATILITY (IV)</span>
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Current 30D IV:</span>
                    <span className="font-bold text-white">{(stats.currentIV30 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">IV Rank (52-Week):</span>
                    <span className="font-bold text-[#ff9900]">{stats.ivRank}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">IV Percentile:</span>
                    <span className="font-bold text-white">{stats.ivPercentile}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">52-Week IV High:</span>
                    <span className="font-bold text-[#f43f5e]">{(stats.ivHigh * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">52-Week IV Low:</span>
                    <span className="font-bold text-[#00e676]">{(stats.ivLow * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Realized Volatility Stats */}
              <div className="bg-[#07090e] border border-[#1e2638] rounded p-4">
                <div className="text-[#00e5ff] font-bold text-xs uppercase flex items-center justify-between border-b border-[#1e2638] pb-2 mb-3">
                  <span>REALIZED VOLATILITY (HV)</span>
                  <BarChart2 className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Current 30D HV:</span>
                    <span className="font-bold text-white">{(stats.currentHV30 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">10-Day Fast HV:</span>
                    <span className="font-bold text-[#00e676]">{(stats.currentHV10 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">60-Day Slow HV:</span>
                    <span className="font-bold text-[#c084fc]">{(stats.currentHV60 * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">HV Rank (52-Week):</span>
                    <span className="font-bold text-[#00e5ff]">{stats.hvRank}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">HV Percentile:</span>
                    <span className="font-bold text-white">{stats.hvPercentile}%</span>
                  </div>
                </div>
              </div>

              {/* Box 3: Variance Risk Premium / Spread Analysis */}
              <div className="bg-[#07090e] border border-[#1e2638] rounded p-4">
                <div className="text-[#00e676] font-bold text-xs uppercase flex items-center justify-between border-b border-[#1e2638] pb-2 mb-3">
                  <span>VARIANCE RISK PREMIUM (VRP)</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Current Spread (IV-HV):</span>
                    <span
                      className={`font-black ${
                        stats.currentSpread >= 0 ? 'text-[#00e676]' : 'text-[#f43f5e]'
                      }`}
                    >
                      {stats.currentSpread >= 0 ? '+' : ''}
                      {(stats.currentSpread * 100).toFixed(2)} pts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Historical Avg Spread:</span>
                    <span className="font-bold text-white">
                      {(stats.avgSpread * 100).toFixed(2)} pts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Spread Z-Score:</span>
                    <span className="font-bold text-white">{stats.spreadZScore} σ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Price / IV Correlation:</span>
                    <span className="font-bold text-[#38bdf8]">{stats.priceIvCorrelation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9bb4]">Market Overpricing:</span>
                    <span className="font-bold text-[#ff9900]">
                      {stats.currentSpread > 0
                        ? `${((stats.currentSpread / stats.currentHV30) * 100).toFixed(1)}% Premium`
                        : 'Discounted'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Options Guide for this Regime */}
            <div className="bg-[#0b0f19] border border-[#1e2638] rounded p-4">
              <span className="text-[#ff9900] font-bold text-xs uppercase">
                INSTITUTIONAL EXECUTION PLAYBOOK // {stats.regimeLabel}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                <div className="bg-[#07090e] p-3 rounded border border-[#141b2a]">
                  <div className="text-[#00e676] font-bold mb-1">
                    ✓ High Probability Setups (Positive Expectancy):
                  </div>
                  <ul className="text-[#cbd5e1] space-y-1 text-[11px] list-disc pl-4">
                    <li>
                      <strong>30-45 DTE Iron Condors / Short Strangle:</strong> Exploit the{' '}
                      {(stats.currentSpread * 100).toFixed(1)} vol point premium over realized price
                      dispersion.
                    </li>
                    <li>
                      <strong>Calendar / Diagonal Call Spreads:</strong> Sell elevated near-term IV while
                      holding lower-volatility back month protection.
                    </li>
                    <li>
                      <strong>Covered Call / Cash-Secured Puts:</strong> Capture rich option premium to reduce
                      cost basis on underlying shares.
                    </li>
                  </ul>
                </div>

                <div className="bg-[#07090e] p-3 rounded border border-[#141c2a]">
                  <div className="text-[#f43f5e] font-bold mb-1">
                    ⚠ Strategies with Structural Headwinds:
                  </div>
                  <ul className="text-[#cbd5e1] space-y-1 text-[11px] list-disc pl-4">
                    <li>
                      <strong>Long Straddles / Strangles:</strong> Realized moves must exceed{' '}
                      {(stats.currentIV30 * 100).toFixed(1)}% annualized to break even against theta
                      bleed.
                    </li>
                    <li>
                      <strong>Outright Naked Long Puts/Calls:</strong> High volatility crush hazard upon post-earnings
                      or catalyst resolution.
                    </li>
                    <li>
                      <strong>Long Vega Calendars:</strong> Vulnerable to rapid IV contraction toward historical mean.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
