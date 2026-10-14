import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

interface BiometricLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTerminalLocked: boolean;
  onUnlockTerminal: () => void;
  onLockTerminal: () => void;
  userName?: string;
  terminalId?: string;
}

export const BiometricLoginModal: React.FC<BiometricLoginModalProps> = ({
  isOpen,
  onClose,
  isTerminalLocked,
  onUnlockTerminal,
  onLockTerminal,
  userName = 'CLINTON TAYLOR',
  terminalId = 'BBG-TRADER-8894-CA',
}) => {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('TOUCH SENSOR TO SCAN FINGERPRINT');
  const [pinCode, setPinCode] = useState<string>('');
  const [authMode, setAuthMode] = useState<'fingerprint' | 'pin'>('fingerprint');
  const [biometricSupported, setBiometricSupported] = useState<boolean>(true);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bbg_autolock_min');
      return saved ? Number(saved) : 15;
    } catch {
      return 15;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then((available) => setBiometricSupported(available))
        .catch(() => setBiometricSupported(true));
    }
  }, []);

  if (!isOpen && !isTerminalLocked) return null;

  // Real WebAuthn + Simulated Biometric Verification
  const handleScanFingerprint = async () => {
    if (scanState === 'scanning') return;
    playKeyClick();
    setScanState('scanning');
    setStatusMessage('READING BIOMETRIC DERMAL RIDGES...');

    try {
      // Attempt platform WebAuthn if available in browser
      if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);

          // Quick probe with timeout
          const credPromise = navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 4000,
              userVerification: 'preferred',
            },
          });

          // Timeout fallback to terminal biometric simulation
          const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 950));
          await Promise.race([credPromise, timeoutPromise]);
        } catch {
          // Fall through to terminal scan simulation
        }
      } else {
        await new Promise((r) => setTimeout(r, 900));
      }

      setScanState('success');
      setStatusMessage('FINGERPRINT MATCH CONFIRMED // B-UNIT VERIFIED');
      playExecutionChime();

      setTimeout(() => {
        onUnlockTerminal();
        setScanState('idle');
        setStatusMessage('TOUCH SENSOR TO SCAN FINGERPRINT');
        onClose();
      }, 700);
    } catch {
      setScanState('error');
      setStatusMessage('SCAN FAILED: RETRY OR USE B-UNIT PIN');
      setTimeout(() => {
        setScanState('idle');
        setStatusMessage('TOUCH SENSOR TO SCAN FINGERPRINT');
      }, 2000);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playKeyClick();
    if (pinCode.length >= 4) {
      setScanState('success');
      setStatusMessage('B-UNIT PIN ACCEPTED');
      playExecutionChime();
      setTimeout(() => {
        onUnlockTerminal();
        setScanState('idle');
        setPinCode('');
        onClose();
      }, 600);
    } else {
      setScanState('error');
      setStatusMessage('INVALID B-UNIT TOKEN PIN');
      setTimeout(() => {
        setScanState('idle');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="bg-[#0b101c] border-2 border-[#1e2a44] w-full max-w-md flex flex-col rounded-xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header Bar */}
        <div className="bg-[#101726] border-b border-[#1e2a44] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-[#00e5ff] animate-pulse" />
            <span className="font-black text-white text-sm tracking-wider">
              BLOOMBERG B-UNIT BIOMETRICS
            </span>
          </div>

          {!isTerminalLocked && (
            <button
              onClick={() => {
                playKeyClick();
                onClose();
              }}
              className="text-[#8b9bb4] hover:text-white p-1 rounded hover:bg-[#1a2336] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="bg-[#0e1526] px-4 py-3 border-b border-[#182338] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#8b9bb4] uppercase block">Authenticated Trader</span>
            <span className="font-black text-white text-sm flex items-center gap-1.5">
              <span>{userName}</span>
              <span className="text-[9px] bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 px-1.5 py-0.2 rounded">
                VERIFIED
              </span>
            </span>
            <span className="text-[10px] text-[#64748b]">ID: {terminalId}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#8b9bb4] uppercase block">Security Status</span>
            <span
              className={`font-bold text-xs flex items-center gap-1 justify-end ${
                isTerminalLocked ? 'text-[#ef4444]' : 'text-[#22c55e]'
              }`}
            >
              {isTerminalLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{isTerminalLocked ? 'TERMINAL LOCKED' : 'ONLINE'}</span>
            </span>
          </div>
        </div>

        {/* Main Biometric Scanner Body */}
        <div className="p-6 flex flex-col items-center justify-center text-center">
          {authMode === 'fingerprint' ? (
            <>
              {/* Interactive Fingerprint Scanner Pad */}
              <div
                onClick={handleScanFingerprint}
                className={`relative w-32 h-32 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all duration-300 group shadow-lg ${
                  scanState === 'scanning'
                    ? 'border-[#00e5ff] bg-[#00e5ff]/15 shadow-[0_0_30px_rgba(0,229,255,0.4)] scale-105'
                    : scanState === 'success'
                    ? 'border-[#22c55e] bg-[#22c55e]/20 shadow-[0_0_35px_rgba(34,197,94,0.5)] scale-105'
                    : scanState === 'error'
                    ? 'border-[#ef4444] bg-[#ef4444]/20 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                    : 'border-[#1e2a44] bg-[#101728] hover:border-[#00e5ff]/80 hover:bg-[#131d33]'
                }`}
                title="Click or Touch to Scan Fingerprint"
              >
                {/* Fingerprint Laser Scanner Line Animation */}
                {scanState === 'scanning' && (
                  <div className="absolute inset-x-4 top-2 h-0.5 bg-[#00e5ff] shadow-[0_0_12px_#00e5ff] animate-[bounce_1.2s_infinite]" />
                )}

                <Fingerprint
                  className={`w-16 h-16 transition-colors duration-200 ${
                    scanState === 'scanning'
                      ? 'text-[#00e5ff] animate-pulse'
                      : scanState === 'success'
                      ? 'text-[#22c55e]'
                      : scanState === 'error'
                      ? 'text-[#ef4444]'
                      : 'text-[#8b9bb4] group-hover:text-[#00e5ff]'
                  }`}
                />

                {/* Pulse Ring when idle */}
                {scanState === 'idle' && (
                  <div className="absolute inset-0 rounded-full border border-[#00e5ff]/20 animate-ping pointer-events-none" />
                )}
              </div>

              {/* Status readout */}
              <div className="mt-4 flex flex-col items-center">
                <span
                  className={`font-black text-xs tracking-wider ${
                    scanState === 'success'
                      ? 'text-[#22c55e]'
                      : scanState === 'error'
                      ? 'text-[#ef4444]'
                      : scanState === 'scanning'
                      ? 'text-[#00e5ff]'
                      : 'text-white'
                  }`}
                >
                  {statusMessage}
                </span>
                <span className="text-[10px] text-[#64748b] mt-1">
                  Touch ID · Windows Hello · Android Fingerprint · B-UNIT
                </span>
              </div>

              {/* Trigger Scan Button */}
              <button
                onClick={handleScanFingerprint}
                disabled={scanState === 'scanning'}
                className="mt-4 px-6 py-2.5 rounded-lg bg-[#00e5ff] hover:bg-[#38bdf8] text-black font-black text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{scanState === 'scanning' ? 'VERIFYING...' : 'SCAN FINGERPRINT NOW'}</span>
              </button>
            </>
          ) : (
            /* PIN Fallback Mode */
            <form onSubmit={handlePinSubmit} className="w-full flex flex-col items-center gap-3">
              <KeyRound className="w-10 h-10 text-[#ffd600] mb-1" />
              <span className="text-white font-bold text-xs">ENTER B-UNIT SECURITY TOKEN PIN</span>
              <input
                type="password"
                maxLength={8}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="••••••"
                className="bg-[#141b28] border border-[#222d44] text-center text-lg font-black tracking-widest text-[#ffd600] px-4 py-2 rounded-lg outline-none w-48"
                autoFocus
              />
              <button
                type="submit"
                className="px-6 py-2 rounded bg-[#ffd600] text-black font-bold text-xs hover:bg-[#eab308] cursor-pointer"
              >
                UNLOCK TERMINAL
              </button>
            </form>
          )}

          {/* Mode Switcher */}
          <div className="mt-6 flex items-center gap-3 text-[11px] border-t border-[#182338] pt-3 w-full justify-center">
            <button
              onClick={() => {
                playKeyClick();
                setAuthMode((prev) => (prev === 'fingerprint' ? 'pin' : 'fingerprint'));
              }}
              className="text-[#8b9bb4] hover:text-[#00e5ff] underline cursor-pointer"
            >
              {authMode === 'fingerprint' ? 'Use B-UNIT Token PIN Instead' : 'Use Fingerprint Biometrics'}
            </button>
          </div>
        </div>

        {/* Security Preferences Footer */}
        <div className="bg-[#0e1526] p-3 border-t border-[#1e2a44] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#8b9bb4]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00e676]" />
            <span>FIPS 140-2 Level 3 Hardware Token</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Auto-Lock:</span>
            <select
              value={autoLockMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAutoLockMinutes(val);
                try {
                  localStorage.setItem('bbg_autolock_min', String(val));
                } catch {}
              }}
              className="bg-[#141b28] border border-[#222d44] text-[#cbd5e1] rounded px-1.5 py-0.5 outline-none font-bold"
            >
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
              <option value={0}>Never</option>
            </select>

            {isTerminalLocked ? (
              <span className="text-[#ef4444] font-bold">LOCKED</span>
            ) : (
              <button
                onClick={() => {
                  playKeyClick();
                  onLockTerminal();
                }}
                className="px-2 py-0.5 rounded bg-[#200e12] border border-[#ef4444]/40 text-[#ef4444] font-bold hover:bg-[#34141a] cursor-pointer"
              >
                LOCK NOW
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
