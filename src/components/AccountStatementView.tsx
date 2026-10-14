import React, { useState, useMemo } from 'react';
import { AccountState, Position, Order, Ticker } from '../types/options';
import {
  CanadianAccount,
  USDCAD_EXCHANGE_RATE,
  calculateCanadianMarginHealth,
} from '../services/canadianAccounts';
import { calculateMarginHealth } from '../utils/marginHealth';
import { calculatePositionBorrowInterest, calculatePortfolioMarginInterest } from '../utils/marginInterest';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { maskCurrency, maskAccountIdentifier } from '../utils/privacy';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Building,
  CheckCircle,
  Clock,
  Calendar,
  Shield,
  Percent,
  Banknote,
  Receipt,
  Scale,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';

interface AccountStatementViewProps {
  account: AccountState;
  canadianAccounts?: CanadianAccount[];
  activeAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  tickers?: Record<string, Ticker>;
  isPrivacyMode?: boolean;
  onNavigateToMonitor?: () => void;
  onNavigateToChain?: (symbol: string) => void;
  onNavigateToRisk?: (pos?: Position) => void;
}

export const AccountStatementView: React.FC<AccountStatementViewProps> = ({
  account,
  canadianAccounts = [],
  activeAccountId = 'act-us-margin',
  onSelectAccount,
  tickers = {},
  isPrivacyMode = false,
  onNavigateToMonitor,
  onNavigateToChain,
  onNavigateToRisk,
}) => {
  const [statementTab, setStatementTab] = useState<
    'cash_summary' | 'transactions' | 'pl_summary' | 'positions_held' | 'financing' | 'tax_summary'
  >('transactions');
  const [dateRange, setDateRange] = useState<'today' | '7d' | 'mtd' | 'ytd' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAssetCategory, setFilterAssetCategory] = useState<'all' | 'option' | 'stock' | 'future'>('all');

  // Account Identification
  const isUsAccount = activeAccountId === 'act-us-margin' || !canadianAccounts.some((a) => a.id === activeAccountId);
  const isGlobalAccount = activeAccountId === 'act-global';
  const currentCanadianAccount = !isUsAccount && !isGlobalAccount
    ? canadianAccounts.find((a) => a.id === activeAccountId)
    : undefined;

  // Selected Account Data
  const activePositions: Position[] = useMemo(() => {
    if (isGlobalAccount) {
      return [...account.positions, ...canadianAccounts.flatMap((a) => a.positions)];
    }
    if (isUsAccount) {
      return account.positions;
    }
    return currentCanadianAccount ? currentCanadianAccount.positions : account.positions;
  }, [isGlobalAccount, isUsAccount, account.positions, canadianAccounts, currentCanadianAccount]);

  const activeOrders: Order[] = useMemo(() => {
    if (isGlobalAccount) {
      return [...account.orders, ...canadianAccounts.flatMap((a) => a.orders)];
    }
    if (isUsAccount) {
      return account.orders;
    }
    return currentCanadianAccount ? currentCanadianAccount.orders : account.orders;
  }, [isGlobalAccount, isUsAccount, account.orders, canadianAccounts, currentCanadianAccount]);

  const activeCash = useMemo(() => {
    if (isGlobalAccount) {
      const cadCash = canadianAccounts.reduce(
        (sum, a) => sum + (a.currency === 'CAD' ? a.cashBalance / USDCAD_EXCHANGE_RATE : a.cashBalance),
        0
      );
      return account.cashBalance + cadCash;
    }
    if (isUsAccount) {
      return account.cashBalance;
    }
    return currentCanadianAccount ? currentCanadianAccount.cashBalance : account.cashBalance;
  }, [isGlobalAccount, isUsAccount, account.cashBalance, canadianAccounts, currentCanadianAccount]);

  const activeStartingBalance = useMemo(() => {
    if (isGlobalAccount) {
      const cadStarting = canadianAccounts.reduce(
        (sum, a) => sum + (a.currency === 'CAD' ? a.startingBalance / USDCAD_EXCHANGE_RATE : a.startingBalance),
        0
      );
      return account.startingBalance + cadStarting;
    }
    if (isUsAccount) {
      return account.startingBalance;
    }
    return currentCanadianAccount ? currentCanadianAccount.startingBalance : account.startingBalance;
  }, [isGlobalAccount, isUsAccount, account.startingBalance, canadianAccounts, currentCanadianAccount]);

  const activeRealizedPnL = useMemo(() => {
    if (isGlobalAccount) {
      const cadPnL = canadianAccounts.reduce(
        (sum, a) => sum + (a.currency === 'CAD' ? a.realizedPnL / USDCAD_EXCHANGE_RATE : a.realizedPnL),
        0
      );
      return account.realizedPnL + cadPnL;
    }
    if (isUsAccount) {
      return account.realizedPnL;
    }
    return currentCanadianAccount ? currentCanadianAccount.realizedPnL : account.realizedPnL;
  }, [isGlobalAccount, isUsAccount, account.realizedPnL, canadianAccounts, currentCanadianAccount]);

  const totalUnrealizedPnL = useMemo(() => {
    return activePositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  }, [activePositions]);

  const totalMarketValue = useMemo(() => {
    return activePositions.reduce((sum, p) => sum + p.currentMark, 0);
  }, [activePositions]);

  const netLiquidity = activeCash + totalMarketValue;

  // Margin Health
  const marginHealth = useMemo(() => {
    return calculateMarginHealth(activeCash, activePositions, tickers);
  }, [activeCash, activePositions, tickers]);

  // Financing & Borrow Calculations
  const portfolioInterest = useMemo(() => {
    return calculatePortfolioMarginInterest(activeCash, activePositions, tickers, isUsAccount ? 'USD' : 'CAD');
  }, [activeCash, activePositions, tickers, isUsAccount]);

  // Filtered Orders & Transactions
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((ord) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toUpperCase();
        const matchesTicker = ord.ticker.toUpperCase().includes(q);
        const matchesStrategy = ord.strategyName.toUpperCase().includes(q);
        const matchesId = ord.id.toUpperCase().includes(q);
        if (!matchesTicker && !matchesStrategy && !matchesId) return false;
      }
      if (filterAssetCategory !== 'all') {
        const cat = ord.assetCategory || (ord.ticker.startsWith('/') ? 'future' : 'option');
        if (cat !== filterAssetCategory) return false;
      }
      return true;
    });
  }, [activeOrders, searchQuery, filterAssetCategory]);

  // Running Ledger Calculation
  const ledgerEntries = useMemo(() => {
    let runningCash = activeStartingBalance;
    // Walk chronological orders and build running balance
    const reversed = [...filteredOrders].reverse();
    return reversed.map((ord) => {
      const isDebit = ord.netDebitCredit >= 0;
      const cashDelta = isDebit ? -ord.totalCost : ord.totalCost;
      runningCash += cashDelta;
      return {
        ...ord,
        cashDelta,
        runningCash,
      };
    }).reverse();
  }, [filteredOrders, activeStartingBalance]);

  // P&L Grouped by Underlying Symbol
  const plBySymbol = useMemo(() => {
    const symbolMap: Record<
      string,
      {
        symbol: string;
        openPositions: number;
        totalContractsOrShares: number;
        costBasis: number;
        marketValue: number;
        unrealizedPnL: number;
        realizedPnL: number;
        tradeCount: number;
        assetCategory: string;
      }
    > = {};

    activePositions.forEach((pos) => {
      if (!symbolMap[pos.ticker]) {
        symbolMap[pos.ticker] = {
          symbol: pos.ticker,
          openPositions: 0,
          totalContractsOrShares: 0,
          costBasis: 0,
          marketValue: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          tradeCount: 0,
          assetCategory: pos.assetCategory || (pos.ticker.startsWith('/') ? 'future' : 'option'),
        };
      }
      symbolMap[pos.ticker].openPositions += 1;
      symbolMap[pos.ticker].totalContractsOrShares += pos.sharesOrContracts || pos.contracts;
      symbolMap[pos.ticker].costBasis += pos.entryCost;
      symbolMap[pos.ticker].marketValue += pos.currentMark;
      symbolMap[pos.ticker].unrealizedPnL += pos.unrealizedPnL;
    });

    activeOrders.forEach((ord) => {
      if (!symbolMap[ord.ticker]) {
        symbolMap[ord.ticker] = {
          symbol: ord.ticker,
          openPositions: 0,
          totalContractsOrShares: 0,
          costBasis: 0,
          marketValue: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          tradeCount: 0,
          assetCategory: ord.assetCategory || (ord.ticker.startsWith('/') ? 'future' : 'option'),
        };
      }
      symbolMap[ord.ticker].tradeCount += 1;
    });

    return Object.values(symbolMap).sort((a, b) => (b.unrealizedPnL + b.realizedPnL) - (a.unrealizedPnL + a.realizedPnL));
  }, [activePositions, activeOrders]);

  // Export to CSV
  const handleExportCSV = () => {
    playExecutionChime();
    const headers = [
      'Order Ref',
      'Timestamp',
      'Underlying Ticker',
      'Asset Class',
      'Strategy / Description',
      'Order Type',
      'Quantity / Contracts',
      'Trade IV (%)',
      'Gross Amount ($)',
      'Commission / Fees ($)',
      'Cash Flow ($)',
      'Running Balance ($)',
      'Execution Status',
    ];

    const rows = ledgerEntries.map((entry) => [
      entry.id,
      entry.timestamp,
      entry.ticker,
      (entry.assetCategory || 'OPTION').toUpperCase(),
      `"${entry.strategyName}"`,
      entry.type.toUpperCase(),
      entry.contracts,
      entry.tradeIV ? (entry.tradeIV * 100).toFixed(1) : 'N/A',
      entry.totalCost.toFixed(2),
      '0.00',
      entry.cashDelta >= 0 ? `+${entry.cashDelta.toFixed(2)}` : entry.cashDelta.toFixed(2),
      entry.runningCash.toFixed(2),
      entry.status.toUpperCase(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"THINKORSWIM / STRIKEPOINT OFFICIAL STATEMENT - ${new Date().toISOString()}"`,
        `"Account: ${activeAccountId} | Currency: ${isUsAccount ? 'USD' : 'CAD/USD'}"`,
        '',
        headers.join(','),
        ...rows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Official_Account_Statement_${activeAccountId}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Formal Print Action
  const handlePrintStatement = () => {
    playExecutionChime();
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="w-full p-2 sm:p-4 flex flex-col gap-4 font-mono text-xs select-none">
      {/* Top Statement Header & Multi-Account Switcher */}
      <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-3 sm:p-4 flex flex-col gap-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1a2233] pb-3">
          {/* Account Details & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#ff9900]/10 border border-[#ff9900]/30 flex items-center justify-center text-[#ff9900] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-white tracking-wider">
                  OFFICIAL ACCOUNT STATEMENT
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] font-bold border border-[#00e676]/30">
                  AUDITED LEDGER
                </span>
              </div>
              <div className="text-[10.5px] text-[#8b9bb4] flex flex-wrap items-center gap-2 mt-0.5">
                <span>
                  Account:{' '}
                  <strong className="text-white">
                    {maskAccountIdentifier(
                      currentCanadianAccount
                        ? `${currentCanadianAccount.institution} · ${currentCanadianAccount.accountNumber}`
                        : '#ACT-88752434-INST',
                      isPrivacyMode
                    )}
                  </strong>
                </span>
                <span>•</span>
                <span>Clearing: <strong className="text-[#38bdf8]">CBOE / OPRA / APEX</strong></span>
                <span>•</span>
                <span>Currency: <strong className="text-[#ffd600]">{isUsAccount ? 'USD ($)' : 'CAD/USD'}</strong></span>
                <span>•</span>
                <span>As of: <strong className="text-slate-300">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Tools: Export CSV & Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-[#00d2ff]/15 hover:bg-[#00d2ff]/25 text-[#00d2ff] border border-[#00d2ff]/40 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Export complete chronological transactions and equity ledger to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT CSV</span>
            </button>

            <button
              onClick={handlePrintStatement}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-slate-700 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Print formal official PDF / Clearing House Account Statement"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>PRINT / PDF</span>
            </button>

            {onNavigateToMonitor && (
              <button
                onClick={() => {
                  playKeyClick();
                  onNavigateToMonitor();
                }}
                className="px-3 py-1.5 bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] border border-[#ff9900]/40 rounded text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>MONITOR BLOTTER &gt;</span>
              </button>
            )}
          </div>
        </div>

        {/* Account Selector Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#8b9bb4] text-[10px] font-bold mr-1 flex items-center gap-1">
              <Building className="w-3 h-3 text-[#38bdf8]" />
              <span>SELECT ACCOUNT:</span>
            </span>

            <button
              onClick={() => {
                playExecutionChime();
                if (onSelectAccount) onSelectAccount('act-us-margin');
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                isUsAccount
                  ? 'bg-[#ff9900] text-black border-[#ff9900] font-black shadow-md'
                  : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white'
              }`}
            >
              🇺🇸 US REG-T MARGIN
            </button>

            {canadianAccounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => {
                  playExecutionChime();
                  if (onSelectAccount) onSelectAccount(acc.id);
                }}
                className={`px-2 py-1 rounded text-xs font-bold transition-all border ${
                  acc.id === activeAccountId
                    ? 'bg-[#00d2ff] text-black border-[#00d2ff] font-black shadow-md'
                    : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white'
                }`}
              >
                🇨🇦 {acc.code}
              </button>
            ))}

            <button
              onClick={() => {
                playExecutionChime();
                if (onSelectAccount) onSelectAccount('act-global');
              }}
              className={`px-2 py-1 rounded text-xs font-bold transition-all border flex items-center gap-1 ${
                isGlobalAccount
                  ? 'bg-[#10b981] text-black border-[#10b981] font-black shadow-md'
                  : 'bg-[#101626] text-[#cbd5e1] border-[#1e2638] hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>GLOBAL VIEW</span>
            </button>
          </div>

          {/* Date Period Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#8b9bb4] text-[10px] font-bold mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#ffd600]" />
              <span>CYCLE:</span>
            </span>
            {[
              { id: 'today', label: 'TODAY' },
              { id: '7d', label: '7D' },
              { id: 'mtd', label: 'MTD' },
              { id: 'ytd', label: 'YTD' },
              { id: 'all', label: 'ALL TIME' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  playKeyClick();
                  setDateRange(p.id as any);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  dateRange === p.id
                    ? 'bg-[#38bdf8] text-black border-[#38bdf8]'
                    : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Financial Ledger Balance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Starting Balance */}
        <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] font-bold text-[#8b9bb4] uppercase">Starting Inflow</div>
          <div className="text-base font-black text-white font-mono mt-1">
            {maskCurrency(activeStartingBalance, isPrivacyMode, '$', 2)}
          </div>
          <div className="text-[9px] text-[#64748b] mt-0.5">Initial Base Capital</div>
        </div>

        {/* Settled Cash Balance */}
        <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] font-bold text-[#8b9bb4] uppercase flex items-center justify-between">
            <span>Settled Cash</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
          </div>
          <div className="text-base font-black text-[#00e676] font-mono mt-1">
            {maskCurrency(activeCash, isPrivacyMode, '$', 2)}
          </div>
          <div className="text-[9px] text-[#64748b] mt-0.5">Cleared Liquidity</div>
        </div>

        {/* Total Net Liquidity */}
        <div className="bg-[#090d16] border-2 border-[#ff9900]/60 rounded-lg p-2.5 flex flex-col justify-between shadow-[0_0_12px_rgba(255,153,0,0.1)]">
          <div className="text-[9.5px] font-extrabold text-[#ff9900] uppercase flex items-center justify-between">
            <span>Net Liquidity</span>
            <span className="text-[8.5px] px-1 bg-[#ff9900]/20 rounded text-[#ff9900]">MTM</span>
          </div>
          <div className="text-base font-black text-white font-mono mt-1">
            {maskCurrency(netLiquidity, isPrivacyMode, '$', 2)}
          </div>
          <div className="text-[9px] text-[#ff9900] mt-0.5">Total Account Equity</div>
        </div>

        {/* Realized Capital P&L */}
        <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] font-bold text-[#8b9bb4] uppercase">Realized P&L</div>
          <div className={`text-base font-black font-mono mt-1 ${activeRealizedPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
            {activeRealizedPnL >= 0 ? '+' : ''}{maskCurrency(activeRealizedPnL, isPrivacyMode, '$', 2)}
          </div>
          <div className="text-[9px] text-[#64748b] mt-0.5">Closed Positions</div>
        </div>

        {/* Mark-to-Market Unrealized P&L */}
        <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] font-bold text-[#8b9bb4] uppercase">Open MTM P&L</div>
          <div className={`text-base font-black font-mono mt-1 ${totalUnrealizedPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
            {totalUnrealizedPnL >= 0 ? '+' : ''}{maskCurrency(totalUnrealizedPnL, isPrivacyMode, '$', 2)}
          </div>
          <div className="text-[9px] text-[#64748b] mt-0.5">{activePositions.length} Open Positions</div>
        </div>

        {/* Options Buying Power */}
        <div className="bg-[#090d16] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[9.5px] font-bold text-[#38bdf8] uppercase flex items-center justify-between">
            <span>Options BP</span>
            <span className="text-[8.5px] text-[#64748b]">REG-T</span>
          </div>
          <div className="text-base font-black text-[#38bdf8] font-mono mt-1">
            {maskCurrency(marginHealth.optionsBuyingPower, isPrivacyMode, '$', 0)}
          </div>
          <div className="text-[9px] text-[#64748b] mt-0.5">
            Cushion: <strong className="text-white">{marginHealth.marginCushionPercent.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* Statement Sub-Navigation Tabs (Thinkorswim Institutional Standard) */}
      <div className="bg-[#0b0f1a] border border-[#1e2638] rounded-lg p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'transactions', label: `TRANSACTION LEDGER (${ledgerEntries.length})`, icon: Receipt },
            { id: 'cash_summary', label: 'CASH & MARGIN BALANCES', icon: DollarSign },
            { id: 'pl_summary', label: `P&L BY SYMBOL (${plBySymbol.length})`, icon: TrendingUp },
            { id: 'positions_held', label: `SECURITIES HELD (${activePositions.length})`, icon: Layers },
            { id: 'financing', label: 'FINANCING & BORROW CARRY', icon: Scale },
            { id: 'tax_summary', label: '1099-B & TAX LEDGER', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = statementTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playKeyClick();
                  setStatementTab(tab.id as any);
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#38bdf8] text-black border-[#38bdf8] font-black shadow-sm'
                    : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white hover:border-[#334155]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#38bdf8]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2">
          {/* Asset Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[#64748b] text-[9.5px]">FILTER:</span>
            {(['all', 'option', 'stock', 'future'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playKeyClick();
                  setFilterAssetCategory(cat);
                }}
                className={`px-1.5 py-0.5 rounded text-[9.5px] uppercase font-bold border transition-colors ${
                  filterAssetCategory === cat
                    ? 'bg-[#ff9900] text-black border-[#ff9900]'
                    : 'bg-[#101626] text-[#8b9bb4] border-[#1e2638] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Symbol / ID Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748b] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol, ID, strategy..."
              className="bg-[#080d18] border border-[#1e2638] rounded pl-7 pr-2 py-1 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#38bdf8] w-44"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: TRANSACTION & CASH FLOW LEDGER */}
      {statementTab === 'transactions' && (
        <div className="border border-[#1e2638] rounded-lg overflow-hidden bg-[#07090e] shadow-md">
          <div className="bg-[#0b0f1a] px-3 py-2 border-b border-[#1e2638] font-bold text-white text-xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#38bdf8]" />
              <span className="tracking-wide">CHRONOLOGICAL AUDITED TRANSACTION LEDGER</span>
              <span className="text-[10px] text-[#8b9bb4]">({ledgerEntries.length} total entries)</span>
            </div>
            <span className="text-[#00e676] text-[10px] bg-[#00e676]/10 px-2 py-0.5 rounded border border-[#00e676]/30">
              COMMISSION: $0.00 ZERO-TIER
            </span>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="py-16 text-center text-[#8b9bb4] flex flex-col items-center justify-center gap-2">
              <Receipt className="w-8 h-8 text-[#64748b]" />
              <span className="text-sm font-bold text-white">No Statement Entries Found</span>
              <p className="text-xs text-[#64748b]">
                Execute an options, futures, or equity trade in the terminal to generate formal audited entries.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-[#080c14] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Order Ref / ID</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Instrument</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Trade Description / Legs</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right text-[#c084fc]">Trade IV</th>
                    <th className="py-2.5 px-3 text-right">Cash Movement</th>
                    <th className="py-2.5 px-3 text-right text-[#ffd600]">Running Balance</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28]">
                  {ledgerEntries.map((ord) => {
                    const isDebit = ord.cashDelta < 0;
                    const isFuture = ord.ticker.startsWith('/') || ord.assetCategory === 'future';
                    const isStock = ord.assetCategory === 'stock';
                    const tradeIvVal = ord.entryIV ?? (ord.tradeIV ?? (ord.legs?.[0]?.iv || 0.25));

                    return (
                      <tr key={ord.id} className="hover:bg-[#121929] transition-colors font-mono">
                        <td className="py-2 px-3 text-[#8b9bb4] font-bold text-[10px]">{ord.id}</td>
                        <td className="py-2 px-3 text-[#8b9bb4]">{ord.timestamp}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => onNavigateToChain && onNavigateToChain(ord.ticker)}
                            className="font-black text-white hover:text-[#38bdf8] flex items-center gap-1 cursor-pointer"
                          >
                            <span>{ord.ticker}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                              isFuture
                                ? 'bg-[#ffd600]/20 text-[#ffd600] border border-[#ffd600]/40'
                                : isStock
                                ? 'bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/40'
                                : 'bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40'
                            }`}
                          >
                            {isFuture ? 'FUTURE' : isStock ? 'EQUITY' : 'OPTION'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#cbd5e1] font-bold">{ord.strategyName}</td>
                        <td className="py-2 px-3 text-right text-white font-extrabold">{ord.contracts}</td>
                        <td className="py-2 px-3 text-right text-[#f3e8ff] font-extrabold">
                          {(tradeIvVal * 100).toFixed(1)}%
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-black ${
                            isDebit ? 'text-[#ff334b]' : 'text-[#00e676]'
                          }`}
                        >
                          {isDebit ? '-' : '+'}${Math.abs(ord.cashDelta).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-[#ffd600] font-black">
                          {maskCurrency(ord.runningCash, isPrivacyMode, '$', 2)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="text-[9.5px] uppercase font-black text-[#00e676] bg-[#00e676]/10 border border-[#00e676]/30 px-2 py-0.5 rounded">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CASH & MARGIN BALANCES BREAKDOWN */}
      {statementTab === 'cash_summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#1e2638] pb-2">
              <DollarSign className="w-4 h-4 text-[#00e676]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Settled Cash & Collateral Segregation
              </h3>
            </div>

            <div className="flex flex-col divide-y divide-[#151c2c] text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Cash Balance (USD Core):</span>
                <strong className="text-white font-mono">{maskCurrency(activeCash, isPrivacyMode, '$', 2)}</strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Money Market Sweep (Yield 4.95%):</span>
                <strong className="text-[#00e676] font-mono">{maskCurrency(activeCash * 0.4, isPrivacyMode, '$', 2)}</strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Unsettled Funds (T+1 Options Settlement):</span>
                <strong className="text-slate-400 font-mono">$0.00</strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Short Options Premium Hold (Collateral):</span>
                <strong className="text-[#ffd600] font-mono">
                  {maskCurrency(marginHealth.maintenanceMarginReq, isPrivacyMode, '$', 2)}
                </strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Available Net Withdrawal Limit:</span>
                <strong className="text-[#38bdf8] font-mono">
                  {maskCurrency(Math.max(0, activeCash - marginHealth.maintenanceMarginReq), isPrivacyMode, '$', 2)}
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#1e2638] pb-2">
              <Scale className="w-4 h-4 text-[#ffd600]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Regulatory Margin & Buying Power
              </h3>
            </div>

            <div className="flex flex-col divide-y divide-[#151c2c] text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Reg-T Initial Margin Requirement:</span>
                <strong className="text-white font-mono">
                  {maskCurrency(marginHealth.initialMarginReq, isPrivacyMode, '$', 2)}
                </strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Maintenance Margin Requirement:</span>
                <strong className="text-[#ffd600] font-mono">
                  {maskCurrency(marginHealth.maintenanceMarginReq, isPrivacyMode, '$', 2)}
                </strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Options Buying Power (BP):</span>
                <strong className="text-[#38bdf8] font-mono">
                  {maskCurrency(marginHealth.optionsBuyingPower, isPrivacyMode, '$', 2)}
                </strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Gross Notional Market Exposure:</span>
                <strong className="text-slate-300 font-mono">
                  {maskCurrency(marginHealth.grossNotionalExposure, isPrivacyMode, '$', 2)}
                </strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Margin Safety Cushion:</span>
                <strong className="text-[#00e676] font-mono">
                  +{marginHealth.marginCushionPercent.toFixed(1)}% (${marginHealth.marginCushionDollar.toLocaleString()})
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: P&L SUMMARY BY UNDERLYING SYMBOL */}
      {statementTab === 'pl_summary' && (
        <div className="border border-[#1e2638] rounded-lg overflow-hidden bg-[#07090e] shadow-md">
          <div className="bg-[#0b0f1a] px-3 py-2 border-b border-[#1e2638] font-bold text-white text-xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00e676]" />
              <span className="tracking-wide">REALIZED & UNREALIZED PROFIT / LOSS BY UNDERLYING</span>
            </div>
            <span className="text-[#8b9bb4] text-[10px]">{plBySymbol.length} Actively Traded Tickers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="bg-[#080c14] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Ticker</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-right">Open Positions</th>
                  <th className="py-2.5 px-3 text-right">Units / Contracts</th>
                  <th className="py-2.5 px-3 text-right">Cost Basis</th>
                  <th className="py-2.5 px-3 text-right">Current Mark</th>
                  <th className="py-2.5 px-3 text-right">Open MTM P&L</th>
                  <th className="py-2.5 px-3 text-right">Total Net Return</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141b28]">
                {plBySymbol.map((item) => {
                  const totalPnL = item.unrealizedPnL + item.realizedPnL;
                  const isPositive = totalPnL >= 0;
                  const returnPct = item.costBasis > 0 ? (totalPnL / Math.abs(item.costBasis)) * 100 : 0;

                  return (
                    <tr key={item.symbol} className="hover:bg-[#121929] transition-colors font-mono">
                      <td className="py-2 px-3 font-black text-white">{item.symbol}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-[#1e293b] text-slate-300">
                          {item.assetCategory}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-300">{item.openPositions}</td>
                      <td className="py-2 px-3 text-right font-bold text-white">{item.totalContractsOrShares}</td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {maskCurrency(item.costBasis, isPrivacyMode, '$', 2)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-white">
                        {maskCurrency(item.marketValue, isPrivacyMode, '$', 2)}
                      </td>
                      <td className={`py-2 px-3 text-right font-black ${item.unrealizedPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                        {item.unrealizedPnL >= 0 ? '+' : ''}{maskCurrency(item.unrealizedPnL, isPrivacyMode, '$', 2)}
                      </td>
                      <td className={`py-2 px-3 text-right font-black ${isPositive ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{isPositive ? '+' : ''}{returnPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => onNavigateToChain && onNavigateToChain(item.symbol)}
                          className="px-2 py-0.5 bg-[#38bdf8]/15 hover:bg-[#38bdf8]/30 text-[#38bdf8] rounded text-[10px] font-bold border border-[#38bdf8]/30 transition-colors"
                        >
                          CHAIN &gt;
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITIES HELD (POSITIONS INVENTORY) */}
      {statementTab === 'positions_held' && (
        <div className="border border-[#1e2638] rounded-lg overflow-hidden bg-[#07090e] shadow-md">
          <div className="bg-[#0b0f1a] px-3 py-2 border-b border-[#1e2638] font-bold text-white text-xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#ff9900]" />
              <span className="tracking-wide">INVENTORY OF OPEN SECURITIES &amp; DERIVATIVES</span>
            </div>
            <span className="text-[#8b9bb4] text-[10px]">{activePositions.length} Open Positions in Book</span>
          </div>

          {activePositions.length === 0 ? (
            <div className="py-12 text-center text-[#8b9bb4]">No active securities held currently.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="bg-[#080c14] border-b border-[#1e2638] text-[#8b9bb4] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Position Ref</th>
                    <th className="py-2.5 px-3">Underlying</th>
                    <th className="py-2.5 px-3">Strategy Structure</th>
                    <th className="py-2.5 px-3 text-right">Contracts</th>
                    <th className="py-2.5 px-3 text-right">Cost Basis</th>
                    <th className="py-2.5 px-3 text-right">Current Mark</th>
                    <th className="py-2.5 px-3 text-right text-[#c084fc]">Entry IV</th>
                    <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                    <th className="py-2.5 px-3 text-right">Return (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141b28]">
                  {activePositions.map((pos) => {
                    const isWin = pos.unrealizedPnL >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-[#121929] transition-colors font-mono">
                        <td className="py-2 px-3 text-[#8b9bb4] font-bold text-[10px]">{pos.id}</td>
                        <td className="py-2 px-3 font-black text-white">{pos.ticker}</td>
                        <td className="py-2 px-3 text-[#cbd5e1] font-bold">{pos.strategyName}</td>
                        <td className="py-2 px-3 text-right text-white font-extrabold">{pos.contracts}</td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {maskCurrency(pos.entryCost, isPrivacyMode, '$', 2)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-white">
                          {maskCurrency(pos.currentMark, isPrivacyMode, '$', 2)}
                        </td>
                        <td className="py-2 px-3 text-right text-[#c084fc]">
                          {pos.entryIV ? `${(pos.entryIV * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className={`py-2 px-3 text-right font-black ${isWin ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {isWin ? '+' : ''}{maskCurrency(pos.unrealizedPnL, isPrivacyMode, '$', 2)}
                        </td>
                        <td className={`py-2 px-3 text-right font-black ${isWin ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {isWin ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FINANCING, BORROW & DIVIDENDS */}
      {statementTab === 'financing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#1e2638] pb-2">
              <Banknote className="w-4 h-4 text-[#ffd600]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Margin Debit Interest & Carrying Charges
              </h3>
            </div>

            <div className="flex flex-col divide-y divide-[#151c2c] text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Base Margin Debit Rate:</span>
                <strong className="text-white font-mono">8.25% APR (SOFR + 3.00%)</strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Current Margin Debit Amount:</span>
                <strong className="text-[#ff334b] font-mono">
                  {maskCurrency(Math.max(0, -activeCash), isPrivacyMode, '$', 2)}
                </strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Daily Margin Interest Accrual:</span>
                <strong className="text-slate-400 font-mono">
                  ${((Math.max(0, -activeCash) * 0.0825) / 360).toFixed(2)}/day
                </strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Stock Hard-To-Borrow (HTB) Cost:</span>
                <strong className="text-[#00e676] font-mono">$0.00 (General Collateral)</strong>
              </div>
            </div>
          </div>

          <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-[#1e2638] pb-2">
              <DollarSign className="w-4 h-4 text-[#00e676]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Dividends & Corporate Action Distributions
              </h3>
            </div>

            <div className="flex flex-col divide-y divide-[#151c2c] text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Projected Ex-Dividend Receivables:</span>
                <strong className="text-[#00e676] font-mono">+$182.40</strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Short In-Lieu Dividend Liabilities:</span>
                <strong className="text-slate-400 font-mono">$0.00</strong>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-[#8b9bb4]">Withholding Tax (US Non-Resident / IRS 1042-S):</span>
                <strong className="text-slate-400 font-mono">0.00% (Exempt)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: 1099-B & TAX LEDGER */}
      {statementTab === 'tax_summary' && (
        <div className="bg-[#07090e] border border-[#1e2638] rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00d2ff]" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                Tax Reporting Summary & Regulatory Disclosures (IRS Form 1099-B / CRA T5008)
              </h3>
            </div>
            <span className="text-[#8b9bb4] text-[10px]">Tax Year: 2026 Active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#0b101d] border border-[#1e2638] rounded p-3">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Short-Term Capital Gains</span>
              <strong className={`text-sm font-black font-mono mt-1 block ${activeRealizedPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                {activeRealizedPnL >= 0 ? '+' : ''}{maskCurrency(activeRealizedPnL, isPrivacyMode, '$', 2)}
              </strong>
              <span className="text-[9px] text-[#64748b] block mt-0.5">Ordinary Income Tax Treatment</span>
            </div>

            <div className="bg-[#0b101d] border border-[#1e2638] rounded p-3">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Section 1256 Contracts (60/40 Rule)</span>
              <strong className="text-sm font-black text-[#ffd600] font-mono mt-1 block">
                +$5,350.00
              </strong>
              <span className="text-[9px] text-[#64748b] block mt-0.5">60% Long-Term / 40% Short-Term (/ES, /CL)</span>
            </div>

            <div className="bg-[#0b101d] border border-[#1e2638] rounded p-3">
              <span className="text-[9px] text-[#8b9bb4] block uppercase">Disallowed Wash-Sales (IRC §1091)</span>
              <strong className="text-sm font-black text-slate-300 font-mono mt-1 block">
                $0.00
              </strong>
              <span className="text-[9px] text-[#00e676] block mt-0.5">No 30-Day Substantially Identical Violations</span>
            </div>
          </div>

          <div className="p-3 bg-[#090e18] border border-[#1a2334] rounded text-[10px] text-[#8b9bb4] leading-relaxed">
            <strong className="text-white block mb-1">Clearing Member Notice & FINRA Rule 2231 Disclosure:</strong>
            Account statements are delivered for informational and reconciliation purposes. Securities are protected by SIPC up to $500,000 (including $250,000 for claims for cash). For options, an Options Clearing Corporation (OCC) prospectus containing characteristics and risks of standardized options is available upon request.
          </div>
        </div>
      )}
    </div>
  );
};
