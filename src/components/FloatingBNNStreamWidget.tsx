import React, { useState } from 'react';
import {
  Tv,
  Maximize2,
  X,
  Minus,
  RefreshCw,
  ExternalLink,
  Volume2,
  VolumeX,
  Move
} from 'lucide-react';
import { playKeyClick } from '../utils/terminalSound';
import { BnnStreamSource } from './BNNLiveStreamingView';

interface FloatingBNNStreamWidgetProps {
  onClose: () => void;
  onMaximize: () => void;
  onPopOut?: () => void;
}

export const FloatingBNNStreamWidget: React.FC<FloatingBNNStreamWidgetProps> = ({
  onClose,
  onMaximize,
  onPopOut,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeSource, setActiveSource] = useState<BnnStreamSource>('bnn-live');
  const [key, setKey] = useState<number>(0);

  const streamUrls: Record<BnnStreamSource, string> = {
    'bnn-live': 'https://embed.jasperplayer.com/?brand=bnn&destination=bnn_web&language=EN&contentId=84675',
    'bloomberg-tv': 'https://embed.jasperplayer.com/?brand=bnn&destination=bnn_web&language=EN&contentId=1366770',
    'bnn-portal': 'https://www.bnnbloomberg.ca/video/live/2025/02/07/watch-bnn-bloomberg-live/',
    'bloomberg-global': 'https://www.youtube-nocookie.com/embed/dp8PhLsUcFE?autoplay=1&mute=0',
  };

  return (
    <div
      className={`fixed bottom-14 sm:bottom-10 right-3 sm:right-6 z-50 bg-[#070a12] border-2 border-[#ff9900]/70 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.9)] overflow-hidden transition-all font-mono select-none flex flex-col ${
        isMinimized ? 'w-64 h-11' : 'w-80 sm:w-96 md:w-[420px] aspect-video sm:aspect-auto sm:h-72'
      }`}
    >
      {/* Top Drag / Header Bar */}
      <div className="bg-[#0e1424] px-3 py-1.5 flex items-center justify-between border-b border-[#1e293f] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff1744] animate-ping" />
          <span className="font-extrabold text-white text-[11px] flex items-center gap-1">
            <span className="text-[#ff9900]">BNN</span> LIVE
          </span>
          <span className="text-[9px] bg-[#1e293b] text-[#94a3b8] px-1 py-0.2 rounded font-bold">
            PiP
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Channel selector in PiP */}
          <select
            value={activeSource}
            onChange={(e) => {
              playKeyClick();
              setActiveSource(e.target.value as BnnStreamSource);
              setKey((k) => k + 1);
            }}
            className="bg-[#070a14] border border-[#222e46] text-[#cbd5e1] text-[9.5px] rounded px-1 py-0.5"
            title="Switch Live Channel Feed"
          >
            <option value="bnn-live">BNN Canada</option>
            <option value="bloomberg-tv">Bloomberg TV</option>
            <option value="bnn-portal">BNN Site</option>
            <option value="bloomberg-global">Global Markets</option>
          </select>

          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => {
              playKeyClick();
              setIsMinimized((prev) => !prev);
            }}
            className="p-1 rounded text-[#8b9bb4] hover:text-white hover:bg-[#1a2336] transition-colors"
            title={isMinimized ? 'Restore PiP size' : 'Minimize to bar'}
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Maximize to Full Terminal View */}
          <button
            onClick={() => {
              playKeyClick();
              onMaximize();
            }}
            className="p-1 rounded text-[#ff9900] hover:text-white hover:bg-[#ff9900]/20 transition-colors"
            title="Expand to Full Terminal Screen <BNN>"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Pop-Out in separate window */}
          {onPopOut && (
            <button
              onClick={() => {
                playKeyClick();
                onPopOut();
              }}
              className="p-1 rounded text-[#00e5ff] hover:text-white hover:bg-[#00e5ff]/20 transition-colors"
              title="Open stream in separate pop-out window"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          {/* Close PiP */}
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1 rounded text-[#ef4444] hover:text-white hover:bg-[#ef4444]/20 transition-colors"
            title="Close Picture-in-Picture window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Content when not minimized */}
      {!isMinimized && (
        <div className="flex-1 w-full bg-black relative">
          <iframe
            key={`${activeSource}-${key}`}
            src={streamUrls[activeSource]}
            title="BNN Bloomberg Live Stream PiP"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};
