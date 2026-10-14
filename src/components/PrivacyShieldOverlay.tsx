import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Clock,
  Activity,
  CheckCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

interface PrivacyShieldOverlayProps {
  isActive: boolean;
  onUnlock: () => void;
  clockTime?: string;
  isPrivacyMode?: boolean;
}

export const PrivacyShieldOverlay: React.FC<PrivacyShieldOverlayProps> = ({
  isActive,
  onUnlock,
  clockTime,
  isPrivacyMode = true,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPinPad, setShowPinPad] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to Escape or Enter keys to quickly unlock
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        playExecutionChime();
        onUnlock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onUnlock]);

  if (!isActive) return null;

  const handleQuickUnlock = () => {
    playExecutionChime();
    onUnlock();
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playExecutionChime();
    onUnlock();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Terminal Privacy Shield"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center p-4 bg-[#050914]/90 backdrop-blur-xl select-none animate-in fade-in duration-200"
    >
      {/* Background Bloomberg Grid Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

      {/* Security Status Box */}
      <div className="relative z-10 max-w-md w-full bg-[#0a101f] border border-[#1e2a44] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 flex flex-col items-center text-center">
        {/* Glowing Shield Icon */}
        <div className="w-16 h-16 rounded-full bg-[#00d2ff]/10 border border-[#00d2ff]/40 flex items-center justify-center text-[#00d2ff] mb-4 shadow-[0_0_25px_rgba(0,210,255,0.25)] animate-pulse">
          <Lock className="w-8 h-8 text-[#00d2ff]" />
        </div>

        {/* Header Badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00d2ff]/10 border border-[#00d2ff]/30 text-[#00d2ff] text-[10px] font-mono font-bold tracking-wider uppercase mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-ping" />
          <span>STRIKEPOINT PRIVACY SHIELD ACTIVE</span>
        </div>

        <h2 className="text-xl font-black text-white tracking-wide">
          WORKSPACE CAMOUFLAGED
        </h2>

        <p className="text-xs text-[#8b9bb4] mt-1.5 max-w-sm">
          All financial balances, portfolio metrics, and open blotters are securely hidden from bystanders. Real-time CBOE market data feeds continue uninterrupted.
        </p>

        {/* Live Feed Heartbeat Info */}
        <div className="mt-5 w-full bg-[#060b16] border border-[#182338] rounded-lg p-3 flex items-center justify-between text-xs text-[#64748b] font-mono">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#00e676]" />
            <span className="text-[#94a3b8]">FEED STATUS:</span>
            <span className="text-[#00e676] font-bold">CONNECTED</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-[#ff9900]" />
            <span>{clockTime || currentTime}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 w-full flex flex-col gap-2.5">
          <button
            onClick={handleQuickUnlock}
            className="w-full py-2.5 px-4 rounded bg-[#ff9900] hover:bg-[#e68a00] text-black font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-[#ff9900]/25 transition-all cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>RESUME TRADING WORKSPACE</span>
          </button>

          <div className="flex items-center justify-between text-[11px] text-[#8b9bb4] px-1">
            <span className="flex items-center gap-1">
              <span className="kbd bg-[#141d2e] px-1.5 py-0.5 rounded border border-[#23324d] text-[10px] font-mono text-white">Esc</span>
              <span>or</span>
              <span className="kbd bg-[#141d2e] px-1.5 py-0.5 rounded border border-[#23324d] text-[10px] font-mono text-white">Enter</span>
              <span>to resume</span>
            </span>

            <button
              onClick={() => setShowPinPad((prev) => !prev)}
              className="text-[#00d2ff] hover:underline flex items-center gap-1 font-mono text-[10.5px]"
            >
              <KeyRound className="w-3 h-3" />
              <span>{showPinPad ? 'Hide PIN Pad' : 'Security PIN'}</span>
            </button>
          </div>

          {/* Optional PIN pad for institutional compliance */}
          {showPinPad && (
            <form onSubmit={handlePinSubmit} className="mt-2 w-full flex gap-2">
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter Trader PIN (demo: any)"
                className="flex-1 bg-[#060b16] border border-[#23324d] rounded px-3 py-1.5 text-xs text-white text-center font-mono focus:border-[#00d2ff] outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#00d2ff] text-black font-bold text-xs rounded hover:bg-[#00b4db]"
              >
                Unlock
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
