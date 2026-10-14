import React from 'react';
import { MacroIndexQuote } from '../types/options';
import { Radio } from 'lucide-react';

interface BloombergBottomRibbonProps {
  macroIndices: MacroIndexQuote[];
  isLiveTickActive: boolean;
  onToggleLiveTick: () => void;
}

export const BloombergBottomRibbon: React.FC<BloombergBottomRibbonProps> = ({
  macroIndices,
  isLiveTickActive,
  onToggleLiveTick,
}) => {
  return (
    <footer className="fixed bottom-[48px] md:bottom-0 left-0 right-0 z-30 md:z-40 bg-[#05070a] border-t-2 border-[#1e2638] text-[11px] font-mono text-[#cbd5e1] select-none">
      <div className="flex items-center justify-between px-3 py-1">
        {/* OPRA / Market Feed Connectivity Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#1e2638] shrink-0">
          <button
            onClick={onToggleLiveTick}
            className="flex items-center gap-1.5 hover:text-white"
            title="Toggle Live Market Feeds"
          >
            <Radio
              className={`w-3 h-3 ${
                isLiveTickActive ? 'text-[#00e676] animate-pulse' : 'text-[#ff334b]'
              }`}
            />
            <span className="font-bold text-[#8b9bb4]">
              {isLiveTickActive ? 'OPRA FEED: CONNECTED' : 'FEED: PAUSED'}
            </span>
            <span className="text-[9px] text-[#556782] hidden md:inline">[12ms]</span>
          </button>
        </div>

        {/* Scrolling Macro Indices Tape */}
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5 px-3 flex-1 whitespace-nowrap">
          {macroIndices.map((idx) => {
            const isPositive = idx.change >= 0;
            return (
              <div key={idx.symbol} className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-[#8b9bb4] font-bold text-[10px]">{idx.symbol}</span>
                <span className="text-white font-bold">
                  {idx.isRateOrYield
                    ? `${idx.value.toFixed(3)}%`
                    : idx.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`font-semibold text-[10px] ${
                    isPositive ? 'text-[#00e676]' : 'text-[#ff334b]'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {idx.changePct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Terminal Legend & Status */}
        <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-[#1e2638] shrink-0 text-[#8b9bb4] text-[10px]">
          <span>TYPE <strong className="text-[#ff9900]">OMON</strong> FOR OPTIONS</span>
          <span>TYPE <strong className="text-[#00d2ff]">OVME</strong> FOR VALUATION</span>
          <span className="text-[#556782]">BLOOMBERG TERMINAL v26.4</span>
        </div>
      </div>
    </footer>
  );
};
