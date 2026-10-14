import React from 'react';
import {
  X,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Clock,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Sparkles,
  Info,
  ServerOff,
  Key,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';
import { PrivacySettings } from '../utils/privacy';

interface AccountPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrivacySettings;
  onUpdateSettings: (newSettings: Partial<PrivacySettings>) => void;
  onTriggerScreenBlur: () => void;
  onClearLocalData: () => void;
}

export const AccountPrivacyModal: React.FC<AccountPrivacyModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onTriggerScreenBlur,
  onClearLocalData,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Privacy and Stealth Settings"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200 font-sans">
        {/* Modal Top Header */}
        <div className="bg-[#0e1628] border-b border-[#1e2a44] px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#00d2ff]/10 border border-[#00d2ff]/40 flex items-center justify-center text-[#00d2ff]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide">
                  ACCOUNT PRIVACY &amp; STEALTH SUITE
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                    settings.isPrivacyMode
                      ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40'
                      : 'bg-[#64748b]/20 text-[#94a3b8] border-[#64748b]/40'
                  }`}
                >
                  {settings.isPrivacyMode ? 'STEALTH ACTIVE' : 'STANDARD'}
                </span>
              </div>
              <div className="text-[10px] text-[#8b9bb4]">
                Financial balance masking, screen camouflage, and inactivity security controls
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1 rounded hover:bg-[#18243c] text-[#8b9bb4] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
          {/* Quick Action: Instant Screen Blur */}
          <div className="bg-[#0e172a] border border-[#00d2ff]/40 rounded-lg p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#00d2ff]/15 flex items-center justify-center text-[#00d2ff] shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white text-xs block">
                  Instant Screen Camouflage (Privacy Shield)
                </span>
                <span className="text-[10.5px] text-[#8b9bb4]">
                  Immediately blurs and camouflages entire terminal behind a secure lock overlay. Press <kbd className="text-white bg-[#1e293b] px-1 py-0.2 rounded font-mono text-[9px]">Esc</kbd> anytime to unlock.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                playExecutionChime();
                onTriggerScreenBlur();
                onClose();
              }}
              className="px-3 py-1.5 bg-[#00d2ff] hover:bg-[#00b4db] text-black font-extrabold text-[11px] rounded shadow transition-colors shrink-0 cursor-pointer"
            >
              BLUR SCREEN NOW
            </button>
          </div>

          {/* Setting 1: Balance & Monetary Masking */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.isPrivacyMode ? (
                  <EyeOff className="w-4 h-4 text-[#ff9900]" />
                ) : (
                  <Eye className="w-4 h-4 text-[#8b9bb4]" />
                )}
                <div>
                  <span className="font-bold text-white block">
                    Financial Stealth Mode (Mask Balances)
                  </span>
                  <span className="text-[10.5px] text-[#8b9bb4]">
                    Replaces Net Liq, Buying Power, Margin balances, and P&amp;L with asterisks (<code className="text-[#00d2ff]">••••••</code>).
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  playKeyClick();
                  onUpdateSettings({ isPrivacyMode: !settings.isPrivacyMode });
                }}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                  settings.isPrivacyMode ? 'bg-[#ff9900]' : 'bg-[#1e293b]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.isPrivacyMode ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sub-option: Peek on hover */}
            <div className="ml-6 pt-2 border-t border-[#182338] flex items-center justify-between text-[11px]">
              <span className="text-[#cbd5e1]">Allow peek on hover / click</span>
              <input
                type="checkbox"
                checked={settings.allowPeekOnHover}
                onChange={(e) => {
                  playKeyClick();
                  onUpdateSettings({ allowPeekOnHover: e.target.checked });
                }}
                className="accent-[#ff9900] cursor-pointer"
              />
            </div>
          </div>

          {/* Setting 2: Account Number Masking */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#38bdf8]" />
              <div>
                <span className="font-bold text-white block">
                  Mask Institutional Account Identifiers
                </span>
                <span className="text-[10.5px] text-[#8b9bb4]">
                  Renders account numbers partially obscured (e.g., <code className="text-[#38bdf8]">PA-••••943</code>).
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                playKeyClick();
                onUpdateSettings({ isMaskAccountNumbers: !settings.isMaskAccountNumbers });
              }}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                settings.isMaskAccountNumbers ? 'bg-[#38bdf8]' : 'bg-[#1e293b]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  settings.isMaskAccountNumbers ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Inactivity Auto-Lock */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#ffd600]" />
                <div>
                  <span className="font-bold text-white block">
                    Inactivity Auto-Camouflage Lock
                  </span>
                  <span className="text-[10.5px] text-[#8b9bb4]">
                    Automatically blurs the workspace when no mouse or keyboard inputs occur.
                  </span>
                </div>
              </div>

              <select
                value={settings.inactivityLockMinutes}
                onChange={(e) => {
                  playKeyClick();
                  onUpdateSettings({ inactivityLockMinutes: Number(e.target.value) });
                }}
                className="bg-[#101726] border border-[#222f49] text-white text-xs rounded px-2 py-1 outline-none font-mono cursor-pointer"
              >
                <option value={0}>Disabled</option>
                <option value={1}>1 Minute</option>
                <option value={3}>3 Minutes</option>
                <option value={5}>5 Minutes (Standard)</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
              </select>
            </div>
          </div>

          {/* Setting 4: Data Cleanliness & Local Storage Purge */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[#ef4444]" />
              <div>
                <span className="font-bold text-white block">
                  Purge Local Blotter &amp; Cached Session
                </span>
                <span className="text-[10.5px] text-[#8b9bb4]">
                  Wipes stored watchlists, position history, and resets browser storage cleanly.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Reset local blotters, cached trades, and terminal state?')) {
                  playExecutionChime();
                  onClearLocalData();
                }
              }}
              className="px-2.5 py-1 bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/40 rounded text-[11px] font-bold transition-colors cursor-pointer"
            >
              PURGE DATA
            </button>
          </div>

          {/* Zero-Telemetry Audit Assurance */}
          <div className="bg-[#05111d] border border-[#0e3b5e] rounded p-3 flex items-start gap-2.5">
            <ServerOff className="w-4 h-4 text-[#00d2ff] shrink-0 mt-0.5" />
            <div className="text-[10.5px] text-[#8b9bb4] leading-relaxed">
              <strong className="text-white block mb-0.5">Zero-Telemetry Privacy Guarantee:</strong>
              StrikePoint Terminal operates entirely in-memory with client-side Black-Scholes evaluation. No trade tickets, account balances, or portfolio positions are ever transmitted to third-party tracking or advertising networks.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#0e1628] border-t border-[#1e2a44] px-4 py-2.5 flex items-center justify-between text-xs text-[#8b9bb4]">
          <span className="font-mono text-[10px]">
            HOTKEY: <kbd className="text-white bg-[#1e293b] px-1 py-0.5 rounded font-mono">Alt + P</kbd> toggles stealth mode
          </span>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-3 py-1 bg-[#ff9900] hover:bg-[#e68a00] text-black font-extrabold text-[11px] rounded transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
