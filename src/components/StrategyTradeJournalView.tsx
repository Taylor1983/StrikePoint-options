import React, { useState, useMemo, useEffect } from 'react';
import {
  JournalEntry,
  JournalStrategyCategory,
  TradeSetupTag,
  TradeExitReason,
  loadJournalEntries,
  saveJournalEntries,
  calculateJournalKPIs,
  syncJournalWithLivePositions,
  closeJournalTrade,
  INITIAL_JOURNAL_SEED_ENTRIES,
} from '../services/tradeJournalService';
import { Position, Ticker, TradeLeg } from '../types/options';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Layers,
  Award,
  Filter,
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  Info,
  Edit3,
  Trash2,
  FileText,
  Star,
  Check,
  RotateCcw,
} from 'lucide-react';

interface StrategyTradeJournalViewProps {
  currentTicker: Ticker;
  allTickers: Record<string, Ticker>;
  positions?: Position[];
  onNavigateToRisk?: (legs: TradeLeg[], tickerSymbol: string) => void;
  onNavigateToChain?: (symbol: string) => void;
  onClosePosition?: (positionId: string) => void;
  onPopOut?: () => void;
}

export const StrategyTradeJournalView: React.FC<StrategyTradeJournalViewProps> = ({
  currentTicker,
  allTickers,
  positions = [],
  onNavigateToRisk,
  onNavigateToChain,
  onClosePosition,
  onPopOut,
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadJournalEntries());
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'WINNERS' | 'LOSERS'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTickerFilter, setSelectedTickerFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'journal' | 'equity' | 'volatility'>('journal');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editing state inside inspection modal
  const [editingNotes, setEditingNotes] = useState<string>('');
  const [editingGrade, setEditingGrade] = useState<'A+' | 'A' | 'B' | 'C' | 'D' | 'F'>('A');
  const [editingDiscipline, setEditingDiscipline] = useState<number>(5);
  const [editingLessons, setEditingLessons] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with live portfolio and prices whenever positions or tickers update
  useEffect(() => {
    const updated = syncJournalWithLivePositions(positions, allTickers);
    setEntries(updated);
  }, [positions, allTickers]);

  // Aggregate Performance KPIs
  const kpis = useMemo(() => {
    return calculateJournalKPIs(entries);
  }, [entries]);

  // Distinct Tickers present in journal
  const journalTickers = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.ticker));
    return Array.from(set).sort();
  }, [entries]);

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Status Filter
      if (statusFilter === 'OPEN' && entry.status !== 'OPEN') return false;
      if (statusFilter === 'CLOSED' && entry.status !== 'CLOSED') return false;
      if (statusFilter === 'WINNERS') {
        const pnl = entry.status === 'CLOSED' ? (entry.realizedPnL ?? 0) : entry.unrealizedPnL;
        if (pnl <= 0) return false;
      }
      if (statusFilter === 'LOSERS') {
        const pnl = entry.status === 'CLOSED' ? (entry.realizedPnL ?? 0) : entry.unrealizedPnL;
        if (pnl >= 0) return false;
      }

      // Category Filter
      if (categoryFilter !== 'ALL' && entry.category !== categoryFilter) return false;

      // Ticker Filter
      if (selectedTickerFilter !== 'ALL' && entry.ticker !== selectedTickerFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTicker = entry.ticker.toLowerCase().includes(q);
        const matchStrategy = entry.strategyName.toLowerCase().includes(q);
        const matchNotes = entry.notes?.toLowerCase().includes(q);
        const matchTags = entry.tags?.some((t) => t.toLowerCase().includes(q));
        const matchOrder = entry.execution.orderId.toLowerCase().includes(q);
        if (!matchTicker && !matchStrategy && !matchNotes && !matchTags && !matchOrder) {
          return false;
        }
      }

      return true;
    });
  }, [entries, statusFilter, categoryFilter, selectedTickerFilter, searchQuery]);

  // Handle Manual Sync
  const handleSyncLive = () => {
    playExecutionChime();
    const updated = syncJournalWithLivePositions(positions, allTickers);
    setEntries(updated);
    showToast(`Journal Synchronized: ${positions.length} open positions marked to market`);
  };

  // Handle Close Open Strategy Trade
  const handleCloseTrade = (entry: JournalEntry, exitReason: TradeExitReason = 'MANUAL_DE_RISKING') => {
    playExecutionChime();
    if (entry.positionId && onClosePosition) {
      onClosePosition(entry.positionId);
    }
    const updated = closeJournalTrade(entry.positionId || entry.id, exitReason);
    setEntries(updated);
    if (selectedEntry?.id === entry.id) {
      const closed = updated.find((e) => e.id === entry.id);
      if (closed) setSelectedEntry(closed);
    }
    showToast(`Trade Closed: ${entry.strategyName} (${entry.ticker}) marked realized P&L`);
  };

  // Handle Delete Entry
  const handleDeleteEntry = (entryId: string) => {
    playKeyClick();
    const updated = entries.filter((e) => e.id !== entryId);
    setEntries(updated);
    saveJournalEntries(updated);
    if (selectedEntry?.id === entryId) {
      setSelectedEntry(null);
    }
    showToast('Journal Entry Removed');
  };

  // Reset to default seed entries
  const handleResetSeeds = () => {
    playKeyClick();
    setEntries(INITIAL_JOURNAL_SEED_ENTRIES);
    saveJournalEntries(INITIAL_JOURNAL_SEED_ENTRIES);
    showToast('Reset to Institutional Default Seed Journal');
  };

  // Open Inspection Modal
  const handleOpenInspect = (entry: JournalEntry) => {
    playKeyClick();
    setSelectedEntry(entry);
    setEditingNotes(entry.notes || '');
    setEditingGrade(entry.grade || 'A');
    setEditingDiscipline(entry.disciplineRating || 5);
    setEditingLessons(entry.mistakesOrLessons || '');
  };

  // Save Modal Edits
  const handleSaveModalEdits = () => {
    if (!selectedEntry) return;
    playKeyClick();
    const updated = entries.map((e) => {
      if (e.id === selectedEntry.id) {
        return {
          ...e,
          notes: editingNotes,
          grade: editingGrade,
          disciplineRating: editingDiscipline,
          mistakesOrLessons: editingLessons,
        };
      }
      return e;
    });
    setEntries(updated);
    saveJournalEntries(updated);
    setSelectedEntry((prev) => (prev ? { ...prev, notes: editingNotes, grade: editingGrade, disciplineRating: editingDiscipline, mistakesOrLessons: editingLessons } : null));
    showToast('Strategy Review & Notes Saved');
  };

  // Export CSV
  const handleExportCSV = () => {
    playKeyClick();
    const headers = [
      'Date Opened',
      'Ticker',
      'Strategy Name',
      'Status',
      'Entry IV (%)',
      'Entry Spot ($)',
      'Contracts',
      'Net Price ($)',
      'Total Outlay ($)',
      'POP (%)',
      'Max Profit ($)',
      'Max Loss ($)',
      'P&L ($)',
      'P&L (%)',
      'Exit Date',
      'Exit Reason',
      'Grade',
      'Discipline',
      'Notes',
    ];

    const rows = entries.map((e) => {
      const pnl = e.status === 'CLOSED' ? (e.realizedPnL ?? 0) : e.unrealizedPnL;
      const pnlPct = e.status === 'CLOSED' ? (e.realizedPnLPercent ?? 0) : e.unrealizedPnLPercent;
      return [
        `"${e.openedAt}"`,
        `"${e.ticker}"`,
        `"${e.strategyName}"`,
        `"${e.status}"`,
        e.entryIV,
        e.entrySpotPrice,
        e.execution.contracts,
        e.execution.fillPricePerUnit,
        e.execution.totalCost,
        e.pop,
        e.maxProfit,
        e.maxLoss,
        pnl,
        pnlPct,
        `"${e.closedAt || ''}"`,
        `"${e.exitReason || ''}"`,
        `"${e.grade || ''}"`,
        e.disciplineRating,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `strikepoint_trade_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Strategy Journal Exported to CSV');
  };

  // Export JSON
  const handleExportJSON = () => {
    playKeyClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `strikepoint_trade_journal_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Strategy Journal Exported to JSON');
  };

  // Cumulative Equity Growth Points for SVG chart
  const equityCurvePoints = useMemo(() => {
    let runningPnL = 0;
    const sorted = [...entries].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
    return sorted.map((e, idx) => {
      const pnl = e.status === 'CLOSED' ? (e.realizedPnL ?? 0) : e.unrealizedPnL;
      runningPnL += pnl;
      return {
        tradeNumber: idx + 1,
        ticker: e.ticker,
        strategy: e.strategyName,
        tradePnL: pnl,
        cumulativePnL: Number(runningPnL.toFixed(2)),
        isWin: pnl >= 0,
      };
    });
  }, [entries]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] text-[#cbd5e1] font-mono text-xs overflow-y-auto select-none p-3 gap-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-[#00e5ff] text-black font-black px-4 py-2 rounded shadow-[0_0_20px_rgba(0,229,255,0.6)] flex items-center gap-2 animate-bounce">
          <Zap className="w-4 h-4 fill-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================
          1. HEADER & COMMAND BAR
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#ff9900]/15 border border-[#ff9900]/40 flex items-center justify-center text-[#ff9900] shadow-[0_0_12px_rgba(255,153,0,0.3)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-black text-sm tracking-wider">STRATEGY TRADE JOURNAL</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] border border-[#ff9900]/40 font-bold">
                &lt;JRNL&gt;
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 font-bold">
                MULTI-LEG AUTOMATED LEDGER
              </span>
            </div>
            <p className="text-[#8b9bb4] text-[10.5px]">
              Logs execution statistics, entry IV, Greek sensitivities, MFE/MAE excursions, and subsequent P&amp;L performance.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Tab Switcher */}
          <div className="flex items-center bg-[#06080f] p-0.5 rounded border border-[#1e2638]">
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('journal');
              }}
              className={`px-2.5 py-1 rounded text-[10.5px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'journal'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>TRADES ({entries.length})</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('equity');
              }}
              className={`px-2.5 py-1 rounded text-[10.5px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'equity'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>EQUITY CURVE</span>
            </button>
            <button
              onClick={() => {
                playKeyClick();
                setActiveTab('volatility');
              }}
              className={`px-2.5 py-1 rounded text-[10.5px] font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'volatility'
                  ? 'bg-[#ff9900] text-black shadow-md'
                  : 'text-[#8b9bb4] hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>IV vs P&amp;L</span>
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSyncLive}
            className="px-2.5 py-1 bg-[#141b2a] hover:bg-[#1a2336] text-[#00e5ff] border border-[#00e5ff]/40 rounded text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
            title="Mark open strategies to market with live prices and IV"
          >
            <RefreshCw className="w-3 h-3 animate-spin-hover" />
            <span>SYNC MTM</span>
          </button>

          {/* Export Dropdown */}
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1 bg-[#141b2a] hover:bg-[#1a2336] text-[#00e676] border border-[#00e676]/40 rounded text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
            title="Export CSV spreadsheet"
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-2 py-1 bg-[#141b2a] hover:bg-[#1a2336] text-[#8b9bb4] hover:text-white border border-[#1e2638] rounded text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Export full JSON backup"
          >
            <span>JSON</span>
          </button>

          <button
            onClick={handleResetSeeds}
            className="px-2 py-1 bg-[#141b2a] hover:bg-[#1a2336] text-[#ff334b] border border-[#ff334b]/30 rounded text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Reset to default multi-leg strategy seed records"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>

          {onPopOut && (
            <button
              onClick={onPopOut}
              className="p-1 rounded bg-[#141b2a] hover:bg-[#1e2638] text-[#00e5ff] border border-[#00e5ff]/40 cursor-pointer"
              title="Pop out Strategy Trade Journal"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          2. TOP EXECUTIVE PERFORMANCE KPI CARDS (6 METRICS)
      ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Card 1: Win Rate & Trades */}
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[9.5px] font-bold uppercase">
            <span>WIN RATE</span>
            <Award className="w-3 h-3 text-[#ff9900]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-black text-white">{kpis.winRate}%</span>
          </div>
          <div className="text-[10px] text-[#8b9bb4] flex justify-between">
            <span className="text-[#00e676]">{kpis.winCount}W</span>
            <span className="text-[#ff334b]">{kpis.lossCount}L</span>
            <span>{kpis.totalTrades} Total</span>
          </div>
        </div>

        {/* Card 2: Net P&L (Realized + Unrealized) */}
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[9.5px] font-bold uppercase">
            <span>NET P&amp;L</span>
            <DollarSign className={`w-3 h-3 ${kpis.netPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`} />
          </div>
          <div className="my-1">
            <span
              className={`text-xl font-black ${
                kpis.netPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
              }`}
            >
              {kpis.netPnL >= 0 ? '+' : ''}${kpis.netPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[9.5px] text-[#8b9bb4] flex justify-between">
            <span>Real: ${kpis.totalRealizedPnL.toFixed(0)}</span>
            <span>Open: ${kpis.totalUnrealizedPnL.toFixed(0)}</span>
          </div>
        </div>

        {/* Card 3: Profit Factor */}
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[9.5px] font-bold uppercase">
            <span>PROFIT FACTOR</span>
            <Activity className="w-3 h-3 text-[#00e5ff]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-black text-[#00e5ff]">{kpis.profitFactor.toFixed(2)}</span>
          </div>
          <div className="text-[9.5px] text-[#8b9bb4] flex justify-between">
            <span>Avg Win: +${kpis.avgWin.toFixed(0)}</span>
            <span>Avg Loss: -${kpis.avgLoss.toFixed(0)}</span>
          </div>
        </div>

        {/* Card 4: Volatility Edge (Avg Entry IV & Delta) */}
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[9.5px] font-bold uppercase">
            <span>AVG ENTRY IV</span>
            <Zap className="w-3 h-3 text-[#facc15]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-black text-[#facc15]">{kpis.avgEntryIV}%</span>
          </div>
          <div className="text-[9.5px] flex justify-between">
            <span className="text-[#8b9bb4]">IV Crush Delta:</span>
            <strong className={kpis.avgIvDelta <= 0 ? 'text-[#00e676]' : 'text-[#ff9900]'}>
              {kpis.avgIvDelta >= 0 ? '+' : ''}{kpis.avgIvDelta.toFixed(1)} pts
            </strong>
          </div>
        </div>

        {/* Card 5: Avg Return on Risk */}
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[9.5px] font-bold uppercase">
            <span>RETURN ON RISK</span>
            <Layers className="w-3 h-3 text-[#c084fc]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-black text-[#c084fc]">{kpis.avgReturnOnRisk}%</span>
          </div>
          <div className="text-[9.5px] text-[#8b9bb4] flex justify-between">
            <span>Best: +${kpis.bestTradePnL.toFixed(0)}</span>
            <span>Worst: ${kpis.worstTradePnL.toFixed(0)}</span>
          </div>
        </div>

        {/* Card 6: Active Position Open/Closed Status */}
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-2.5 flex flex-col justify-between shadow">
          <div className="flex items-center justify-between text-[#8b9bb4] text-[9.5px] font-bold uppercase">
            <span>ACTIVE STRATEGIES</span>
            <Shield className="w-3 h-3 text-[#38bdf8]" />
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-white">{kpis.openTrades}</span>
            <span className="text-[10px] text-[#38bdf8] font-bold">OPEN TRADES</span>
          </div>
          <div className="text-[9.5px] text-[#8b9bb4] flex justify-between">
            <span>{kpis.closedTrades} Closed Trades</span>
            <span className="text-[#00e676]">All Synchronized</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. TAB CONTENT VIEWS:
          A. EQUITY CURVE (Interactive SVG)
          B. VOLATILITY SCATTER (IV vs P&L)
      ======================================================== */}
      {activeTab === 'equity' && (
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3 shadow-md flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00e676]" />
              <span className="text-white font-extrabold text-xs">
                CUMULATIVE STRATEGY EQUITY CURVE &amp; DRAWDOWN RUNWAY
              </span>
            </div>
            <span className="text-[10px] text-[#8b9bb4]">
              Total Growth: {kpis.netPnL >= 0 ? '+' : ''}${kpis.netPnL.toFixed(2)} across {entries.length} Executed Strategies
            </span>
          </div>

          {/* SVG Chart */}
          <div className="h-56 w-full bg-[#06080f] rounded border border-[#141b2a] p-2 relative flex items-center justify-center">
            {equityCurvePoints.length > 0 ? (
              <svg className="w-full h-full overflow-visible" viewBox="0 0 700 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e676" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00e676" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Zero line */}
                {(() => {
                  const maxVal = Math.max(500, ...equityCurvePoints.map((p) => p.cumulativePnL));
                  const minVal = Math.min(-200, ...equityCurvePoints.map((p) => p.cumulativePnL));
                  const range = maxVal - minVal || 1;
                  const zeroY = 170 - ((0 - minVal) / range) * 150;

                  const pointsStr = equityCurvePoints
                    .map((p, idx) => {
                      const x = 30 + (idx / Math.max(1, equityCurvePoints.length - 1)) * 640;
                      const y = 170 - ((p.cumulativePnL - minVal) / range) * 150;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ');

                  const firstX = 30;
                  const lastX = 30 + 640;
                  const areaStr = `${pointsStr} ${lastX},${zeroY} ${firstX},${zeroY}`;

                  return (
                    <>
                      {/* Zero line */}
                      <line x1="20" y1={zeroY} x2="680" y2={zeroY} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                      <text x="685" y={zeroY + 3} fill="#64748b" fontSize="9" textAnchor="start">
                        $0
                      </text>

                      {/* Area Fill */}
                      <polygon points={areaStr} fill="url(#equityGrad)" />

                      {/* Line */}
                      <polyline points={pointsStr} fill="none" stroke="#00e676" strokeWidth="2.5" />

                      {/* Data Points */}
                      {equityCurvePoints.map((p, idx) => {
                        const x = 30 + (idx / Math.max(1, equityCurvePoints.length - 1)) * 640;
                        const y = 170 - ((p.cumulativePnL - minVal) / range) * 150;
                        return (
                          <g key={`eq-pt-${idx}`}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill={p.isWin ? '#00e676' : '#ff334b'}
                              stroke="#050811"
                              strokeWidth="2"
                              className="cursor-pointer hover:r-6 transition-all"
                            />
                            <text
                              x={x}
                              y={y - 8}
                              fill="#ffffff"
                              fontSize="9"
                              textAnchor="middle"
                              fontWeight="bold"
                            >
                              {p.ticker}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            ) : (
              <span className="text-[#64748b] text-xs">No executed trades to chart</span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'volatility' && (
        <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1e2638] pb-1.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#facc15]" />
              <span className="text-white font-extrabold text-xs">
                IMPLIED VOLATILITY (IV) ENTRY VS OUTCOME CORRELATION
              </span>
            </div>
            <span className="text-[10px] text-[#8b9bb4]">
              High IV Entries (&gt;40%): {entries.filter((e) => e.entryIV >= 40).length} Trades · Low/Normal IV: {entries.filter((e) => e.entryIV < 40).length} Trades
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Box 1: High IV Entry Performance */}
            {(() => {
              const highIvTrades = entries.filter((e) => e.entryIV >= 40);
              const highIvWins = highIvTrades.filter((e) => (e.status === 'CLOSED' ? (e.realizedPnL ?? 0) > 0 : e.unrealizedPnL > 0)).length;
              const highIvWinRate = highIvTrades.length > 0 ? ((highIvWins / highIvTrades.length) * 100).toFixed(0) : '0';
              const highIvTotalPnL = highIvTrades.reduce((acc, e) => acc + (e.status === 'CLOSED' ? (e.realizedPnL ?? 0) : e.unrealizedPnL), 0);

              return (
                <div className="bg-[#06080f] p-3 rounded border border-[#1e2638] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-[#facc15] font-bold">
                    <span>ELEVATED IV ENTRIES (&ge;40%)</span>
                    <span>{highIvTrades.length} Trades</span>
                  </div>
                  <div className="text-lg font-black text-white">{highIvWinRate}% Win Rate</div>
                  <div className={`text-xs font-bold ${highIvTotalPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                    Net P&amp;L: {highIvTotalPnL >= 0 ? '+' : ''}${highIvTotalPnL.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-[#8b9bb4]">
                    Ideal for premium collection, Iron Condors, and Vega-short spreads benefiting from volatility crush.
                  </p>
                </div>
              );
            })()}

            {/* Box 2: Moderate/Low IV Entry Performance */}
            {(() => {
              const lowIvTrades = entries.filter((e) => e.entryIV < 40);
              const lowIvWins = lowIvTrades.filter((e) => (e.status === 'CLOSED' ? (e.realizedPnL ?? 0) > 0 : e.unrealizedPnL > 0)).length;
              const lowIvWinRate = lowIvTrades.length > 0 ? ((lowIvWins / lowIvTrades.length) * 100).toFixed(0) : '0';
              const lowIvTotalPnL = lowIvTrades.reduce((acc, e) => acc + (e.status === 'CLOSED' ? (e.realizedPnL ?? 0) : e.unrealizedPnL), 0);

              return (
                <div className="bg-[#06080f] p-3 rounded border border-[#1e2638] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-[#00e5ff] font-bold">
                    <span>LOW / COMPRESSED IV (&lt;40%)</span>
                    <span>{lowIvTrades.length} Trades</span>
                  </div>
                  <div className="text-lg font-black text-white">{lowIvWinRate}% Win Rate</div>
                  <div className={`text-xs font-bold ${lowIvTotalPnL >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                    Net P&amp;L: {lowIvTotalPnL >= 0 ? '+' : ''}${lowIvTotalPnL.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-[#8b9bb4]">
                    Optimal for debit vertical spreads, long straddles, and calendar structures anticipating volatility expansion.
                  </p>
                </div>
              );
            })()}

            {/* Box 3: Execution Smart Order Routing Quality */}
            <div className="bg-[#06080f] p-3 rounded border border-[#1e2638] flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] text-[#c084fc] font-bold">
                <span>EXECUTION ROUTING QUALITY</span>
                <span>SOR Verified</span>
              </div>
              <div className="text-lg font-black text-white">
                ${entries.reduce((acc, e) => acc + (e.execution.priceImprovement || 0), 0).toFixed(2)}
              </div>
              <div className="text-xs font-bold text-[#00e676]">
                Total Complex Book Price Improvement
              </div>
              <p className="text-[10px] text-[#8b9bb4]">
                Aggregated price savings captured inside the natural NBBO spread via CBOE, BOX, and ISE complex order books.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. FILTER & SEARCH CONTROL STRIP
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[#8b9bb4] text-[10px] font-bold uppercase mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#ff9900]" />
            <span>STATUS:</span>
          </span>
          {(['ALL', 'OPEN', 'CLOSED', 'WINNERS', 'LOSERS'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                playKeyClick();
                setStatusFilter(st);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                statusFilter === st
                  ? st === 'WINNERS'
                    ? 'bg-[#00e676] text-black font-black'
                    : st === 'LOSERS'
                    ? 'bg-[#ff334b] text-white font-black'
                    : 'bg-[#ff9900] text-black font-black'
                  : 'bg-[#141b2a] text-[#8b9bb4] hover:text-white'
              }`}
            >
              {st}
              {st === 'OPEN' && ` (${kpis.openTrades})`}
              {st === 'CLOSED' && ` (${kpis.closedTrades})`}
              {st === 'WINNERS' && ` (${kpis.winCount})`}
              {st === 'LOSERS' && ` (${kpis.lossCount})`}
            </button>
          ))}
        </div>

        {/* Category & Ticker Dropdowns & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Ticker Filter */}
          <select
            value={selectedTickerFilter}
            onChange={(e) => {
              playKeyClick();
              setSelectedTickerFilter(e.target.value);
            }}
            className="bg-[#141b2a] text-white border border-[#1e2638] rounded px-2 py-1 text-[10.5px] font-bold outline-none cursor-pointer"
          >
            <option value="ALL">ALL TICKERS ({journalTickers.length})</option>
            {journalTickers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              playKeyClick();
              setCategoryFilter(e.target.value);
            }}
            className="bg-[#141b2a] text-white border border-[#1e2638] rounded px-2 py-1 text-[10.5px] font-bold outline-none cursor-pointer"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="DEFINED_RISK">DEFINED RISK</option>
            <option value="INCOME_CREDIT">INCOME / CREDIT</option>
            <option value="VOLATILITY_LONG">LONG VOLATILITY</option>
            <option value="VOLATILITY_SHORT">SHORT VOLATILITY</option>
            <option value="EQUITY_FUTURES">EQUITY &amp; FUTURES</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-[#8b9bb4]" />
            <input
              type="text"
              placeholder="Search strategy, ticker, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#06080f] text-white border border-[#1e2638] rounded pl-7 pr-2 py-0.5 text-[10.5px] outline-none w-44 placeholder-[#556782] focus:border-[#ff9900]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1.5 text-[#8b9bb4] hover:text-white"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          5. MAIN STRATEGY TRADE LEDGER TABLE
      ======================================================== */}
      <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#06080f] text-[#8b9bb4] border-b border-[#1e2638] text-[9.5px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Strategy / Ticker</th>
                <th className="py-2.5 px-3">Execution &amp; Venue</th>
                <th className="py-2.5 px-3 text-right">Entry IV / Rank</th>
                <th className="py-2.5 px-3 text-right">Entry Greeks</th>
                <th className="py-2.5 px-3 text-right">Outlay / Max Risk</th>
                <th className="py-2.5 px-3 text-right">Spot (Entry &rarr; Now)</th>
                <th className="py-2.5 px-3 text-right">P&amp;L Performance</th>
                <th className="py-2.5 px-3 text-right">Excursion (MFE/MAE)</th>
                <th className="py-2.5 px-3 text-center">Grade</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141b28]">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-[#64748b]">
                    No strategy trade records match current filters. Execute an order in the terminal to automatically log it!
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const pnl = entry.status === 'CLOSED' ? (entry.realizedPnL ?? 0) : entry.unrealizedPnL;
                  const pnlPct = entry.status === 'CLOSED' ? (entry.realizedPnLPercent ?? 0) : entry.unrealizedPnLPercent;
                  const isUp = pnl >= 0;
                  const isClosed = entry.status === 'CLOSED';
                  const isDebit = entry.execution.netDebitCredit > 0;

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-[#121927] transition-colors cursor-pointer group"
                      onClick={() => handleOpenInspect(entry)}
                    >
                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-black inline-flex items-center gap-1 ${
                            isClosed
                              ? 'bg-[#1e293b] text-[#94a3b8] border border-[#334155]'
                              : 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/40 shadow-[0_0_8px_rgba(0,229,255,0.2)] animate-pulse'
                          }`}
                        >
                          {isClosed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          <span>{entry.status}</span>
                        </span>
                      </td>

                      {/* Strategy / Ticker */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (onNavigateToChain) onNavigateToChain(entry.ticker);
                            }}
                            className="font-black text-white hover:text-[#ff9900] transition-colors cursor-pointer text-xs"
                            title="View option chain for ticker"
                          >
                            {entry.ticker}
                          </span>
                          <span className="text-white font-extrabold group-hover:text-[#ff9900] transition-colors">
                            {entry.strategyName}
                          </span>
                        </div>
                        <div className="text-[9.5px] text-[#8b9bb4] flex items-center gap-1.5 mt-0.5">
                          <span className="px-1 bg-[#141b2a] rounded border border-[#1e2638] text-[8.5px]">
                            {entry.category.replace('_', ' ')}
                          </span>
                          <span>{entry.legs.length} Legs</span>
                          <span>&bull;</span>
                          <span>{entry.openedAt.slice(0, 16)}</span>
                        </div>
                      </td>

                      {/* Execution Stats & Venue */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-white font-bold">
                          {entry.execution.contracts}x @ {isDebit ? 'DEBIT' : 'CREDIT'} ${Math.abs(entry.execution.fillPricePerUnit).toFixed(2)}
                        </div>
                        <div className="text-[9.5px] text-[#8b9bb4] flex items-center gap-1">
                          <span className="text-[#38bdf8]">{entry.execution.venue}</span>
                          {entry.execution.priceImprovement > 0 && (
                            <span className="text-[#00e676] font-bold">
                              (+${entry.execution.priceImprovement.toFixed(0)} Saved)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Entry IV & Rank */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        <div className="font-extrabold text-[#facc15]">{entry.entryIV.toFixed(1)}%</div>
                        <div className="text-[9.5px] text-[#8b9bb4]">
                          IVR {entry.entryIVRank}% &bull; POP {entry.pop}%
                        </div>
                      </td>

                      {/* Entry Greeks */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        <div className="flex items-center justify-end gap-1.5 text-[10px]">
                          <span title="Position Delta" className={entry.entryGreeks.delta >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}>
                            &Delta; {entry.entryGreeks.delta >= 0 ? '+' : ''}{entry.entryGreeks.delta.toFixed(1)}
                          </span>
                          <span title="Position Theta" className="text-[#00e5ff]">
                            &Theta; {entry.entryGreeks.theta >= 0 ? '+' : ''}{entry.entryGreeks.theta.toFixed(1)}
                          </span>
                          <span title="Position Vega" className="text-[#c084fc]">
                            &Nu; {entry.entryGreeks.vega >= 0 ? '+' : ''}{entry.entryGreeks.vega.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#8b9bb4]">RoR: {entry.returnOnRiskPct}%</div>
                      </td>

                      {/* Outlay & Max Risk */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        <div className="text-white font-bold">
                          ${entry.execution.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-[#ff334b]">
                          Max Loss: ${entry.maxLoss.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </div>
                      </td>

                      {/* Spot (Entry -> Now) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        <div className="text-white font-bold">
                          ${entry.entrySpotPrice.toFixed(2)} &rarr; ${entry.currentSpotPrice.toFixed(2)}
                        </div>
                        {(() => {
                          const diff = entry.currentSpotPrice - entry.entrySpotPrice;
                          const pct = (diff / (entry.entrySpotPrice || 1)) * 100;
                          return (
                            <div className={`text-[9.5px] font-bold ${diff >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                              {diff >= 0 ? '+' : ''}${diff.toFixed(2)} ({diff >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                            </div>
                          );
                        })()}
                      </td>

                      {/* P&L Performance */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono">
                        <div className={`font-black text-xs ${isUp ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {isUp ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-[9.5px] font-bold ${isUp ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {isUp ? '+' : ''}{pnlPct.toFixed(1)}% {isClosed ? '(REALIZED)' : '(UNREALIZED)'}
                        </div>
                      </td>

                      {/* Excursions (MFE/MAE) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-[10px]">
                        <div className="text-[#00e676]">
                          Peak: +${entry.peakPnL.toFixed(0)}
                        </div>
                        <div className="text-[#ff334b]">
                          Drawdown: ${entry.troughPnL.toFixed(0)}
                        </div>
                      </td>

                      {/* Grade & Discipline */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            entry.grade === 'A+' || entry.grade === 'A'
                              ? 'bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40'
                              : entry.grade === 'B'
                              ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40'
                              : 'bg-[#ff334b]/20 text-[#ff334b] border border-[#ff334b]/40'
                          }`}
                        >
                          {entry.grade || 'A'}
                        </span>
                        <div className="flex justify-center items-center text-[#ff9900] text-[8px] mt-0.5">
                          {Array.from({ length: entry.disciplineRating || 5 }).map((_, i) => (
                            <Star key={i} className="w-2 h-2 fill-[#ff9900]" />
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div
                          className="flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Close button if open */}
                          {entry.status === 'OPEN' && (
                            <button
                              onClick={() => handleCloseTrade(entry)}
                              className="px-2 py-1 bg-[#ff334b]/20 hover:bg-[#ff334b]/30 text-[#ff334b] border border-[#ff334b]/40 rounded text-[9.5px] font-bold transition-all shadow"
                              title="Close open position and lock in realized P&L"
                            >
                              CLOSE
                            </button>
                          )}

                          {/* Risk Profile Link */}
                          {onNavigateToRisk && entry.legs.length > 0 && (
                            <button
                              onClick={() => onNavigateToRisk(entry.legs, entry.ticker)}
                              className="px-2 py-1 bg-[#ff9900]/15 hover:bg-[#ff9900]/30 text-[#ff9900] border border-[#ff9900]/40 rounded text-[9.5px] font-bold transition-all shadow"
                              title="Analyze full strategy risk profile & Greeks"
                            >
                              RISK
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 text-[#8b9bb4] hover:text-[#ff334b] transition-colors"
                            title="Delete entry from journal"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          6. DETAILED STRATEGY TRADE INSPECTION MODAL
      ======================================================== */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-[#ff9900]/60 rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-[#06080e] border-b border-[#1e2638] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9900] animate-pulse" />
                <h3 className="text-white font-black text-sm">
                  STRATEGY TRADE EXECUTION TICKET &amp; JOURNAL REVIEW
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-[#ff9900]/20 text-[#ff9900] font-mono text-[10px]">
                  {selectedEntry.execution.orderId}
                </span>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-[#8b9bb4] hover:text-white p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3.5">
              {/* Top Banner */}
              <div className="bg-[#070a13] border border-[#1e2638] rounded p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-[#ff9900]">{selectedEntry.ticker}</span>
                    <span className="text-sm font-extrabold text-white">{selectedEntry.strategyName}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                        selectedEntry.status === 'CLOSED'
                          ? 'bg-[#1e293b] text-[#94a3b8]'
                          : 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40'
                      }`}
                    >
                      {selectedEntry.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8b9bb4] mt-0.5">
                    Executed {selectedEntry.openedAt} &bull; Fill Venue: {selectedEntry.execution.venue}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[9px] text-[#8b9bb4] block">NET P&amp;L</span>
                    {(() => {
                      const pnl = selectedEntry.status === 'CLOSED' ? (selectedEntry.realizedPnL ?? 0) : selectedEntry.unrealizedPnL;
                      const isUp = pnl >= 0;
                      return (
                        <span className={`text-base font-black ${isUp ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                          {isUp ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8b9bb4] block">ENTRY IV</span>
                    <span className="text-base font-black text-[#facc15]">{selectedEntry.entryIV}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8b9bb4] block">POP</span>
                    <span className="text-base font-black text-[#00e5ff]">{selectedEntry.pop}%</span>
                  </div>
                </div>
              </div>

              {/* Legs Breakdown Table */}
              <div className="border border-[#1e2638] rounded overflow-hidden">
                <div className="bg-[#06080e] px-3 py-1.5 border-b border-[#1e2638] text-[10px] font-bold text-[#8b9bb4] flex justify-between">
                  <span>STRATEGY LEGS ARCHITECTURE ({selectedEntry.legs.length} LEGS)</span>
                  <span className="text-[#38bdf8]">{selectedEntry.execution.contracts}x Packages</span>
                </div>
                <table className="w-full text-left text-[10.5px]">
                  <thead className="bg-[#090d18] text-[#8b9bb4] text-[9.5px]">
                    <tr>
                      <th className="py-1.5 px-3">Action</th>
                      <th className="py-1.5 px-3">Type</th>
                      <th className="py-1.5 px-3 text-right">Strike</th>
                      <th className="py-1.5 px-3">Expiration / DTE</th>
                      <th className="py-1.5 px-3 text-right">Entry Premium</th>
                      <th className="py-1.5 px-3 text-right">Leg Entry IV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#141b28]">
                    {selectedEntry.legs.map((leg, i) => (
                      <tr key={leg.id || i}>
                        <td className="py-1.5 px-3">
                          <span
                            className={`px-1.5 py-0.2 rounded font-black text-[9px] ${
                              leg.action === 'buy' ? 'bg-[#00e676]/20 text-[#00e676]' : 'bg-[#ff334b]/20 text-[#ff334b]'
                            }`}
                          >
                            {leg.action.toUpperCase()} {leg.contracts}x
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-bold text-white uppercase">{leg.type}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-[#00e5ff]">
                          ${leg.strike.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[#cbd5e1]">
                          {leg.expiration} ({leg.dte}d)
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-white">
                          ${leg.premium.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-[#facc15]">
                          {(leg.iv > 1 ? leg.iv : leg.iv * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Execution & Risk Diagnostics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div className="bg-[#06080f] p-2 rounded border border-[#1e2638]">
                  <span className="text-[#8b9bb4] block text-[9px]">TOTAL CAPITAL COMMITTED</span>
                  <strong className="text-white text-xs">${selectedEntry.execution.totalCost.toFixed(2)}</strong>
                </div>
                <div className="bg-[#06080f] p-2 rounded border border-[#1e2638]">
                  <span className="text-[#8b9bb4] block text-[9px]">MAX PROFIT POTENTIAL</span>
                  <strong className="text-[#00e676] text-xs">${selectedEntry.maxProfit.toFixed(2)}</strong>
                </div>
                <div className="bg-[#06080f] p-2 rounded border border-[#1e2638]">
                  <span className="text-[#8b9bb4] block text-[9px]">MAX DEFINED RISK</span>
                  <strong className="text-[#ff334b] text-xs">${selectedEntry.maxLoss.toFixed(2)}</strong>
                </div>
                <div className="bg-[#06080f] p-2 rounded border border-[#1e2638]">
                  <span className="text-[#8b9bb4] block text-[9px]">RETURN ON RISK (RoR)</span>
                  <strong className="text-[#c084fc] text-xs">{selectedEntry.returnOnRiskPct}%</strong>
                </div>
              </div>

              {/* Qualitative Journaling & Reviews */}
              <div className="bg-[#070a13] p-3 rounded border border-[#1e2638] flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-[#1e2638] pb-1">
                  <span className="text-white font-extrabold text-[11px] flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#ff9900]" />
                    <span>TRADER JOURNAL NOTES &amp; POST-MORTEM REVIEW</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Grade Selector */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-[#8b9bb4]">Grade:</span>
                      {(['A+', 'A', 'B', 'C', 'D', 'F'] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => setEditingGrade(g)}
                          className={`px-1.5 py-0.2 rounded font-black text-[9px] ${
                            editingGrade === g
                              ? 'bg-[#ff9900] text-black'
                              : 'bg-[#141b2a] text-[#8b9bb4] hover:text-white'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>

                    {/* Discipline Stars */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-[#8b9bb4]">Discipline:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          onClick={() => setEditingDiscipline(star)}
                          className={`w-3 h-3 cursor-pointer ${
                            star <= editingDiscipline ? 'text-[#ff9900] fill-[#ff9900]' : 'text-[#334155]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="text-[#8b9bb4] text-[9.5px] block mb-1">
                    Strategy Rationale &amp; Market Catalyst Notes:
                  </label>
                  <textarea
                    rows={3}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Document thesis, expected move, earnings catalyst, technical levels..."
                    className="w-full bg-[#06080e] border border-[#1e2638] rounded p-2 text-white text-[11px] outline-none focus:border-[#ff9900]"
                  />
                </div>

                {/* Lessons Learned */}
                <div>
                  <label className="text-[#8b9bb4] text-[9.5px] block mb-1">
                    Lessons Learned / Exit Psychology / Execution Slip:
                  </label>
                  <input
                    type="text"
                    value={editingLessons}
                    onChange={(e) => setEditingLessons(e.target.value)}
                    placeholder="e.g. Good stop loss discipline; next time wait for morning IV spike before selling..."
                    className="w-full bg-[#06080e] border border-[#1e2638] rounded px-2 py-1 text-white text-[11px] outline-none focus:border-[#ff9900]"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#06080e] border-t border-[#1e2638] px-4 py-2.5 flex items-center justify-between">
              <div>
                {selectedEntry.status === 'OPEN' && (
                  <button
                    onClick={() => handleCloseTrade(selectedEntry)}
                    className="px-3 py-1 bg-[#ff334b] hover:bg-[#e62e43] text-white font-black rounded text-[10.5px] transition-all"
                  >
                    CLOSE THIS POSITION NOW
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-3 py-1 bg-[#141b2a] hover:bg-[#1e2638] text-[#8b9bb4] hover:text-white rounded text-[10.5px]"
                >
                  DISMISS
                </button>
                <button
                  onClick={handleSaveModalEdits}
                  className="px-4 py-1 bg-[#ff9900] hover:bg-[#e68a00] text-black font-black rounded text-[10.5px] flex items-center gap-1 shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>SAVE JOURNAL ENTRY</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
