import React from 'react';
import { Ticker } from '../types/options';
import { ArrowUpRight, ArrowDownRight, Zap, Activity, Flame, Calendar, Building2 } from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';
import { isTickerETF } from '../services/companyAndEtfProfiles';

interface UnderlyingBarProps {
  tickers: Record<string, Ticker>;
  selectedTicker: Ticker;
  onSelectTicker: (symbol: string) => void;
  onManualTick: () => void;
  pcrValue?: number;
  onOpenPcr?: () => void;
  onOpenExpectedMove?: () => void;
  onOpenNetGamma?: () => void;
  onOpenQuadWitching?: () => void;
  onOpenOptionsExpiration?: () => void;
  onOpenTSXFuturesHub?: () => void;
  onOpenCompanyProfile?: () => void;
  netGammaDollarString?: string;
  activeDte?: number;
}

export const UnderlyingBar: React.FC<UnderlyingBarProps> = ({
  tickers,
  selectedTicker,
  onSelectTicker,
  onManualTick,
  pcrValue,
  onOpenPcr,
  onOpenExpectedMove,
  onOpenNetGamma,
  onOpenQuadWitching,
  onOpenOptionsExpiration,
  onOpenTSXFuturesHub,
  onOpenCompanyProfile,
  netGammaDollarString,
  activeDte = 30,
}) => {
  const isUp = selectedTicker.change >= 0;
  const dayRangePct = Math.min(
    100,
    Math.max(
      0,
      ((selectedTicker.price - selectedTicker.low) / (selectedTicker.high - selectedTicker.low || 1)) * 100
    )
  );

  // Compute 1-sigma expected move for active DTE
  const expectedMoveDollar = selectedTicker.price * (selectedTicker.currentIV || 0.25) * Math.sqrt(Math.max(1, activeDte) / 365);
  const expectedMovePct = (expectedMoveDollar / selectedTicker.price) * 100;

  return (
    <div className="bg-[#080b14] border-b border-[#1e2638] px-3 sm:px-5 py-2 font-mono text-xs select-none">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Symbol Quick Select + Real-time price quote */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Ticker pills */}
          <div className="flex items-center gap-1 bg-[#05070a] p-1 rounded border border-[#1e2638]">
            {Object.keys(tickers).map((sym) => {
              const t = tickers[sym];
              const active = sym === selectedTicker.symbol;
              const positive = t.change >= 0;
              return (
                <button
                  key={sym}
                  onClick={() => {
                    playKeyClick();
                    onSelectTicker(sym);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 border ${
                    active
                      ? 'bg-[#ff9900] text-black border-[#ff9900] shadow-[0_0_6px_rgba(255,153,0,0.4)] font-black'
                      : 'bg-[#0b0f1a] text-[#8b9bb4] hover:text-white border-[#1e2638] hover:bg-[#141b2a]'
                  }`}
                >
                  <span>{sym}</span>
                  <span
                    className={`font-mono text-[9px] font-normal ${
                      active ? 'text-black' : positive ? 'text-[#00e676]' : 'text-[#ff334b]'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {t.changePercent.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detailed Price Readout */}
          <div className="flex items-baseline gap-2.5">
            <span className="text-xl font-black font-mono text-white tracking-tight">
              ${selectedTicker.price.toFixed(2)}
            </span>

            <div
              className={`flex items-center text-xs font-mono font-bold ${
                isUp ? 'text-[#00e676]' : 'text-[#ff334b]'
              }`}
            >
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>
                {isUp ? '+' : ''}
                {selectedTicker.change.toFixed(2)} ({isUp ? '+' : ''}
                {selectedTicker.changePercent.toFixed(2)}%)
              </span>
            </div>

            <span className="text-[11px] text-[#64748b] hidden sm:inline">
              Prev ${selectedTicker.previousClose.toFixed(2)}
            </span>

            {onOpenCompanyProfile && (
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenCompanyProfile();
                }}
                className="px-2 py-0.5 rounded bg-[#101726] hover:bg-[#1a253c] text-[#38bdf8] hover:text-[#7dd3fc] border border-[#223354] hover:border-[#38bdf8]/60 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs ml-1"
                title={`Open ${selectedTicker.symbol} ${isTickerETF(selectedTicker.symbol, selectedTicker.name) ? 'ETF Fundamentals & Holdings' : 'Company Profile & Valuation Multiples'} <DES>`}
              >
                <Building2 className="w-3 h-3 text-[#38bdf8]" />
                <span>{isTickerETF(selectedTicker.symbol, selectedTicker.name) ? 'ETF FUNDAMENTALS' : 'COMPANY PROFILE'}</span>
                <span className="text-[8px] px-1 rounded bg-[#38bdf8]/20 font-mono font-bold">{'<DES>'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Fundamental & Options Volatility Stats */}
        <div className="flex items-center gap-3.5 text-xs overflow-x-auto no-scrollbar py-0.5">
          {/* Day's Range Visualizer */}
          <div className="hidden sm:flex flex-col gap-1 min-w-[120px]">
            <div className="flex justify-between text-[9px] text-[#8b9bb4] font-mono">
              <span>L: ${selectedTicker.low.toFixed(2)}</span>
              <span>H: ${selectedTicker.high.toFixed(2)}</span>
            </div>
            <div className="h-1.5 w-full bg-[#141b2a] rounded-full overflow-hidden relative border border-[#1e2638]">
              <div
                className="absolute top-0 bottom-0 bg-[#00e676] rounded-full"
                style={{ width: `${dayRangePct}%` }}
              />
            </div>
          </div>

          <div className="h-4 w-px bg-[#1e2638] hidden sm:block" />

          {/* Volume */}
          <div>
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider">Volume</div>
            <div className="font-mono font-bold text-[#cbd5e1]">{selectedTicker.volume}</div>
          </div>

          <div className="h-4 w-px bg-[#1e2638]" />

          {/* IV Rank */}
          <div>
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider">IV Rank</div>
            <div className="font-mono font-bold text-[#ff9900] flex items-center gap-1">
              <span>{selectedTicker.ivRank}%</span>
              <span className="text-[10px] text-[#8b9bb4]">({(selectedTicker.currentIV * 100).toFixed(1)}%)</span>
            </div>
          </div>

          {/* Expected Price Move Metric Button */}
          <div className="h-4 w-px bg-[#1e2638]" />
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenExpectedMove) onOpenExpectedMove();
            }}
            title="Open Expected Price Move Matrix & Multi-Expiration Probability Analysis"
            className="text-left bg-[#05070a] hover:bg-[#141b2a] px-2 py-0.5 rounded border border-[#1e2638] hover:border-[#00d2ff]/60 transition-all cursor-pointer group"
          >
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#00d2ff]">
              <Activity className="w-2.5 h-2.5 text-[#00d2ff]" />
              <span>EXP MOVE</span>
              <span className="text-[8px] text-[#ffd600] font-bold">±1σ</span>
            </div>
            <div className="font-mono font-bold flex items-center gap-1 text-white">
              <span className="text-[#00e676]">±${expectedMoveDollar.toFixed(2)}</span>
              <span className="text-[10px] text-[#00d2ff]">({expectedMovePct.toFixed(1)}%)</span>
            </div>
          </button>

          {/* Net Gamma / GEX Metric Button */}
          <div className="h-4 w-px bg-[#1e2638]" />
          <button
            onClick={() => {
              playKeyClick();
              if (onOpenNetGamma) onOpenNetGamma();
            }}
            title="Open Net Gamma Exposure (GEX) Engine & Zero-Gamma Volatility Trigger"
            className="text-left bg-[#05070a] hover:bg-[#141b2a] px-2 py-0.5 rounded border border-[#1e2638] hover:border-[#a855f7]/60 transition-all cursor-pointer group"
          >
            <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#a855f7]">
              <Zap className="w-2.5 h-2.5 text-[#a855f7]" />
              <span>NET GAMMA</span>
              <span className="text-[8px] text-[#00e676] font-bold">GEX</span>
            </div>
            <div className="font-mono font-bold flex items-center gap-1 text-white">
              <span className="text-[#a855f7]">{netGammaDollarString || '+$1.84B'}</span>
            </div>
          </button>

          {/* Put/Call Ratio Metric Button */}
          {pcrValue !== undefined && (
            <>
              <div className="h-4 w-px bg-[#1e2638]" />
              <button
                onClick={() => {
                  playKeyClick();
                  if (onOpenPcr) onOpenPcr();
                }}
                title="Open Institutional Put/Call Ratio Analyzer <F11 PCR>"
                className="text-left bg-[#05070a] hover:bg-[#141b2a] px-2 py-0.5 rounded border border-[#1e2638] hover:border-[#ff9900]/50 transition-all cursor-pointer group"
              >
                <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#ff9900]">
                  <span>P/C RATIO</span>
                  <span className="text-[8px] text-[#00d2ff]">{'<PCR>'}</span>
                </div>
                <div className="font-mono font-bold flex items-center gap-1">
                  <span
                    className={
                      pcrValue < 0.8
                        ? 'text-[#00e676]'
                        : pcrValue > 1.1
                        ? 'text-[#ff334b]'
                        : 'text-[#ffb020]'
                    }
                  >
                    {pcrValue.toFixed(2)}x
                  </span>
                  <span className="text-[9px] text-[#8b9bb4]">
                    ({pcrValue < 0.8 ? 'Bullish' : pcrValue > 1.1 ? 'Hedging' : 'Neutral'})
                  </span>
                </div>
              </button>
            </>
          )}

          {/* Options Expiration Master Calendar Metric / Launch Button */}
          {onOpenOptionsExpiration && (
            <>
              <div className="h-4 w-px bg-[#1e2638]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenOptionsExpiration();
                }}
                title="Show Options Expiration Schedule, Volatility Term Structure & Settlement Rules <EXP>"
                className="text-left bg-[#05070a] hover:bg-[#141b2a] px-2 py-0.5 rounded border border-[#1e2638] hover:border-[#ff9900]/70 transition-all cursor-pointer group"
              >
                <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#ff9900]">
                  <Calendar className="w-2.5 h-2.5 text-[#ff9900]" />
                  <span>OPTIONS EXP</span>
                  <span className="text-[8px] text-[#38bdf8] font-bold">{activeDte}D</span>
                </div>
                <div className="font-mono font-bold flex items-center gap-1 text-white">
                  <span className="text-[#ff9900]">18 CYCLES</span>
                </div>
              </button>
            </>
          )}

          {/* Quadruple Witching Metric / Quick Launch Button */}
          {onOpenQuadWitching && (
            <>
              <div className="h-4 w-px bg-[#1e2638]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenQuadWitching();
                }}
                title="Open Quadruple Witching Intelligence & Pin Risk Terminal <WITCH>"
                className="text-left bg-[#05070a] hover:bg-[#150e26] px-2 py-0.5 rounded border border-[#1e2638] hover:border-[#a855f7]/70 transition-all cursor-pointer group"
              >
                <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#a855f7]">
                  <Flame className="w-2.5 h-2.5 text-[#a855f7] animate-pulse" />
                  <span>QUAD WITCH</span>
                  <span className="text-[8px] text-[#ff9900] font-bold">80D</span>
                </div>
                <div className="font-mono font-bold flex items-center gap-1 text-white">
                  <span className="text-[#c084fc]">DEC 18 '26</span>
                </div>
              </button>
            </>
          )}

          {/* TSX Futures (Montreal Exchange) Hub Button */}
          {onOpenTSXFuturesHub && (
            <>
              <div className="h-4 w-px bg-[#1e2638]" />
              <button
                onClick={() => {
                  playKeyClick();
                  onOpenTSXFuturesHub();
                }}
                title="Open TSX / Montreal Exchange (MX) Futures Platform & Cash-and-Carry Arbitrage <TSXF>"
                className="text-left bg-[#05070a] hover:bg-[#1b0d13] px-2 py-0.5 rounded border border-[#1e2638] hover:border-[#ff334b]/70 transition-all cursor-pointer group"
              >
                <div className="text-[9px] text-[#8b9bb4] uppercase tracking-wider flex items-center gap-1 group-hover:text-[#ff334b]">
                  <span className="text-[10px]">🇨🇦</span>
                  <span>TSX FUTURES</span>
                  <span className="text-[8px] text-[#ff334b] font-bold">MX</span>
                </div>
                <div className="font-mono font-bold flex items-center gap-1 text-white">
                  <span className="text-[#ff334b]">/SXF · /CGB</span>
                </div>
              </button>
            </>
          )}

          <div className="h-4 w-px bg-[#1e2638]" />

          {/* Manual Tick trigger */}
          <button
            onClick={() => {
              playKeyClick();
              onManualTick();
            }}
            title="Simulate instant price tick"
            className="flex items-center gap-1 px-2 py-1 bg-[#141b2a] hover:bg-[#1e2638] text-[#cbd5e1] hover:text-white rounded border border-[#222d44] text-[11px] font-bold transition-colors active:scale-95"
          >
            <Zap className="w-3 h-3 text-[#ff9900]" />
            <span className="hidden md:inline">Tick Market</span>
          </button>
        </div>
      </div>
    </div>
  );
};
