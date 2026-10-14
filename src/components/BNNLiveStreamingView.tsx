import React, { useState, useEffect } from 'react';
import {
  Tv,
  Radio,
  ExternalLink,
  Volume2,
  VolumeX,
  Maximize2,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Info,
  Play,
  Share2,
  Check,
  Video
} from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';
import { Ticker } from '../types/options';

export type BnnStreamSource = 'bnn-live' | 'bloomberg-tv' | 'bnn-portal' | 'bloomberg-global';

interface BnnStreamInfo {
  id: BnnStreamSource;
  title: string;
  badge: string;
  desc: string;
  url: string;
  origin: string;
}

const STREAM_SOURCES: BnnStreamInfo[] = [
  {
    id: 'bnn-live',
    title: 'BNN Bloomberg Live Broadcast',
    badge: 'BELL MEDIA / BNN LIVE',
    desc: 'Official live Canadian business broadcast (TSX, Market Call, The Close, Berman\'s Call)',
    url: 'https://embed.jasperplayer.com/?brand=bnn&destination=bnn_web&language=EN&contentId=84675',
    origin: 'bnnbloomberg.ca',
  },
  {
    id: 'bloomberg-tv',
    title: 'Bloomberg Television on BNN',
    badge: 'BLOOMBERG GLOBAL TV',
    desc: 'Official Bloomberg Television global live feed hosted on BNN Bloomberg platform',
    url: 'https://embed.jasperplayer.com/?brand=bnn&destination=bnn_web&language=EN&contentId=1366770',
    origin: 'bnnbloomberg.ca',
  },
  {
    id: 'bnn-portal',
    title: 'BNN Bloomberg Web Portal Feed',
    badge: 'BNN SITE DIRECT',
    desc: 'Direct website stream view from bnnbloomberg.ca/video/live',
    url: 'https://www.bnnbloomberg.ca/video/live/2025/02/07/watch-bnn-bloomberg-live/',
    origin: 'bnnbloomberg.ca',
  },
  {
    id: 'bloomberg-global',
    title: 'Bloomberg Markets Live Stream',
    badge: 'GLOBAL FAST FEED',
    desc: 'High-availability low-latency global financial markets live video stream',
    url: 'https://www.youtube-nocookie.com/embed/dp8PhLsUcFE?autoplay=1&mute=0',
    origin: 'bloomberg.com',
  },
];

interface BnnShow {
  timeET: string;
  title: string;
  host: string;
  description: string;
  category: 'Morning' | 'Midday' | 'Closing' | 'Evening';
}

const BNN_PROGRAMMING_SCHEDULE: BnnShow[] = [
  {
    timeET: '07:00 - 08:30',
    title: 'The Morning Call',
    host: 'BNN Newsroom',
    description: 'Pre-market analysis, global overnight moves in Asia & Europe, TSX futures preview.',
    category: 'Morning',
  },
  {
    timeET: '08:30 - 10:00',
    title: 'The Open',
    host: 'Jon Erlichman & Amber Kanwar',
    description: 'The opening bell on Bay Street and Wall Street. Top corporate earnings movers.',
    category: 'Morning',
  },
  {
    timeET: '10:00 - 11:30',
    title: 'The Street',
    host: 'Paul Bagnell',
    description: 'Sector rotation, Bank of Canada policy outlook, and macro economic data.',
    category: 'Morning',
  },
  {
    timeET: '11:30 - 12:00',
    title: 'Morning Markets',
    host: 'Andrew Bell',
    description: 'Forex, Canadian Dollar dynamics, bond yield curves, and resource equities.',
    category: 'Morning',
  },
  {
    timeET: '12:00 - 13:30',
    title: 'Market Call',
    host: 'Michael Hainsworth & Guests',
    description: 'Canada’s premier stock-picking show. Top money managers answer viewer phone calls & give Top 3 picks.',
    category: 'Midday',
  },
  {
    timeET: '13:30 - 14:00',
    title: 'Trading Day',
    host: 'Catherine Murray',
    description: 'Midday options flow, institutional block trades, volatility skew, and market breadth.',
    category: 'Midday',
  },
  {
    timeET: '14:00 - 15:00',
    title: 'Commodities',
    host: 'Andrew Bell',
    description: 'Energy, WTI Crude Oil, Natural Gas, Gold, Uranium, Base Metals & battery materials.',
    category: 'Midday',
  },
  {
    timeET: '15:00 - 16:30',
    title: 'The Close',
    host: 'Greg Bonnell',
    description: 'The final trading hour, TSX & S&P 500 Market On Close (MOC) imbalances, closing bell auction.',
    category: 'Closing',
  },
  {
    timeET: '16:30 - 17:30',
    title: "Berman's Call",
    host: 'Larry Berman (ETF Capital Management)',
    description: 'Technical analysis, ETF asset allocation, risk management strategies, and chart breakdowns.',
    category: 'Closing',
  },
  {
    timeET: '17:30 - 18:30',
    title: 'Taking Stock & Money Talk',
    host: 'Pamela Ritchie & Kim Parlee',
    description: 'In-depth interviews with corporate CEOs, personal wealth, retirement strategies, and tax planning.',
    category: 'Evening',
  },
];

interface BNNLiveStreamingViewProps {
  onSelectTicker?: (symbol: string) => void;
  onPopOut?: () => void;
  onTogglePip?: () => void;
  isPipActive?: boolean;
}

export const BNNLiveStreamingView: React.FC<BNNLiveStreamingViewProps> = ({
  onSelectTicker,
  onPopOut,
  onTogglePip,
  isPipActive = false,
}) => {
  const [activeSource, setActiveSource] = useState<BnnStreamSource>('bnn-live');
  const [key, setKey] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [nowET, setNowET] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const etString = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setNowET(etString);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine current active show based on Eastern Time
  const currentShow = React.useMemo(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '12', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const totalMinutes = hour * 60 + minute;

    if (totalMinutes < 510) return BNN_PROGRAMMING_SCHEDULE[0]; // The Morning Call
    if (totalMinutes < 600) return BNN_PROGRAMMING_SCHEDULE[1]; // The Open
    if (totalMinutes < 690) return BNN_PROGRAMMING_SCHEDULE[2]; // The Street
    if (totalMinutes < 720) return BNN_PROGRAMMING_SCHEDULE[3]; // Morning Markets
    if (totalMinutes < 810) return BNN_PROGRAMMING_SCHEDULE[4]; // Market Call
    if (totalMinutes < 840) return BNN_PROGRAMMING_SCHEDULE[5]; // Trading Day
    if (totalMinutes < 900) return BNN_PROGRAMMING_SCHEDULE[6]; // Commodities
    if (totalMinutes < 990) return BNN_PROGRAMMING_SCHEDULE[7]; // The Close
    if (totalMinutes < 1050) return BNN_PROGRAMMING_SCHEDULE[8]; // Berman's Call
    return BNN_PROGRAMMING_SCHEDULE[9]; // Taking Stock
  }, [nowET]);

  const activeStream = STREAM_SOURCES.find((s) => s.id === activeSource) || STREAM_SOURCES[0];

  const handleReload = () => {
    playKeyClick();
    setKey((prev) => prev + 1);
  };

  const handleShare = () => {
    playKeyClick();
    navigator.clipboard.writeText('https://www.bnnbloomberg.ca/video/live/');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090e] text-[#d1d5db] overflow-y-auto no-scrollbar font-mono text-xs select-none">
      {/* Top Banner & Control Deck */}
      <div className="bg-[#0b0f19] border-b border-[#1e2638] px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {/* Live Indicator Badge */}
          <div className="flex items-center gap-2 bg-[#ff1744]/15 border border-[#ff1744]/40 px-2.5 py-1 rounded-md text-[#ff1744]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff1744] animate-ping" />
            <span className="font-black text-[11px] tracking-wider">LIVE ON AIR</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                <span className="text-[#ff9900]">BNN</span> BLOOMBERG
              </span>
              <span className="text-[10px] bg-[#1e293b] text-[#94a3b8] px-1.5 py-0.5 rounded border border-[#334155] font-bold">
                FREE LIVE STREAM
              </span>
            </div>
            <div className="text-[10px] text-[#8b9bb4] flex items-center gap-2">
              <span>Canada's Business & Financial News Network</span>
              <span className="text-[#3b82f6]">·</span>
              <span className="text-[#38bdf8] font-bold">Bell Media & Bloomberg LP</span>
            </div>
          </div>
        </div>

        {/* Stream Source Selector Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-[#05070c] p-1 rounded-lg border border-[#1e2638]">
          {STREAM_SOURCES.map((source) => {
            const isActive = source.id === activeSource;
            return (
              <button
                key={source.id}
                onClick={() => {
                  playKeyClick();
                  setActiveSource(source.id);
                  setKey((prev) => prev + 1);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#ff9900] text-black shadow-sm font-extrabold'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#141b2a]'
                }`}
                title={source.desc}
              >
                <Tv className={`w-3 h-3 ${isActive ? 'text-black' : 'text-[#ff9900]'}`} />
                <span>{source.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Global Stream Control Actions */}
        <div className="flex items-center gap-2">
          {onTogglePip && (
            <button
              onClick={() => {
                playKeyClick();
                onTogglePip();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                isPipActive
                  ? 'bg-[#3b82f6]/20 text-[#38bdf8] border-[#38bdf8]/50'
                  : 'bg-[#121927] hover:bg-[#1e293b] text-[#cbd5e1] border-[#222f46]'
              }`}
              title="Toggle Floating Picture-in-Picture (PiP) Window across all trading screens"
            >
              <Layers className="w-3 h-3 text-[#38bdf8]" />
              <span className="hidden md:inline">{isPipActive ? 'CLOSE PiP' : 'FLOAT PiP'}</span>
            </button>
          )}

          <button
            onClick={handleReload}
            className="flex items-center gap-1 px-2 py-1 bg-[#121927] hover:bg-[#1e293b] text-[#cbd5e1] hover:text-white rounded border border-[#222f46] text-[10px] font-bold transition-all cursor-pointer"
            title="Reload live stream connection"
          >
            <RefreshCw className="w-3 h-3 text-[#ff9900]" />
            <span className="hidden sm:inline">RELOAD</span>
          </button>

          {onPopOut && (
            <button
              onClick={() => {
                playKeyClick();
                onPopOut();
              }}
              className="flex items-center gap-1 px-2 py-1 bg-[#121927] hover:bg-[#1e293b] text-[#00e5ff] rounded border border-[#00e5ff]/30 text-[10px] font-bold transition-all cursor-pointer"
              title="Pop out BNN live player into a separate floating window"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline">POP OUT</span>
            </button>
          )}

          <a
            href="https://www.bnnbloomberg.ca/video/live/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-[#ff9900]/15 hover:bg-[#ff9900]/25 text-[#ff9900] rounded border border-[#ff9900]/40 text-[10px] font-bold transition-all cursor-pointer"
            title="Open live broadcast on official BNNBloomberg.ca website"
          >
            <span>BNN SITE ↗</span>
          </a>
        </div>
      </div>

      {/* Main Two-Column Layout: Video Player + Telemetry & Program Guide */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 p-3 sm:p-5 w-full max-w-full ml-0 mr-auto text-left">
        {/* Left Video Player Deck (8 Cols on XL) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          {/* Active Player Container */}
          <div className="relative w-full aspect-video bg-[#000000] rounded-lg border border-[#1e2638] shadow-[0_4px_24px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col group">
            <iframe
              key={`${activeSource}-${key}`}
              src={activeStream.url}
              title={activeStream.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />

            {/* Bottom Stream Status Strip */}
            <div className="bg-[#090d16] border-t border-[#1e2638] px-3 py-1.5 flex items-center justify-between text-[11px] text-[#8b9bb4]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00e676]" />
                <span className="font-bold text-white">{activeStream.title}</span>
                <span className="text-[#64748b]">·</span>
                <span className="text-[10px] text-[#38bdf8] font-mono">{activeStream.origin}</span>
              </div>

              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[#8b9bb4]">
                  EASTERN TIME: <strong className="text-white font-mono">{nowET}</strong>
                </span>
                <button
                  onClick={handleShare}
                  className="hover:text-white flex items-center gap-1 cursor-pointer"
                  title="Copy official BNN Bloomberg stream link"
                >
                  {isCopied ? <Check className="w-3 h-3 text-[#00e676]" /> : <Share2 className="w-3 h-3 text-[#ff9900]" />}
                  <span>{isCopied ? 'COPIED' : 'SHARE'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Canadian & US Market Bar */}
          <div className="bg-[#0b0f19] border border-[#1e2638] rounded-md p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1a2336] text-[10px]">
              <span className="font-bold text-white tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff9900]" />
                BAY STREET & WALL STREET TELEMETRY
              </span>
              <span className="text-[#8b9bb4]">Real-Time Snapshot</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { name: 'S&P/TSX 60', sym: 'XIU.TO', val: '24,680.12', chg: '+0.54%', pos: true },
                { name: 'S&P 500', sym: 'SPY', val: '5,864.67', chg: '+0.41%', pos: true },
                { name: 'USD / CAD', sym: 'DLR.TO', val: '1.3842', chg: '-0.12%', pos: false },
                { name: 'WTI CRUDE', sym: '/CL', val: '$74.38', chg: '+1.82%', pos: true },
                { name: 'GOLD SPOT', sym: '/GC', val: '$2,654.10', chg: '+0.67%', pos: true },
                { name: 'CANADA 10Y', sym: 'CA10Y', val: '3.18%', chg: '-2.4 bps', pos: false },
              ].map((m) => (
                <div
                  key={m.name}
                  onClick={() => onSelectTicker && onSelectTicker(m.sym)}
                  className="bg-[#06080f] p-2 rounded border border-[#172033] hover:border-[#ff9900]/60 transition-colors cursor-pointer group"
                >
                  <div className="text-[9px] text-[#8b9bb4] font-bold group-hover:text-[#ff9900] truncate">
                    {m.name}
                  </div>
                  <div className="font-bold text-white text-xs mt-0.5">{m.val}</div>
                  <div className={`text-[10px] font-bold ${m.pos ? 'text-[#00e676]' : 'text-[#ff334b]'}`}>
                    {m.chg}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Broadcast Spotlight */}
          <div className="bg-[#0b0f19] border border-[#1e2638] rounded-md p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-[#ff9900]/15 border border-[#ff9900]/30 text-[#ff9900] shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[9px] text-[#ff9900] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff9900] animate-pulse" />
                  <span>ON AIR NOW: {currentShow.category.toUpperCase()} BROADCAST</span>
                </div>
                <div className="text-sm font-extrabold text-white mt-0.5">{currentShow.title}</div>
                <div className="text-[11px] text-[#8b9bb4] mt-0.5">
                  Hosted by <strong className="text-[#e2e8f0]">{currentShow.host}</strong> · {currentShow.timeET} ET
                </div>
                <p className="text-[10px] text-[#94a3b8] mt-1 max-w-xl">{currentShow.description}</p>
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
              <a
                href="https://www.bnnbloomberg.ca/market-call/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-[#1e293b] hover:bg-[#334155] text-white text-[10px] font-bold text-center border border-[#475569] transition-colors"
              >
                Call In / Submit Pick ↗
              </a>
              <a
                href="https://www.bnnbloomberg.ca/shows/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-[#0f172a] hover:bg-[#1e293b] text-[#38bdf8] text-[10px] font-bold text-center border border-[#38bdf8]/40 transition-colors"
              >
                All BNN Shows Archive ↗
              </a>
            </div>
          </div>
        </div>

        {/* Right Programming Schedule & Market Ticker Column (4 Cols on XL) */}
        <div className="xl:col-span-4 flex flex-col gap-3">
          {/* Programming Guide Card */}
          <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3.5 flex flex-col flex-1">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#1e2638]">
              <span className="font-extrabold text-white text-xs tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#ff9900]" />
                TODAY'S BNN BROADCAST SCHEDULE
              </span>
              <span className="text-[10px] text-[#8b9bb4] font-mono">Eastern Time (ET)</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1">
              {BNN_PROGRAMMING_SCHEDULE.map((show) => {
                const isCurrent = show.title === currentShow.title;
                return (
                  <div
                    key={show.title}
                    className={`p-2.5 rounded border transition-all ${
                      isCurrent
                        ? 'bg-[#ff9900]/15 border-[#ff9900]/50 shadow-sm'
                        : 'bg-[#06080e] border-[#172033] hover:border-[#2d3b55]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-mono font-bold ${isCurrent ? 'text-[#ff9900]' : 'text-[#8b9bb4]'}`}>
                        {show.timeET}
                      </span>
                      {isCurrent && (
                        <span className="text-[8px] font-black bg-[#ff1744] text-white px-1.5 py-0.2 rounded-full animate-pulse">
                          LIVE NOW
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-white text-xs mt-0.5">{show.title}</div>
                    <div className="text-[10px] text-[#cbd5e1] mt-0.5 font-sans">
                      {show.host}
                    </div>
                    <div className="text-[9.5px] text-[#718096] mt-1 line-clamp-2 leading-tight">
                      {show.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick TSX Top Market Movers & Clickable Tickers */}
          <div className="bg-[#0b0f19] border border-[#1e2638] rounded-lg p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1e2638] text-[10px]">
              <span className="font-bold text-white tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff9900]" />
                CANADIAN BLUE CHIPS IN FOCUS
              </span>
              <span className="text-[9px] text-[#8b9bb4]">Click to trade options</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { sym: 'RY.TO', name: 'Royal Bank', price: '$172.50', chg: '+0.85%' },
                { sym: 'TD.TO', name: 'TD Bank', price: '$84.10', chg: '+0.42%' },
                { sym: 'ENB.TO', name: 'Enbridge', price: '$54.20', chg: '+1.15%' },
                { sym: 'CNQ.TO', name: 'Canadian Natural', price: '$51.80', chg: '+2.10%' },
                { sym: 'SHOP.TO', name: 'Shopify', price: '$112.40', chg: '-1.45%' },
                { sym: 'BAM.TO', name: 'Brookfield Asset', price: '$58.90', chg: '+0.70%' },
              ].map((stock) => (
                <button
                  key={stock.sym}
                  type="button"
                  onClick={() => onSelectTicker && onSelectTicker(stock.sym)}
                  className="bg-[#06080e] hover:bg-[#141d2e] p-2 rounded border border-[#172033] hover:border-[#ff9900]/50 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-extrabold text-[#00d2ff] group-hover:text-[#ff9900]">
                      🇨🇦 {stock.sym}
                    </span>
                    <span className={stock.chg.startsWith('+') ? 'text-[#00e676] font-bold' : 'text-[#ff334b] font-bold'}>
                      {stock.chg}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#8b9bb4] truncate mt-0.5">{stock.name}</div>
                  <div className="text-[10px] font-bold text-white">{stock.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Network Credits & Compliance */}
          <div className="bg-[#070a12] border border-[#1a2336] rounded p-2.5 text-[9.5px] text-[#64748b] flex items-center justify-between gap-2">
            <div>
              <strong className="text-[#94a3b8]">BNN Bloomberg Canada</strong> is a partnership between{' '}
              <strong className="text-white">Bell Media</strong> and{' '}
              <strong className="text-white">Bloomberg L.P.</strong> Live free streams streamed via official player.
            </div>
            <a
              href="https://www.bnnbloomberg.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ff9900] hover:underline shrink-0 font-bold"
            >
              bnnbloomberg.ca ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
