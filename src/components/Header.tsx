import React from 'react';
import { AccountState } from '../types/options';
import { TrendingUp, RefreshCw, Radio } from 'lucide-react';

interface HeaderProps {
  activeTab: 'chain' | 'chart' | 'payoff' | 'portfolio' | 'volatility';
  setActiveTab: (tab: 'chain' | 'chart' | 'payoff' | 'portfolio' | 'volatility') => void;
  account: AccountState;
  onResetAccount: () => void;
  isLiveTickActive: boolean;
  onToggleLiveTick: () => void;
  selectedTickerSymbol: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  account,
  onResetAccount,
  isLiveTickActive,
  onToggleLiveTick,
  selectedTickerSymbol,
}) => {
  // Calculate total net liquidity
  const positionsCurrentValue = account.positions.reduce((acc, pos) => acc + pos.currentMark, 0);
  const netLiquidity = account.cashBalance + positionsCurrentValue;
  const totalPnL = netLiquidity - account.startingBalance;
  const isProfitable = totalPnL >= 0;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800/80 px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0a0e17] border border-[#ff9900]/40 flex items-center justify-center p-1 shadow-[0_0_8px_rgba(255,153,0,0.3)]">
              <img src="/icon.svg" alt="StrikePoint" className="w-6 h-6 object-contain" />
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('chain');
              }}
              className="text-lg font-extrabold tracking-tight text-white hover:text-[#ff9900] transition-colors"
            >
              StrikePoint
            </a>
          </div>
          <span className="hidden sm:inline-block text-xs font-medium text-slate-500 uppercase tracking-widest pl-2 border-l border-slate-800">
            Options Terminal
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab('chain')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'chain'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Options Chain
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'chart'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Technicals & Chart
          </button>

          <button
            onClick={() => setActiveTab('payoff')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'payoff'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Payoff & Greeks
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'portfolio'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <span>Portfolio</span>
            {account.positions.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-mono">
                {account.positions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('volatility')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'volatility'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            Volatility Lab
          </button>
        </nav>

        {/* Zone 3: Account Stats & Primary Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Real-time simulation pulse toggle */}
          <button
            onClick={onToggleLiveTick}
            title={isLiveTickActive ? 'Pause real-time market ticks' : 'Resume real-time market ticks'}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              isLiveTickActive
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveTickActive ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
            <span>{isLiveTickActive ? 'Live Market' : 'Paused'}</span>
          </button>

          {/* Account Net Liquidity Snapshot */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
            <div>
              <span className="text-slate-400">Net Liq: </span>
              <span className="font-mono font-bold text-slate-100">
                ${netLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400">P&L: </span>
              <span className={`font-mono font-semibold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfitable ? '+' : ''}
                ${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Paper Reset Button */}
          <button
            onClick={onResetAccount}
            title="Reset Paper Account to $100,000"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
