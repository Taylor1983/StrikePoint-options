import React from 'react';
import { Ticker } from '../types/options';
import { QuadrupleWitchingView } from './QuadrupleWitchingView';
import { X, Flame, Maximize2 } from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';

interface QuadrupleWitchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicker: Ticker;
  allTickers: Record<string, Ticker>;
  onSelectTicker: (symbol: string) => void;
  onNavigateToChain: (dte?: number) => void;
  onNavigateToRisk?: () => void;
  onNavigateToStrategyCatalog?: () => void;
  onPopOut?: () => void;
}

export const QuadrupleWitchingModal: React.FC<QuadrupleWitchingModalProps> = ({
  isOpen,
  onClose,
  currentTicker,
  allTickers,
  onSelectTicker,
  onNavigateToChain,
  onNavigateToRisk,
  onNavigateToStrategyCatalog,
  onPopOut,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#080c16] border-2 border-[#a855f7]/60 rounded-xl shadow-[0_0_35px_rgba(168,85,247,0.3)] w-full max-w-[1450px] max-h-[94vh] flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Window Header Bar */}
        <div className="bg-[#0d1222] border-b border-[#1e2638] px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#a855f7]/20 border border-[#a855f7]/50 rounded text-[#d8b4fe] shadow-[0_0_8px_rgba(168,85,247,0.3)]">
              <Flame className="w-4 h-4 text-[#a855f7] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white tracking-wide">
                  QUADRUPLE WITCHING INTELLIGENCE &amp; PIN RISK MONITOR
                </span>
                <span className="bg-[#a855f7] text-black text-[9.5px] font-black px-1.5 py-0.2 rounded">
                  OPEX 4W
                </span>
                <span className="text-[10px] text-[#ff9900] font-mono font-bold">
                  &lt;WITCH&gt; &lt;GO&gt;
                </span>
              </div>
              <div className="text-[10px] text-[#8b9bb4]">
                Quarterly Futures &amp; Options Expiration Cluster • GEX Magnet Pin Engine • MOC Imbalance Analytics
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPopOut && (
              <button
                onClick={() => {
                  playKeyClick();
                  onPopOut();
                  onClose();
                }}
                className="p-1.5 rounded bg-[#1e2638] hover:bg-[#2e3b56] text-[#cbd5e1] hover:text-white transition-colors"
                title="Pop out into floating window"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="p-1.5 rounded bg-[#1e2638] hover:bg-[#ef4444] text-[#cbd5e1] hover:text-white transition-colors"
              title="Close Quadruple Witching Monitor (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <QuadrupleWitchingView
            currentTicker={currentTicker}
            allTickers={allTickers}
            onSelectTicker={onSelectTicker}
            onNavigateToChain={(dte) => {
              onClose();
              onNavigateToChain(dte);
            }}
            onNavigateToRisk={() => {
              onClose();
              if (onNavigateToRisk) onNavigateToRisk();
            }}
            onNavigateToStrategyCatalog={() => {
              onClose();
              if (onNavigateToStrategyCatalog) onNavigateToStrategyCatalog();
            }}
            onPopOut={onPopOut}
          />
        </div>
      </div>
    </div>
  );
};
