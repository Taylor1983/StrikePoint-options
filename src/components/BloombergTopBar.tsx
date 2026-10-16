import React, { useState, useEffect, useRef } from 'react';
import { Ticker, TerminalScreen, AccountState } from '../types/options';
import {
  playKeyClick,
  isTerminalAudioEnabled,
  setTerminalAudioEnabled,
} from '../utils/terminalSound';
import {
  Volume2,
  VolumeX,
  Terminal as TerminalIcon,
  Search,
  Radio,
  Clock,
  HelpCircle,
  Shield,
  Smartphone,
  Download,
  Bell,
} from 'lucide-react';
import { calculateMarginHealth } from '../utils/marginHealth';
import { TIME_ZONE_OPTIONS } from './ExchangeClockBellModal';

interface BloombergTopBarProps {
  currentScreen: TerminalScreen;
  onNavigateScreen: (screen: TerminalScreen) => void;
  selectedTicker: Ticker;
  tickers: Record<string, Ticker>;
  onSelectTicker: (sym: string) => void;
  account: AccountState;
  onOpenHelp: () => void;
  onOpenMarketDepth?: () => void;
  onOpenStrategyExecution?: () => void;
  onOpenDeviceSuite?: () => void;
  onOpenStrategyCatalog?: () => void;
  onOpenQuadWitching?: () => void;
  onOpenTSXFuturesHub?: () => void;
  onOpenClockBellModal?: () => void;
  timeZoneId?: string;
  useAmPm?: boolean;
}

export const BloombergTopBar: React.FC<BloombergTopBarProps> = ({
  currentScreen,
  onNavigateScreen,
  selectedTicker,
  tickers,
  onSelectTicker,
  account,
  onOpenHelp,
  onOpenMarketDepth,
  onOpenStrategyExecution,
  onOpenDeviceSuite,
  onOpenStrategyCatalog,
  onOpenQuadWitching,
  onOpenTSXFuturesHub,
  onOpenClockBellModal,
  timeZoneId = 'et',
  useAmPm = true,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [clockTime, setClockTime] = useState({ utc: '', est: '' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update terminal clock every second with AM/PM format and selected timezone
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tzOpt = TIME_ZONE_OPTIONS.find((t) => t.id === timeZoneId) || TIME_ZONE_OPTIONS[0];
      const utcStr = now.toUTCString().split(' ')[4] + ' UTC';
      const mainTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: tzOpt.zone,
        hour12: useAmPm,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ` ${tzOpt.label}`;
      setClockTime({ utc: utcStr, est: mainTimeStr });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timeZoneId, useAmPm]);

  const handleAudioToggle = () => {
    const next = !isAudioOn;
    setIsAudioOn(next);
    setTerminalAudioEnabled(next);
    if (next) playKeyClick();
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playKeyClick();
    const trimmed = commandInput.trim().toUpperCase();
    if (!trimmed) return;

    // Check screen commands
    if (
      trimmed === 'SDEPTH' ||
      trimmed === 'CDEPTH' ||
      trimmed === 'COB' ||
      trimmed === 'SMD' ||
      trimmed === 'COMBO' ||
      trimmed === 'MULTI' ||
      trimmed === 'STRAT EXEC' ||
      trimmed === 'EXEC' ||
      trimmed.includes('STRAT DEPTH') ||
      trimmed.includes('STRATEGY DEPTH') ||
      trimmed.includes('STRAT EXEC') ||
      trimmed.includes('MULTI LEG')
    ) {
      if (onOpenStrategyExecution) onOpenStrategyExecution();
      else onNavigateScreen('ovme');
    } else if (
      trimmed === 'MD' ||
      trimmed === 'DOM' ||
      trimmed === 'DEPTH' ||
      trimmed === 'L2' ||
      trimmed === 'BOOK' ||
      trimmed.includes('MARKET DEPTH') ||
      trimmed.includes('SPREAD')
    ) {
      if (onOpenMarketDepth) onOpenMarketDepth();
      else onNavigateScreen('omon');
    } else if (trimmed.includes('OMON')) {
      onNavigateScreen('omon');
    } else if (trimmed.includes('OVME') || trimmed.includes('CALC') || trimmed.includes('STRAT')) {
      onNavigateScreen('ovme');
    } else if (trimmed.includes('CONE') || trimmed.includes('PROB') || trimmed.includes('EXP')) {
      onNavigateScreen('cone');
    } else if (trimmed.includes('FLOW') || trimmed.includes('AOP')) {
      onNavigateScreen('flow');
    } else if (trimmed.includes('SCEN')) {
      onNavigateScreen('scen');
    } else if (trimmed.includes('HIVG') || trimmed.includes('HVT') || trimmed.includes('HVIV') || trimmed === 'HV' || trimmed === 'IV') {
      onNavigateScreen('hivg');
    } else if (trimmed.includes('SURF') || trimmed.includes('3D') || trimmed.includes('GVS')) {
      onNavigateScreen('surf');
    } else if (trimmed.includes('VOL') || trimmed.includes('GV') || trimmed.includes('SKEW')) {
      onNavigateScreen('vols');
    } else if (
      trimmed.includes('VEGA') ||
      trimmed.includes('TERM STRUCT') ||
      trimmed === 'VTS' ||
      trimmed.includes('VOLGA') ||
      trimmed.includes('VOMMA')
    ) {
      onNavigateScreen('vega');
    } else if (trimmed.includes('CHART') || trimmed.includes('HP') || trimmed.includes('G') || trimmed === 'TA' || trimmed.includes('TECHO') || trimmed.includes('TECH') || trimmed.includes('INDICATOR') || trimmed.includes('INDICATORS') || trimmed.includes('STUDY') || trimmed.includes('STUDIES')) {
      onNavigateScreen('chart');
    } else if (
      trimmed.includes('STATEMENT') ||
      trimmed === 'STMT' ||
      trimmed === 'ACCT' ||
      trimmed === 'LEDGER' ||
      trimmed.includes('ACCOUNT STATEMENT')
    ) {
      onNavigateScreen('statement');
    } else if (
      trimmed.includes('MONITOR') ||
      trimmed === 'MON' ||
      trimmed === 'WATCH' ||
      trimmed === 'BLOTTER' ||
      trimmed.includes('CAD') ||
      trimmed.includes('CANADIAN') ||
      trimmed.includes('CIRO') ||
      trimmed.includes('TFSA') ||
      trimmed.includes('RRSP') ||
      trimmed.includes('FHSA')
    ) {
      onNavigateScreen('monitor');
    } else if (
      trimmed === 'BETA' ||
      trimmed === 'BW' ||
      trimmed.includes('BETA WEIGHT') ||
      trimmed.includes('BETA-WEIGHT')
    ) {
      onNavigateScreen('port');
    } else if (
      trimmed.includes('PORT') ||
      trimmed.includes('BLOT') ||
      trimmed.includes('POS') ||
      trimmed === 'BUYING POWER' ||
      trimmed === 'MARGIN' ||
      trimmed === 'BP MARGIN' ||
      trimmed.includes('BORROW') ||
      trimmed.includes('INTEREST') ||
      trimmed.includes('FINANCING') ||
      trimmed.includes('HTB')
    ) {
      onNavigateScreen('port');
    } else if (
      trimmed.includes('MARGIN DEBT') ||
      trimmed === 'DEBT' ||
      trimmed.includes('GDP')
    ) {
      onNavigateScreen('chart');
    } else if (trimmed.includes('PCR') || trimmed === 'P/C' || trimmed.includes('PUTCALL') || trimmed.includes('PUT/CALL') || trimmed.includes('RATIO')) {
      onNavigateScreen('pcr');
    } else if (
      trimmed.includes('OPEC') ||
      trimmed.includes('JMMC') ||
      trimmed.includes('OVX') ||
      trimmed.includes('OIL EVENT') ||
      trimmed.includes('OIL VOL')
    ) {
      onNavigateScreen('opec');
    } else if (
      trimmed.includes('TARIFF') ||
      trimmed === 'TRFF' ||
      trimmed.includes('TRADE WAR') ||
      trimmed.includes('DUTY') ||
      trimmed.includes('CUSTOMS')
    ) {
      onNavigateScreen('tariff');
    } else if (
      trimmed === 'DVD' ||
      trimmed === 'DIV' ||
      trimmed.includes('DIVIDEND') ||
      trimmed.includes('DIVIDENDS') ||
      trimmed === 'DRIP' ||
      trimmed.includes('INCOME') ||
      trimmed.includes('PAYOUT') ||
      trimmed.includes('ARISTOCRAT')
    ) {
      onNavigateScreen('div');
    } else if (
      trimmed === 'EXP' ||
      trimmed === 'EXPR' ||
      trimmed === 'EXPIRATION' ||
      trimmed === 'EXPIRATIONS' ||
      trimmed === 'OPEX' ||
      trimmed === 'EXPD' ||
      trimmed === 'EXPIRY' ||
      trimmed === 'CYCLE'
    ) {
      onNavigateScreen('exp');
    } else if (
      trimmed === 'TSXF' ||
      trimmed === 'TSX FUTURES' ||
      trimmed === 'TSX FUT' ||
      trimmed === 'TSXFUT' ||
      trimmed === 'BOURSE' ||
      trimmed.includes('TSX FUT') ||
      trimmed.includes('MONTREAL')
    ) {
      if (onOpenTSXFuturesHub) {
        onOpenTSXFuturesHub();
      } else {
        onSelectTicker('/SXF');
        onNavigateScreen('omon');
      }
    } else if (trimmed === 'SXF' || trimmed === '/SXF') {
      onSelectTicker('/SXF');
      onNavigateScreen('omon');
    } else if (trimmed === 'SXM' || trimmed === '/SXM') {
      onSelectTicker('/SXM');
      onNavigateScreen('omon');
    } else if (trimmed === 'CGB' || trimmed === '/CGB') {
      onSelectTicker('/CGB');
      onNavigateScreen('omon');
    } else if (trimmed === 'CRA' || trimmed === '/CRA' || trimmed === 'BAX' || trimmed === '/BAX') {
      onSelectTicker('/CRA');
      onNavigateScreen('omon');
    } else if (trimmed === 'SCF' || trimmed === '/SCF') {
      onSelectTicker('/SCF');
      onNavigateScreen('omon');
    } else if (trimmed === 'CGF' || trimmed === '/CGF') {
      onSelectTicker('/CGF');
      onNavigateScreen('omon');
    } else if (
      trimmed === 'TIME' ||
      trimmed === 'CLOCK' ||
      trimmed === 'BELL' ||
      trimmed === 'BELLS' ||
      trimmed === 'TZ' ||
      trimmed === 'TIMEZONE' ||
      trimmed === 'ZONE' ||
      trimmed.includes('BELL') ||
      trimmed.includes('TIMEZONE')
    ) {
      if (onOpenClockBellModal) {
        onOpenClockBellModal();
      }
    } else if (
      trimmed === 'WITCH' ||
      trimmed === 'QWITCH' ||
      trimmed.includes('WITCH') ||
      trimmed === 'QUAD' ||
      trimmed === '4W'
    ) {
      if (onOpenQuadWitching) {
        onOpenQuadWitching();
      } else {
        onNavigateScreen('witch');
      }
    } else if (
      trimmed === 'BNN' ||
      trimmed === 'TV' ||
      trimmed === 'BNNLIVE' ||
      trimmed === 'STREAM' ||
      trimmed === 'BNN TV' ||
      trimmed.includes('BNN') ||
      trimmed.includes('BLOOMBERG TV') ||
      trimmed === 'LIVE'
    ) {
      onNavigateScreen('bnn');
    } else if (
      trimmed === 'FTS' ||
      trimmed === 'TERM' ||
      trimmed === 'CURV' ||
      trimmed === 'CURVE' ||
      trimmed === 'FUTURES' ||
      trimmed === 'FORWARD' ||
      trimmed === 'FORWARD CURVE' ||
      trimmed === 'CONTANGO' ||
      trimmed === 'BACKWARDATION' ||
      trimmed.includes('TERM STRUCTURE') ||
      trimmed.includes('FORWARD CURVE') ||
      trimmed.includes('FUTURES CURVE')
    ) {
      onNavigateScreen('fts');
    } else if (
      trimmed === 'SKEW' ||
      trimmed === 'VSKEW' ||
      trimmed === 'SKWF' ||
      trimmed === 'SKEWFINDER' ||
      trimmed === 'FINDER' ||
      trimmed === 'VOLSKEW' ||
      trimmed === 'SKEW FINDER' ||
      trimmed.includes('SKEW FINDER') ||
      trimmed.includes('VOLATILITY SKEW')
    ) {
      onNavigateScreen('skew');
    } else if (
      trimmed === 'JRNL' ||
      trimmed === 'JOURNAL' ||
      trimmed === 'TRADE JOURNAL' ||
      trimmed === 'STRATEGY JOURNAL' ||
      trimmed === 'STRATEGY TRADE JOURNAL' ||
      trimmed === 'LOG' ||
      trimmed === 'DIARY' ||
      trimmed.includes('JOURNAL')
    ) {
      onNavigateScreen('journal');
    } else if (
      trimmed === 'EDUC' ||
      trimmed === 'EDUCATION' ||
      trimmed === 'ACADEMY' ||
      trimmed === 'LEARN' ||
      trimmed === 'SCHOOL' ||
      trimmed === 'MASTERCLASS' ||
      trimmed === 'TUTORIAL' ||
      trimmed === 'OPTIONS EDUCATION' ||
      trimmed === 'STRATEGY EDUCATION' ||
      trimmed.includes('EDUCATION') ||
      trimmed.includes('ACADEMY') ||
      trimmed.includes('MASTERCLASS')
    ) {
      onNavigateScreen('educ');
    } else if (
      trimmed === 'GIC' ||
      trimmed === 'GICS' && trimmed !== 'GICS' || // fallback
      trimmed === 'GIC CANADA' ||
      trimmed === 'GICS RATE' ||
      trimmed === 'GIC RATES' ||
      trimmed === 'GIC RATE' ||
      trimmed === 'CDIC' ||
      trimmed === 'GUARANTEED' ||
      trimmed === 'GUARANTEED INVESTMENT' ||
      trimmed === 'GUARANTEED INVESTMENT CERTIFICATES' ||
      trimmed === 'GUARANTEED INVESTMENT CERTIFICATE' ||
      trimmed.includes('GUARANTEED INVESTMENT') ||
      trimmed.includes('INVESTMENT CERTIFICATE') ||
      trimmed === 'FIXED DEPOSIT' ||
      trimmed === 'TERM DEPOSIT'
    ) {
      onNavigateScreen('gic');
    } else if (
      trimmed === 'GICS' ||
      trimmed === 'GICS CANADA' ||
      trimmed === 'CANADA GICS' ||
      trimmed === 'TSX GICS' ||
      trimmed === 'SECTOR' ||
      trimmed === 'SECTORS' ||
      trimmed === 'SECT' ||
      trimmed.includes('GICS')
    ) {
      onNavigateScreen('gics');
    } else if (
      trimmed === 'BTEST' ||
      trimmed === 'BACKTEST' ||
      trimmed === 'TEST' ||
      trimmed.includes('BACKTEST')
    ) {
      if (onOpenStrategyCatalog) onOpenStrategyCatalog();
    } else if (
      trimmed === 'DEVICE' ||
      trimmed === 'PLATFORM' ||
      trimmed === 'RESOLUTION' ||
      trimmed === 'RES' ||
      trimmed === '1920X1200' ||
      trimmed === '1920*1200' ||
      trimmed === 'FHD+' ||
      trimmed === 'WVA' ||
      trimmed === 'DISPLAY' ||
      trimmed === 'SCALE' ||
      trimmed === 'MOBILE' ||
      trimmed === 'TABLET' ||
      trimmed === 'PHONE' ||
      trimmed === 'PWA' ||
      trimmed === 'INSTALL' ||
      trimmed === 'LINUX' ||
      trimmed === 'WINDOWS'
    ) {
      if (onOpenDeviceSuite) onOpenDeviceSuite();
    } else if (trimmed === 'BP' || trimmed === 'BP US' || trimmed === 'BP US EQUITY' || trimmed === 'BP EQUITY') {
      onSelectTicker('BP');
    } else if (trimmed.includes('HELP')) {
      onOpenHelp();
    }

    // Check ticker commands (e.g. "NVDA", "TSLA", "SPY US EQUITY", "BP")
    const words = trimmed.split(' ');
    for (const w of words) {
      if (tickers[w]) {
        onSelectTicker(w);
        break;
      }
    }

    setCommandInput('');
    setShowSuggestions(false);
  };

  const functionKeys: { label: string; key: string; screen?: TerminalScreen; action?: () => void }[] = [
    { label: '<F1 HELP>', key: 'HELP', action: onOpenHelp },
    { label: '<DOM DEPTH>', key: 'DOM', action: onOpenMarketDepth },
    { label: '<STRAT COB>', key: 'COB', action: onOpenStrategyExecution },
    { label: '<F2 OMON>', key: 'OMON', screen: 'omon' },
    { label: '<F3 OVME>', key: 'OVME', screen: 'ovme' },
    { label: '<F4 CONE>', key: 'CONE', screen: 'cone' },
    { label: '<F5 SCEN>', key: 'SCEN', screen: 'scen' },
    { label: '<F6 FLOW>', key: 'FLOW', screen: 'flow' },
    { label: '<F7 VOLS>', key: 'VOLS', screen: 'vols' },
    { label: '<SURF 3D>', key: 'SURF', screen: 'surf' },
    { label: '<F8 HIVG>', key: 'HIVG', screen: 'hivg' },
    { label: '<F9 CHART/TA>', key: 'CHART', screen: 'chart' },
    { label: '<F10 PORT>', key: 'PORT', screen: 'port' },
    {
      label: account.positions.length > 0 ? `<MONITOR (${account.positions.length})>` : '<MONITOR>',
      key: 'MONITOR',
      screen: 'monitor',
    },
    { label: '<F11 PCR>', key: 'PCR', screen: 'pcr' },
    { label: '<F12 OPEC>', key: 'OPEC', screen: 'opec' },
    { label: '<TRFF TARIFF>', key: 'TRFF', screen: 'tariff' },
    { label: '<VEGA VTS>', key: 'VEGA', screen: 'vega' },
    { label: '<FTS CURVE>', key: 'FTS', screen: 'fts' },
    { label: '<SKEW FINDER>', key: 'SKEW', screen: 'skew' },
    { label: '<STRAT JRNL>', key: 'JRNL', screen: 'journal' },
    { label: '<OPTIONS ACADEMY>', key: 'EDUC', screen: 'educ' },
    { label: '<DVD DIVIDENDS>', key: 'DVD', screen: 'div' },
    { label: '<GIC 100% CDIC>', key: 'GIC', screen: 'gic' },
    { label: '<WITCH 4W>', key: 'WITCH', action: onOpenQuadWitching || (() => onNavigateScreen('witch')), screen: 'witch' },
    { label: '<BNN LIVE TV>', key: 'BNN', screen: 'bnn' },
    { label: '<BTEST BACKTEST>', key: 'BTEST', action: onOpenStrategyCatalog },
    { label: '<DEVICE & PWA>', key: 'DEVICE', action: onOpenDeviceSuite },
  ];

  const positionsMark = account.positions.reduce((acc, p) => acc + p.currentMark, 0);
  const netLiq = account.cashBalance + positionsMark;
  const totalPnL = netLiq - account.startingBalance;
  const isPnlPositive = totalPnL >= 0;

  const marginRequirement = account.positions.reduce((acc, p) => {
    if (p.entryCost < 0) return acc + Math.abs(p.entryCost) * 1.5;
    return acc;
  }, 0);
  const optionsBP = Math.max(0, account.cashBalance - marginRequirement);

  const marginHealth = React.useMemo(() => {
    return calculateMarginHealth(account.cashBalance, account.positions, tickers);
  }, [account.cashBalance, account.positions, tickers]);

  return (
    <div className="bg-[#05070a] border-b-2 border-[#1e2638] select-none text-xs font-mono">
      {/* Function Keys Strip (Bloomberg Keyboard Top Row) */}
      <div className="bg-[#080b12] border-b border-[#141b2a] px-3 py-1 flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 font-black text-[#ff9900] tracking-wider pr-2 border-r border-[#1e2638]">
            <img
              src="/icon.svg"
              alt="StrikePoint"
              className="w-4 h-4 object-contain rounded drop-shadow-[0_0_6px_rgba(255,153,0,0.5)] border border-[#ff9900]/40 p-0.2 bg-[#0a0e17]"
            />
            <span>STRIKEPOINT</span>
            <span className="text-[10px] text-[#8b9bb4] font-normal">TERMINAL</span>
          </div>

          {functionKeys.map((fk) => {
            const isActive = fk.screen && currentScreen === fk.screen;
            return (
              <button
                key={fk.key}
                onClick={() => {
                  playKeyClick();
                  if (fk.action) fk.action();
                  else if (fk.screen) onNavigateScreen(fk.screen);
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-tight transition-all border shrink-0 ${
                  isActive
                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-extrabold shadow-[0_0_8px_rgba(255,153,0,0.5)]'
                    : 'bg-[#0f1422] text-[#ffb020] hover:bg-[#1a2236] border-[#222d44] hover:border-[#ff9900]/50'
                }`}
              >
                {fk.label}
              </button>
            );
          })}
        </div>

        {/* Audio Toggle & Clock */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-[11px] text-[#8b9bb4]">
          {onOpenDeviceSuite && (
            <button
              onClick={() => {
                playKeyClick();
                onOpenDeviceSuite();
              }}
              title="Multi-Platform & Multi-Device Settings (Linux, Windows, Phones, Tablets, PC)"
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#00d2ff]/40 bg-[#00d2ff]/10 text-[#00d2ff] hover:bg-[#00d2ff]/20 transition-colors font-bold"
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden sm:inline">DEVICE / PWA</span>
            </button>
          )}

          <button
            onClick={handleAudioToggle}
            title={isAudioOn ? 'Mute terminal audio' : 'Enable terminal audio'}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              isAudioOn
                ? 'bg-[#00e676]/10 border-[#00e676]/40 text-[#00e676]'
                : 'bg-[#141b2a] border-[#222d44] text-[#8b9bb4] hover:text-white'
            }`}
          >
            {isAudioOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span className="hidden sm:inline">{isAudioOn ? 'AUDIO ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={() => {
              playKeyClick();
              if (onOpenClockBellModal) onOpenClockBellModal();
            }}
            title="Click to change Time Zone or ring Opening / Closing Bell <TIME / BELL>"
            className="hidden lg:flex items-center gap-2 bg-[#0c101c] hover:bg-[#182338] px-2.5 py-0.5 rounded border border-[#1a2336] hover:border-[#ff9900]/70 text-[#8b9bb4] hover:text-white transition-all cursor-pointer group shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-[#ff9900] group-hover:rotate-12 transition-transform" />
            <span className="text-[#e2e8f0] font-bold text-xs font-mono">{clockTime.est}</span>
            <span className="text-[10px] text-[#556782]">({clockTime.utc})</span>
            <div className="flex items-center gap-1 pl-1 border-l border-[#263750] text-[#ffd600]">
              <Bell className="w-3 h-3 hover:scale-125 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* Bloomberg Command Prompt Bar */}
      <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 bg-[#07090e]">
        {/* Command Line Input */}
        <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 flex-1 max-w-xl relative">
          <div className="flex items-center gap-1 bg-[#0b0f1a] border border-[#263550] focus-within:border-[#ff9900] px-2 py-1 rounded w-full shadow-inner">
            <span className="text-[#ff9900] font-bold text-xs select-none">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => {
                setCommandInput(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              placeholder={`${selectedTicker.symbol} US Equity ${currentScreen.toUpperCase()} <GO>`}
              className="bg-transparent border-none outline-none text-white text-xs w-full uppercase placeholder:text-[#475569] font-mono tracking-wider"
            />
            {commandInput && (
              <button
                type="button"
                onClick={() => setCommandInput('')}
                className="text-[#64748b] hover:text-white text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            className="px-3 py-1 bg-[#ff9900] hover:bg-[#ffaa22] text-black font-extrabold text-xs tracking-wider rounded border border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.3)] transition-transform active:scale-95"
          >
            {'<GO>'}
          </button>

          {/* Command Suggestions Popup */}
          {showSuggestions && (
            <div className="absolute top-full left-0 mt-1 w-full bg-[#0a0e18] border border-[#ff9900]/40 rounded shadow-2xl z-50 text-xs overflow-hidden">
              <div className="p-1.5 bg-[#141b2a] text-[#8b9bb4] text-[10px] uppercase font-bold tracking-wider flex justify-between">
                <span>Terminal Shortcuts</span>
                <span>Press Enter to Run</span>
              </div>
              <div className="divide-y divide-[#1e2638] max-h-48 overflow-y-auto">
                {Object.keys(tickers).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      playKeyClick();
                      onSelectTicker(sym);
                      setCommandInput('');
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#1a2336] flex items-center justify-between text-[#e2e8f0]"
                  >
                    <span>
                      <strong className="text-[#ff9900]">{sym}</strong> US Equity
                    </span>
                    <span className="text-[10px] text-[#8b9bb4]">${tickers[sym].price.toFixed(2)}</span>
                  </button>
                ))}
                {['SKEW Volatility Skew Finder & Arbitrage Scanner <SKWF>', 'FTS Futures Term Structure & Forward Curves <TERM>', 'OMON Options Monitor', 'STATEMENT Official Account Statement & Cash Ledger <STMT>', 'MONITOR Position & Margin Health Blotter', 'TSXF TSX Futures Hub & Montreal Exchange (MX)', 'SXF S&P/TSX 60 Index Standard Futures (MX)', 'TIME Exchange Clock, Time Zone & Opening/Closing Bell <BELL>', 'EXP Options Expiration Master Calendar & Schedule', 'WITCH Quadruple Witching Intelligence & Pin Risk', 'DOM Market Depth & Level 2 Book', 'OVME Options Valuation', 'DVD Dividend Tracker & DRIP Simulator', 'CANADIAN MARGIN Canadian Margin Health (CIRO 5300 & CRA)', 'SURF 3D Volatility Surface', 'VOLS Volatility Skews', 'HIVG Historical Volatility Graph', 'CHART / TA Technical Analysis (TECHO)', 'PCR Put/Call Ratio & Sentiment', 'FLOW Unusual Flow', 'SCEN Scenario Matrix', 'PORT Portfolio & Buying Power (BP)'].map(
                  (cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => {
                        playKeyClick();
                        const firstWord = cmd.split(' ')[0].toLowerCase();
                        if (firstWord === 'witch') {
                          if (onOpenQuadWitching) onOpenQuadWitching();
                          else onNavigateScreen('witch');
                        } else if (firstWord === 'tsxf') {
                          if (onOpenTSXFuturesHub) onOpenTSXFuturesHub();
                          else {
                            onSelectTicker('/SXF');
                            onNavigateScreen('omon');
                          }
                        } else if (firstWord === 'sxf') {
                          onSelectTicker('/SXF');
                          onNavigateScreen('omon');
                        } else if (firstWord === 'time' || firstWord === 'bell') {
                          if (onOpenClockBellModal) onOpenClockBellModal();
                        } else if (firstWord === 'statement' || firstWord === 'stmt') {
                          onNavigateScreen('statement');
                        } else {
                          const code = (firstWord === 'dvd' || firstWord === 'div' ? 'div' : firstWord === 'monitor' || firstWord === 'canadian' ? 'monitor' : firstWord) as TerminalScreen;
                          onNavigateScreen(code);
                        }
                        setCommandInput('');
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#1a2336] text-[#00d2ff] font-bold"
                    >
                      {cmd}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </form>

        {/* Security Quick Bar & Account Quick Readout */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Active Security Badge */}
          <div className="flex items-center gap-2 bg-[#0c101c] border border-[#222d44] px-2.5 py-1 rounded">
            <span className="text-[#8b9bb4] text-[10px]">SECURITY:</span>
            <span className="text-[#ff9900] font-black">{selectedTicker.symbol}</span>
            <span className="text-[#cbd5e1] text-[10px] hidden sm:inline">US EQUITY</span>
            <span className="text-white font-bold ml-1">${selectedTicker.price.toFixed(2)}</span>
            <span
              className={`text-[10px] font-bold ${
                selectedTicker.change >= 0 ? 'text-[#00e676]' : 'text-[#ff334b]'
              }`}
            >
              {selectedTicker.change >= 0 ? '+' : ''}
              {selectedTicker.changePercent.toFixed(2)}%
            </span>
          </div>

          {/* Options Buying Power (BP) Quick Readout */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#0c101c] border border-[#00e5ff]/40 px-2.5 py-1 rounded">
            <span className="text-[#8b9bb4] text-[10px]">MARGIN BP:</span>
            <span className="text-[#00e5ff] font-black">(${optionsBP.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})</span>
          </div>

          {/* Margin Health Quick Readout Button */}
          <button
            type="button"
            onClick={() => {
              playKeyClick();
              onNavigateScreen('monitor');
            }}
            title={`Margin Health Score: ${marginHealth.healthScore}/100 (${marginHealth.status}) - Margin Cushion: ${marginHealth.marginCushionPercent.toFixed(1)}%. Click to open Monitor.`}
            className="hidden sm:flex items-center gap-1.5 bg-[#0c101c] border border-[#1e283d] hover:border-[#38bdf8] px-2.5 py-1 rounded transition-colors cursor-pointer group"
          >
            <Shield className="w-3.5 h-3.5 text-[#38bdf8] group-hover:scale-110 transition-transform" />
            <span className="text-[#8b9bb4] text-[10px]">MARGIN:</span>
            <span
              className="text-xs font-black font-mono"
              style={{ color: marginHealth.statusColor }}
            >
              {marginHealth.healthScore}%
            </span>
          </button>

          {/* Account Net Liq Snapshot */}
          <div className="hidden sm:flex items-center gap-2 bg-[#0c101c] border border-[#222d44] px-2.5 py-1 rounded">
            <span className="text-[#8b9bb4] text-[10px]">NET LIQ:</span>
            <span className="text-white font-bold">${netLiq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`text-[10px] font-bold ${isPnlPositive ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
              ({isPnlPositive ? '+' : ''}${totalPnL.toFixed(2)})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
