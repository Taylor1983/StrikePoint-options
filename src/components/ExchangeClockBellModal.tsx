import React, { useState, useEffect } from 'react';
import {
  Clock,
  Bell,
  Volume2,
  VolumeX,
  Globe,
  Check,
  X,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Search,
} from 'lucide-react';
import { playOpeningBell, playClosingBell, playKeyClick } from '../utils/terminalSound';

export interface TimeZoneOption {
  id: string;
  name: string;
  zone: string;
  label: string;
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Global' | 'Device' | 'Latin America' | 'Middle East';
  market: string;
}

export const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { id: 'et', name: 'US / Eastern (New York / Toronto)', zone: 'America/New_York', label: 'ET', region: 'North America', market: 'NYSE · NASDAQ · TSX (09:30 AM - 04:00 PM)' },
  { id: 'ct', name: 'US / Central (Chicago)', zone: 'America/Chicago', label: 'CT', region: 'North America', market: 'CME · CBOT (Futures Pit)' },
  { id: 'pt', name: 'US / Pacific (Los Angeles / SF / Vancouver)', zone: 'America/Los_Angeles', label: 'PT', region: 'North America', market: 'West Coast Standard' },
  { id: 'mt', name: 'US / Mountain (Denver / Calgary)', zone: 'America/Denver', label: 'MT', region: 'North America', market: 'Mountain Standard' },
  { id: 'at', name: 'Canada / Atlantic (Halifax)', zone: 'America/Halifax', label: 'AT', region: 'North America', market: 'Atlantic Standard' },
  { id: 'utc', name: 'UTC / GMT (Universal Coordinated Time)', zone: 'UTC', label: 'UTC', region: 'Global', market: 'Global Derivatives & FX Benchmark' },
  { id: 'lon', name: 'Europe / London (LSE)', zone: 'Europe/London', label: 'LON', region: 'Europe', market: 'London Stock Exchange (08:00 - 16:30 GMT)' },
  { id: 'fra', name: 'Europe / Frankfurt (XETRA)', zone: 'Europe/Frankfurt', label: 'CET', region: 'Europe', market: 'Deutsche Börse · Eurex' },
  { id: 'par', name: 'Europe / Paris (Euronext)', zone: 'Europe/Paris', label: 'CET', region: 'Europe', market: 'Euronext Paris · CAC 40' },
  { id: 'zur', name: 'Europe / Zurich (SIX)', zone: 'Europe/Zurich', label: 'CHF', region: 'Europe', market: 'SIX Swiss Exchange' },
  { id: 'tok', name: 'Asia / Tokyo (JPX)', zone: 'Asia/Tokyo', label: 'JST', region: 'Asia-Pacific', market: 'Tokyo Stock Exchange (09:00 - 15:30 JST)' },
  { id: 'hk', name: 'Asia / Hong Kong (HKEX)', zone: 'Asia/Hong_Kong', label: 'HKT', region: 'Asia-Pacific', market: 'Hong Kong Exchanges & Clearing' },
  { id: 'sg', name: 'Asia / Singapore (SGX)', zone: 'Asia/Singapore', label: 'SGT', region: 'Asia-Pacific', market: 'Singapore Exchange Derivatives' },
  { id: 'mum', name: 'Asia / Mumbai (NSE / BSE)', zone: 'Asia/Kolkata', label: 'IST', region: 'Asia-Pacific', market: 'National Stock Exchange of India · NIFTY' },
  { id: 'sha', name: 'Asia / Shanghai (SSE)', zone: 'Asia/Shanghai', label: 'CST', region: 'Asia-Pacific', market: 'Shanghai Stock Exchange (09:30 - 15:00 CST)' },
  { id: 'syd', name: 'Australia / Sydney (ASX)', zone: 'Australia/Sydney', label: 'AEST', region: 'Asia-Pacific', market: 'Australian Securities Exchange' },
  { id: 'dxb', name: 'Middle East / Dubai (DFM / DIFC)', zone: 'Asia/Dubai', label: 'GST', region: 'Middle East', market: 'Dubai Financial Market' },
  { id: 'br', name: 'South America / São Paulo (B3)', zone: 'America/Sao_Paulo', label: 'BRT', region: 'Latin America', market: 'B3 Brasil Bolsa Balcão' },
  { id: 'local', name: 'Local Operating System Time', zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York', label: 'LOC', region: 'Device', market: 'Local Machine Operating Clock' },
];

interface ExchangeClockBellModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTimeZoneId: string;
  onSelectTimeZoneId: (tzId: string) => void;
  isAutoBellEnabled: boolean;
  onToggleAutoBell: (enabled: boolean) => void;
  useAmPm: boolean;
  onToggleUseAmPm: (useAmPm: boolean) => void;
}

export const ExchangeClockBellModal: React.FC<ExchangeClockBellModalProps> = ({
  isOpen,
  onClose,
  selectedTimeZoneId,
  onSelectTimeZoneId,
  isAutoBellEnabled,
  onToggleAutoBell,
  useAmPm,
  onToggleUseAmPm,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [lastRung, setLastRung] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const currentOption = TIME_ZONE_OPTIONS.find((t) => t.id === selectedTimeZoneId) || TIME_ZONE_OPTIONS[0];

  // Format time in selected timezone
  const timeFormatted = currentTime.toLocaleTimeString('en-US', {
    timeZone: currentOption.zone,
    hour12: useAmPm,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateFormatted = currentTime.toLocaleDateString('en-US', {
    timeZone: currentOption.zone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate market session status relative to Eastern Time (NYSE/TSX)
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  });
  const etParts = etFormatter.formatToParts(currentTime);
  const etHour = parseInt(etParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const etMin = parseInt(etParts.find((p) => p.type === 'minute')?.value || '0', 10);
  const etDay = etParts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const isWeekend = etDay === 'Sat' || etDay === 'Sun';

  const totalEtMinutes = etHour * 60 + etMin;
  const isRegularSession = !isWeekend && totalEtMinutes >= 570 && totalEtMinutes < 960; // 09:30 AM to 04:00 PM (16:00)
  const isPreMarket = !isWeekend && totalEtMinutes >= 240 && totalEtMinutes < 570; // 04:00 AM to 09:30 AM
  const isAfterHours = !isWeekend && totalEtMinutes >= 960 && totalEtMinutes < 1200; // 16:00 to 20:00 (08:00 PM)

  let marketStatusLabel = 'CLOSED (WEEKEND)';
  let marketStatusColor = 'text-[#8c8c8c] bg-[#1a1f2c] border-[#2d3a54]';

  if (!isWeekend) {
    if (isRegularSession) {
      marketStatusLabel = '🟢 REGULAR SESSION OPEN (NYSE / TSX)';
      marketStatusColor = 'text-[#00e676] bg-[#00e676]/15 border-[#00e676]/40';
    } else if (isPreMarket) {
      marketStatusLabel = '🟡 PRE-MARKET SESSION';
      marketStatusColor = 'text-[#ffd600] bg-[#ffd600]/15 border-[#ffd600]/40';
    } else if (isAfterHours) {
      marketStatusLabel = '🟠 AFTER-HOURS SESSION';
      marketStatusColor = 'text-[#ff9900] bg-[#ff9900]/15 border-[#ff9900]/40';
    } else {
      marketStatusLabel = '⚪ OVERNIGHT CLOSED';
      marketStatusColor = 'text-[#8c8c8c] bg-[#161c28] border-[#222d42]';
    }
  }

  // Countdown to next bell
  const getNextBellText = () => {
    if (isWeekend) return 'Next Opening Bell: Monday at 09:30:00 AM ET';
    if (totalEtMinutes < 570) {
      const diff = 570 - totalEtMinutes;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `Next Opening Bell (09:30 AM ET): in ${h}h ${m}m`;
    } else if (totalEtMinutes < 960) {
      const diff = 960 - totalEtMinutes;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `Next Closing Bell (04:00 PM ET): in ${h}h ${m}m`;
    } else {
      return 'Next Opening Bell: Tomorrow at 09:30:00 AM ET';
    }
  };

  const handleRingOpening = () => {
    playOpeningBell();
    setLastRung(`OPENING BELL (09:30 AM) · ${new Date().toLocaleTimeString()}`);
  };

  const handleRingClosing = () => {
    playClosingBell();
    setLastRung(`CLOSING BELL (04:00 PM) · ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto font-mono text-xs">
      <div className="bg-[#0b0e14] border border-[#ff9900]/50 rounded-xl w-full max-w-2xl flex flex-col shadow-[0_0_50px_rgba(255,153,0,0.25)] text-gray-200 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#1f1305] via-[#101524] to-[#0c101a] border-b border-[#3b240a] p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ff9900]/20 border border-[#ff9900]/50 flex items-center justify-center text-[#ff9900] shadow-[0_0_12px_rgba(255,153,0,0.3)]">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base tracking-wide flex items-center gap-1.5">
                  <span>EXCHANGE TIME ZONE &amp; BELL CONTROLLER</span>
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#ff9900]/20 text-[#ff9900] text-[9.5px] font-black border border-[#ff9900]/40">
                  AM / PM ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-[#8c9bb4] mt-0.5">
                Global financial market clocks · NYSE / TSX Opening &amp; Closing Bell synthesis · Real-time session monitoring
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1.5 rounded bg-[#161d2b] hover:bg-[#253047] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CLOCK HERO DISPLAY */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-[#0c101c] to-[#090c14] border-b border-[#1b2538] flex flex-col items-center justify-center text-center space-y-2">
          <div className="text-[11px] text-[#8c9bb4] uppercase tracking-widest font-bold flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-[#00d2ff]" />
            <span>{currentOption.name}</span>
            <span className="text-[#ffd600] font-mono">({currentOption.label})</span>
          </div>

          {/* LARGE DIGITAL CLOCK WITH AM/PM */}
          <div className="font-mono font-black text-3xl sm:text-5xl text-white tracking-wider flex items-baseline justify-center gap-2 drop-shadow-[0_0_15px_rgba(255,153,0,0.4)]">
            <span className="text-white">{timeFormatted}</span>
          </div>

          <div className="text-xs text-[#cbd5e1] font-bold">
            {dateFormatted}
          </div>

          {/* MARKET STATUS PILL */}
          <div className={`mt-2 px-3 py-1 rounded-full border text-[10px] font-black flex items-center gap-2 ${marketStatusColor}`}>
            <span>{marketStatusLabel}</span>
          </div>

          <div className="text-[10px] text-[#8c9bb4] pt-1">
            {getNextBellText()}
          </div>
        </div>

        {/* EXCHANGE BELL CONTROLS */}
        <div className="p-4 bg-[#0e1320] border-b border-[#1b2538] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
              <Bell className="w-3.5 h-3.5 text-[#ff9900]" />
              <span>MARKET TRADING BELL CONTROLS</span>
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-[#8c9bb4] flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoBellEnabled}
                  onChange={(e) => onToggleAutoBell(e.target.checked)}
                  className="rounded bg-[#161d2b] border-[#293b58] text-[#ff9900] focus:ring-0"
                />
                <span className="text-white font-bold">Auto-Bell at 09:30 AM &amp; 04:00 PM ET</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* OPENING BELL BUTTON */}
            <button
              onClick={handleRingOpening}
              className="p-3 rounded-lg bg-gradient-to-r from-[#172518] to-[#0f1f14] border border-[#00e676]/40 hover:border-[#00e676] hover:shadow-[0_0_20px_rgba(0,230,118,0.3)] transition-all flex items-center justify-between group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#00e676]/20 border border-[#00e676]/50 flex items-center justify-center text-[#00e676] group-hover:scale-110 transition-transform">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="font-black text-white text-xs tracking-wide flex items-center gap-1.5">
                    <span>RING OPENING BELL</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#00e676]/20 text-[#00e676] text-[8.5px] font-bold">
                      09:30:00 AM
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8c9bb4] mt-0.5">
                    8-strike celebratory brass clapper sequence
                  </div>
                </div>
              </div>
              <Play className="w-4 h-4 text-[#00e676] opacity-75 group-hover:opacity-100" />
            </button>

            {/* CLOSING BELL BUTTON */}
            <button
              onClick={handleRingClosing}
              className="p-3 rounded-lg bg-gradient-to-r from-[#2a1318] to-[#1e0e12] border border-[#ff334b]/40 hover:border-[#ff334b] hover:shadow-[0_0_20px_rgba(255,51,75,0.3)] transition-all flex items-center justify-between group cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#ff334b]/20 border border-[#ff334b]/50 flex items-center justify-center text-[#ff334b] group-hover:scale-110 transition-transform">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-white text-xs tracking-wide flex items-center gap-1.5">
                    <span>RING CLOSING BELL</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#ff334b]/20 text-[#ff334b] text-[8.5px] font-bold">
                      04:00:00 PM
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8c9bb4] mt-0.5">
                    Resonant deep bronze closing chime
                  </div>
                </div>
              </div>
              <Play className="w-4 h-4 text-[#ff334b] opacity-75 group-hover:opacity-100" />
            </button>
          </div>

          {lastRung && (
            <div className="text-[9.5px] text-[#00d2ff] bg-[#00d2ff]/10 px-2 py-1 rounded border border-[#00d2ff]/20 text-center font-bold">
              ✓ Bell Sound Rung: {lastRung}
            </div>
          )}
        </div>

        {/* WORLD FINANCIAL CENTERS QUICK BAR */}
        <div className="p-3 bg-[#0d121e] border-b border-[#1b2538]">
          <div className="text-[10px] text-[#8c9bb4] uppercase tracking-wider font-bold mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-white">
              <Globe className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>MAJOR FINANCIAL MARKET CENTERS (1-CLICK SELECT)</span>
            </span>
            <span className="text-[#ffd600]">Live Market Clocks</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { id: 'et', city: 'NEW YORK', sub: 'NYSE/TSX', code: 'ET' },
              { id: 'ct', city: 'CHICAGO', sub: 'CME Pits', code: 'CT' },
              { id: 'pt', city: 'PACIFIC', sub: 'SF / LA', code: 'PT' },
              { id: 'utc', city: 'UTC / GMT', sub: 'Global Benchmark', code: 'UTC' },
              { id: 'lon', city: 'LONDON', sub: 'LSE / FTSE', code: 'LON' },
              { id: 'fra', city: 'FRANKFURT', sub: 'XETRA / DAX', code: 'CET' },
              { id: 'tok', city: 'TOKYO', sub: 'JPX / NIKKEI', code: 'JST' },
              { id: 'mum', city: 'MUMBAI', sub: 'NSE / NIFTY', code: 'IST' },
            ].map((hub) => {
              const opt = TIME_ZONE_OPTIONS.find((t) => t.id === hub.id);
              if (!opt) return null;
              const isSelected = selectedTimeZoneId === hub.id;
              const hubTime = currentTime.toLocaleTimeString('en-US', {
                timeZone: opt.zone,
                hour12: useAmPm,
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={hub.id}
                  onClick={() => {
                    playKeyClick();
                    onSelectTimeZoneId(hub.id);
                  }}
                  className={`p-2 rounded border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#ff9900]/15 border-[#ff9900] shadow-[0_0_10px_rgba(255,153,0,0.3)]'
                      : 'bg-[#080b12] border-[#1e273a] hover:border-[#8c9bb4] hover:bg-[#121927]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9.5px] font-black ${isSelected ? 'text-[#ff9900]' : 'text-white'}`}>
                      {hub.city}
                    </span>
                    <span className="text-[8.5px] px-1 rounded bg-[#1e293b] text-[#8c9bb4] font-bold">
                      {hub.code}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-xs text-[#00e676] my-1">
                    {hubTime}
                  </div>
                  <div className="text-[8.5px] text-[#8c9bb4] truncate">
                    {hub.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TIME ZONE SELECTOR GRID & SEARCH CONTROLS */}
        <div className="p-4 bg-[#0a0d14] flex-1 overflow-y-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
              <Globe className="w-3.5 h-3.5 text-[#00d2ff]" />
              <span>ALL FINANCIAL TIME ZONES ({TIME_ZONE_OPTIONS.length})</span>
            </span>

            {/* AM/PM vs 24-HR TOGGLE */}
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-[#8c9bb4] mr-1">FORMAT:</span>
              <button
                onClick={() => {
                  playKeyClick();
                  onToggleUseAmPm(true);
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all border ${
                  useAmPm
                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-black'
                    : 'bg-[#151c2a] text-[#8c9bb4] border-[#222d42] hover:text-white'
                }`}
              >
                12-HR (AM/PM)
              </button>
              <button
                onClick={() => {
                  playKeyClick();
                  onToggleUseAmPm(false);
                }}
                className={`px-2 py-0.5 rounded font-bold transition-all border ${
                  !useAmPm
                    ? 'bg-[#ff9900] text-black border-[#ff9900] font-black'
                    : 'bg-[#151c2a] text-[#8c9bb4] border-[#222d42] hover:text-white'
                }`}
              >
                24-HR (MIL)
              </button>
            </div>
          </div>

          {/* Search Box and Region Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#8c9bb4]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, country, or code (e.g. London, Chicago, JST, UTC)..."
                className="w-full bg-[#06080e] border border-[#1e273a] focus:border-[#ff9900] rounded pl-8 pr-2.5 py-1 text-xs text-white placeholder-[#556782] outline-none font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-xs text-[#8c9bb4] hover:text-white"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Region Tabs */}
            <div className="flex items-center gap-1 text-[9.5px]">
              {['ALL', 'North America', 'Europe', 'Asia-Pacific', 'Global'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    playKeyClick();
                    setSelectedRegion(r);
                  }}
                  className={`px-2 py-1 rounded font-bold transition-colors ${
                    selectedRegion === r
                      ? 'bg-[#00d2ff] text-black font-black'
                      : 'bg-[#141b2a] text-[#8c9bb4] hover:text-white'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Grid of Time Zones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
            {TIME_ZONE_OPTIONS.filter((opt) => {
              if (selectedRegion !== 'ALL' && opt.region !== selectedRegion) {
                if (selectedRegion === 'Global' && opt.region !== 'Global' && opt.region !== 'Device' && opt.region !== 'Latin America' && opt.region !== 'Middle East') {
                  return false;
                } else if (selectedRegion !== 'Global') {
                  return false;
                }
              }
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = opt.name.toLowerCase().includes(q);
                const matchCode = opt.label.toLowerCase().includes(q);
                const matchMarket = opt.market.toLowerCase().includes(q);
                const matchZone = opt.zone.toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchMarket && !matchZone) return false;
              }
              return true;
            }).map((opt) => {
              const isSelected = opt.id === selectedTimeZoneId;
              const previewTime = currentTime.toLocaleTimeString('en-US', {
                timeZone: opt.zone,
                hour12: useAmPm,
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    playKeyClick();
                    onSelectTimeZoneId(opt.id);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#172133] border-[#ff9900] shadow-[0_0_12px_rgba(255,153,0,0.25)] ring-1 ring-[#ff9900]'
                      : 'bg-[#0f1422] border-[#1d273c] hover:border-[#33466a] hover:bg-[#131b2c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black border ${
                      isSelected
                        ? 'bg-[#ff9900] text-black border-[#ff9900]'
                        : 'bg-[#182133] text-[#8c9bb4] border-[#263550]'
                    }`}>
                      {opt.label}
                    </span>
                    <div>
                      <div className="font-extrabold text-white text-[11px] leading-tight">
                        {opt.name}
                      </div>
                      <div className="text-[9.5px] text-[#8c9bb4] mt-0.5">
                        {opt.market}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className="font-bold text-xs text-[#00e676] font-mono block">
                      {previewTime}
                    </span>
                    {isSelected && (
                      <span className="text-[8.5px] text-[#ff9900] font-black flex items-center justify-end gap-0.5 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-[#0e131d] border-t border-[#1f2838] p-3 flex items-center justify-between gap-3">
          <div className="text-[10px] text-[#8c9bb4]">
            Time Zone saved to persistent session preferences.
          </div>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-[#ff9900] hover:bg-[#ffaa22] text-black font-black text-xs transition-colors shadow-sm"
          >
            APPLY &amp; CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
