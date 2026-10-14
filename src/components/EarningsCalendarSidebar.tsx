import React from 'react';
import { Ticker } from '../types/options';
import { Calendar, TrendingUp, Zap, Clock } from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';

interface EarningsCalendarSidebarProps {
  tickers: Record<string, Ticker>;
  selectedSymbol: string;
  onSelectTicker: (symbol: string) => void;
  onNavigateToOpec?: () => void;
}

export const EarningsCalendarSidebar: React.FC<EarningsCalendarSidebarProps> = ({
  tickers,
  selectedSymbol,
  onSelectTicker,
  onNavigateToOpec,
}) => {
  // Filter tickers that have upcoming earnings and sort by days to earnings
  const upcomingEarnings = Object.values(tickers)
    .filter((t) => t.daysToEarnings !== null && t.daysToEarnings !== undefined && t.daysToEarnings > 0)
    .sort((a, b) => (a.daysToEarnings ?? 999) - (b.daysToEarnings ?? 999));

  // Render SVG 5-day IV trend sparkline
  const renderIvSparkline = (ivTrend: number[] | undefined, isSelected: boolean) => {
    if (!ivTrend || ivTrend.length < 2) {
      return <div className="text-[8px] text-[#555]">No IV Trend</div>;
    }

    const width = 64;
    const height = 20;
    const padding = 2;

    const min = Math.min(...ivTrend);
    const max = Math.max(...ivTrend);
    const range = max - min || 1;

    const points = ivTrend.map((val, idx) => {
      const x = padding + (idx / (ivTrend.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = `M ${points.join(' L ')}`;
    const areaData = `${pathData} L ${width - padding},${height} L ${padding},${height} Z`;

    const startVal = ivTrend[0];
    const endVal = ivTrend[ivTrend.length - 1];
    const isIncreasing = endVal >= startVal;
    const strokeColor = isSelected ? '#ff9900' : isIncreasing ? '#00d2ff' : '#43a047';

    return (
      <div className="flex flex-col items-end" title={`5-Day IV Pre-Earnings Trend: ${ivTrend.map((v) => `${v.toFixed(0)}%`).join(' → ')}`}>
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id={`sparkGrad-${ivTrend[0]}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaData} fill={`url(#sparkGrad-${ivTrend[0]})`} />
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Highlight end point */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].split(',')[0]}
              cy={points[points.length - 1].split(',')[1]}
              r="2"
              fill={strokeColor}
            />
          )}
        </svg>
        <span className="text-[8px] text-[#8c8c8c] font-mono leading-none mt-0.5">
          {endVal.toFixed(0)}% IV
        </span>
      </div>
    );
  };

  return (
    <div className="gadget">
      <div className="gadget-header flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-[var(--accent)]" />
          <span>Earnings Calendar</span>
        </span>
        <span className="text-[9px] text-[#8c8c8c] font-normal">Next 60 Days</span>
      </div>

      <div className="gadget-content p-0 max-h-[220px] overflow-y-auto no-scrollbar">
        {upcomingEarnings.length === 0 ? (
          <div className="p-3 text-center text-[#666] text-[10px]">
            No upcoming earnings in watchlist
          </div>
        ) : (
          <div className="divide-y divide-[#262626]">
            {upcomingEarnings.map((t) => {
              const isSelected = t.symbol === selectedSymbol;
              const isUrgent = (t.daysToEarnings ?? 99) <= 21;

              return (
                <div
                  key={t.symbol}
                  onClick={() => {
                    playKeyClick();
                    onSelectTicker(t.symbol);
                  }}
                  className={`p-2 cursor-pointer transition-all hover:bg-[#252525] flex items-center justify-between gap-1.5 ${
                    isSelected ? 'bg-[#2d3035] border-l-2 border-[var(--accent)]' : ''
                  }`}
                >
                  {/* Left: Ticker & Date */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold font-mono text-[11px] ${isSelected ? 'text-[var(--accent)]' : 'text-white'}`}>
                        {t.symbol}
                      </span>
                      <span
                        className={`px-1 py-0.2 rounded text-[8px] font-extrabold font-mono ${
                          isUrgent
                            ? 'bg-[#ffd600]/25 text-[#ffd600] border border-[#ffd600]/40'
                            : 'bg-[#333] text-[#aaa]'
                        }`}
                      >
                        {t.daysToEarnings}d
                      </span>
                    </div>
                    <div className="text-[9px] text-[#8c8c8c] truncate">
                      {t.earningsDate || 'TBD'}
                    </div>
                  </div>

                  {/* Center: Volatility Impact */}
                  <div className="flex flex-col items-center shrink-0 text-center">
                    <span className="text-[8px] text-[#8c8c8c]">EST MOVE</span>
                    <span className="text-[10px] font-bold text-[#00d2ff]">
                      {t.earningsEstimatedMovePct ? `±${t.earningsEstimatedMovePct}%` : '±5.0%'}
                    </span>
                  </div>

                  {/* Right: 5-Day IV Trend Sparkline */}
                  <div className="shrink-0">
                    {renderIvSparkline(t.earningsIvTrend5d, isSelected)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OPEC & Energy Catalyst Quick Link */}
      {onNavigateToOpec && (
        <div
          onClick={() => {
            playKeyClick();
            onNavigateToOpec();
          }}
          className="p-1.5 bg-[#141b2a] hover:bg-[#1a2438] border-t border-[#1e2638] cursor-pointer flex items-center justify-between transition-colors"
          title="Open OPEC+ Meetings & Crude IV Intelligence Hub"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9900] animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-[#ff9900] truncate">
              OPEC+ 57th JMMC (Oct 02)
            </span>
          </div>
          <span className="text-[9px] text-cyan-400 font-bold shrink-0 hover:underline">
            IV Crush &gt;
          </span>
        </div>
      )}
    </div>
  );
};
