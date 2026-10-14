import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Bell,
  Play,
  RotateCcw,
  Zap,
  Radio,
  TrendingUp,
  AlertTriangle,
  Sliders,
  Check,
  Music,
  Activity,
  Flame,
} from 'lucide-react';
import {
  ChimeId,
  MarketTriggerType,
  SoundSettings,
  AVAILABLE_CHIMES,
  DEFAULT_SOUND_SETTINGS,
  loadSoundSettings,
  saveSoundSettings,
  subscribeSoundSettings,
  getChimeMetadata,
} from '../services/soundSettingsService';
import {
  previewChimeSound,
  playMarketTriggerAlert,
  playKeyClick,
} from '../utils/terminalSound';

interface SoundSelectorSettingsProps {
  onTriggerAlertSimulated?: (message: string) => void;
}

export const SoundSelectorSettings: React.FC<SoundSelectorSettingsProps> = ({
  onTriggerAlertSimulated,
}) => {
  const [settings, setSettings] = useState<SoundSettings>(loadSoundSettings);
  const [playingChime, setPlayingChime] = useState<ChimeId | null>(null);
  const [activeSimAlert, setActiveSimAlert] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSoundSettings((updated) => {
      setSettings({ ...updated });
    });
    return unsubscribe;
  }, []);

  const handleUpdate = (updated: SoundSettings) => {
    setSettings(updated);
    saveSoundSettings(updated);
  };

  const handleToggleMaster = () => {
    playKeyClick();
    const next = !settings.masterEnabled;
    handleUpdate({ ...settings, masterEnabled: next });
  };

  const handleMasterVolumeChange = (newVol: number) => {
    handleUpdate({ ...settings, masterVolume: newVol });
  };

  const handleTriggerChimeChange = (trigger: MarketTriggerType, chime: ChimeId) => {
    playKeyClick();
    const updatedTriggers = {
      ...settings.triggers,
      [trigger]: {
        ...settings.triggers[trigger],
        chime,
      },
    };
    handleUpdate({ ...settings, triggers: updatedTriggers });
    // Audition sound
    playTestChime(chime, settings.triggers[trigger].volume);
  };

  const handleTriggerToggle = (trigger: MarketTriggerType) => {
    playKeyClick();
    const currentTrigger = settings.triggers[trigger];
    const updatedTriggers = {
      ...settings.triggers,
      [trigger]: {
        ...currentTrigger,
        enabled: !currentTrigger.enabled,
      },
    };
    handleUpdate({ ...settings, triggers: updatedTriggers });
  };

  const handleTriggerVolumeChange = (trigger: MarketTriggerType, vol: number) => {
    const updatedTriggers = {
      ...settings.triggers,
      [trigger]: {
        ...settings.triggers[trigger],
        volume: vol,
      },
    };
    handleUpdate({ ...settings, triggers: updatedTriggers });
  };

  const playTestChime = (chimeId: ChimeId, volume: number = 0.85) => {
    setPlayingChime(chimeId);
    previewChimeSound(chimeId, volume * settings.masterVolume);
    setTimeout(() => {
      setPlayingChime((prev) => (prev === chimeId ? null : prev));
    }, 600);
  };

  const handleSimulateTrigger = (trigger: MarketTriggerType) => {
    playMarketTriggerAlert(trigger);
    const triggerLabel = settings.triggers[trigger].label;
    const chimeName = getChimeMetadata(settings.triggers[trigger].chime).name;
    const msg = `ALERT TRIGGERED: ${triggerLabel} → Chime: "${chimeName}"`;
    setActiveSimAlert(msg);
    if (onTriggerAlertSimulated) {
      onTriggerAlertSimulated(msg);
    }
    setTimeout(() => {
      setActiveSimAlert(null);
    }, 3500);
  };

  const handleResetDefaults = () => {
    playKeyClick();
    handleUpdate(DEFAULT_SOUND_SETTINGS);
    playTestChime('bloomberg_triad', 0.9);
  };

  const triggerIcons: Record<MarketTriggerType, React.ReactNode> = {
    execution: <Zap className="w-3.5 h-3.5 text-[#00e676]" />,
    flow: <Radio className="w-3.5 h-3.5 text-[#00d2ff]" />,
    volatility: <TrendingUp className="w-3.5 h-3.5 text-[#ffd600]" />,
    risk: <AlertTriangle className="w-3.5 h-3.5 text-[#ff334b]" />,
    market_bell: <Bell className="w-3.5 h-3.5 text-[#ff9900]" />,
  };

  const triggerColors: Record<MarketTriggerType, { bg: string; border: string; text: string }> = {
    execution: { bg: 'bg-[#00e676]/10', border: 'border-[#00e676]/30', text: 'text-[#00e676]' },
    flow: { bg: 'bg-[#00d2ff]/10', border: 'border-[#00d2ff]/30', text: 'text-[#00d2ff]' },
    volatility: { bg: 'bg-[#ffd600]/10', border: 'border-[#ffd600]/30', text: 'text-[#ffd600]' },
    risk: { bg: 'bg-[#ff334b]/10', border: 'border-[#ff334b]/30', text: 'text-[#ff334b]' },
    market_bell: { bg: 'bg-[#ff9900]/10', border: 'border-[#ff9900]/30', text: 'text-[#ff9900]' },
  };

  const triggerKeys: MarketTriggerType[] = ['execution', 'flow', 'volatility', 'risk', 'market_bell'];

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* Simulation Banner Feedback */}
      {activeSimAlert && (
        <div className="bg-[#00d2ff]/15 border border-[#00d2ff] text-white px-3 py-2 rounded flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150 shadow-lg">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-ping" />
            <span className="font-bold text-[#00d2ff]">TEST TRIGGER EMITTED:</span>
            <span>{activeSimAlert}</span>
          </div>
          <span className="text-[10px] text-[#8b9bb4] uppercase tracking-wider font-mono">
            AUDIO ACTIVE
          </span>
        </div>
      )}

      {/* Master Audio Controller Card */}
      <div className="bg-[#0e1628] border border-[#1e2a44] rounded p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleMaster}
            className={`w-10 h-10 rounded flex items-center justify-center transition-all cursor-pointer border ${
              settings.masterEnabled
                ? 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/50 shadow-[0_0_12px_rgba(0,230,118,0.25)]'
                : 'bg-[#ff334b]/15 text-[#ff334b] border-[#ff334b]/50'
            }`}
            title={settings.masterEnabled ? 'Click to Mute Terminal Audio' : 'Click to Enable Audio'}
          >
            {settings.masterEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                TERMINAL AUDIO ENGINE
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black border ${
                  settings.masterEnabled
                    ? 'bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40'
                    : 'bg-[#ff334b]/20 text-[#ff334b] border-[#ff334b]/40'
                }`}
              >
                {settings.masterEnabled ? 'LIVE • SYNTHESIZER ON' : 'MUTED'}
              </span>
            </div>
            <div className="text-[10.5px] text-[#8b9bb4] mt-0.5">
              High-fidelity synthesized acoustics for order executions, volatility alerts &amp; institutional flows
            </div>
          </div>
        </div>

        {/* Master Volume Slider */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto bg-[#080d18] px-3 py-2 rounded border border-[#1b263c]">
          <span className="text-[10px] font-mono text-[#8b9bb4] uppercase tracking-wider font-bold">
            MASTER VOL
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.masterVolume}
            onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
            className="w-28 sm:w-32 accent-[#00d2ff] cursor-pointer"
            disabled={!settings.masterEnabled}
          />
          <span className="font-mono text-[#00d2ff] font-bold text-[11px] w-10 text-right">
            {Math.round(settings.masterVolume * 100)}%
          </span>
        </div>
      </div>

      {/* Section Header: Market Trigger Chime Customizer */}
      <div className="flex items-center justify-between border-b border-[#1e2a44] pb-1.5 pt-1">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#ffd600]" />
          <span className="font-bold text-white text-xs uppercase tracking-wider">
            MARKET TRIGGER ALERT AUDIO CHIMES
          </span>
        </div>
        <span className="text-[10px] text-[#8b9bb4]">
          Choose distinct acoustic signatures for each market event
        </span>
      </div>

      {/* List of Market Trigger Audio Chime Selectors */}
      <div className="flex flex-col gap-2.5">
        {triggerKeys.map((triggerKey) => {
          const config = settings.triggers[triggerKey];
          const colors = triggerColors[triggerKey];
          const chimeMeta = getChimeMetadata(config.chime);

          return (
            <div
              key={triggerKey}
              className={`bg-[#0a0f1d] border ${
                config.enabled ? 'border-[#1e2a44] hover:border-[#2a3c60]' : 'border-[#161f30] opacity-60'
              } rounded p-3 transition-all flex flex-col gap-2.5`}
            >
              {/* Trigger Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerToggle(triggerKey)}
                    className={`w-6 h-6 rounded flex items-center justify-center border transition-all cursor-pointer ${
                      config.enabled
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-[#141b28] text-slate-500 border-slate-700'
                    }`}
                    title={config.enabled ? 'Disable sound for this trigger' : 'Enable sound for this trigger'}
                  >
                    {config.enabled ? <Check className="w-3.5 h-3.5" /> : null}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {triggerIcons[triggerKey]}
                    <span className="font-bold text-white text-[12px]">{config.label}</span>
                  </div>
                </div>

                {/* Quick Simulation & Volume Bar */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="flex items-center gap-1.5 bg-[#0e1628] px-2 py-1 rounded border border-[#1e2a44]">
                    <span className="text-[9px] text-[#8b9bb4] font-mono">VOL:</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={config.volume}
                      onChange={(e) => handleTriggerVolumeChange(triggerKey, parseFloat(e.target.value))}
                      className="w-16 sm:w-20 accent-[#ffd600] cursor-pointer"
                      disabled={!config.enabled || !settings.masterEnabled}
                    />
                    <span className="font-mono text-[10px] text-[#ffd600] w-7 text-right">
                      {Math.round(config.volume * 100)}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSimulateTrigger(triggerKey)}
                    disabled={!config.enabled || !settings.masterEnabled}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#1a253c] hover:bg-[#253658] disabled:opacity-40 text-slate-200 hover:text-white border border-[#2b3d60] rounded text-[10px] font-bold font-mono transition-colors cursor-pointer"
                    title="Simulate this market trigger event and sound"
                  >
                    <Play className="w-2.5 h-2.5 text-[#00d2ff]" />
                    <span>SIMULATE</span>
                  </button>
                </div>
              </div>

              {/* Trigger Sub-Description */}
              <div className="text-[10px] text-[#8b9bb4] pl-8">
                {config.triggerDescription}
              </div>

              {/* Chime Picker Row */}
              <div className="pl-8 pt-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-[10px] font-mono text-[#8b9bb4] uppercase tracking-wider shrink-0">
                  ASSIGNED CHIME:
                </span>

                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
                  {AVAILABLE_CHIMES.map((chime) => {
                    const isSelected = config.chime === chime.id;
                    const isPlaying = playingChime === chime.id;

                    return (
                      <button
                        key={chime.id}
                        type="button"
                        onClick={() => handleTriggerChimeChange(triggerKey, chime.id)}
                        className={`px-2 py-1.5 rounded text-left flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00d2ff]/15 border-[#00d2ff] text-white shadow-[0_0_8px_rgba(0,210,255,0.2)]'
                            : 'bg-[#0f172a] hover:bg-[#162238] border-[#1e2a44] text-[#8b9bb4] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex flex-col overflow-hidden pr-1">
                          <span className={`text-[10.5px] font-bold truncate ${isSelected ? 'text-[#00d2ff]' : ''}`}>
                            {chime.name}
                          </span>
                          <span className="text-[8.5px] font-mono text-[#64748b] truncate">
                            {chime.frequencies}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse" />
                            <Check className="w-3 h-3 text-[#00d2ff]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Soundboard Gallery */}
      <div className="bg-[#080d18] border border-[#1e2a44] rounded p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between border-b border-[#1b263b] pb-1.5">
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-[#00d2ff]" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              AUDIO CHIME REPERTOIRE &amp; SOUNDBOARD AUDITION
            </span>
          </div>
          <span className="text-[10px] text-[#8b9bb4]">
            Test individual synthesizers &amp; frequency curves
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {AVAILABLE_CHIMES.map((chime) => {
            const isPlaying = playingChime === chime.id;
            return (
              <div
                key={chime.id}
                className={`bg-[#0d1424] border ${
                  isPlaying ? 'border-[#00d2ff] shadow-[0_0_12px_rgba(0,210,255,0.25)]' : 'border-[#1a253c]'
                } rounded p-2.5 flex flex-col justify-between gap-2 transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-white text-[11px] truncate">
                      {chime.name}
                    </span>
                    <span className="px-1 py-0.2 rounded bg-[#1e2a44] text-[#8b9bb4] text-[8px] font-mono shrink-0">
                      {chime.category.split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-[9.5px] text-[#8b9bb4] line-clamp-2 leading-relaxed">
                    {chime.description}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#162034] mt-1">
                  <span className="text-[9px] font-mono text-[#00d2ff]">
                    {chime.frequencies}
                  </span>

                  <button
                    type="button"
                    onClick={() => playTestChime(chime.id, 0.9)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-[#00d2ff] text-black font-black'
                        : 'bg-[#152035] hover:bg-[#00d2ff]/20 text-[#00d2ff] border border-[#00d2ff]/30'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>{isPlaying ? 'PLAYING...' : 'PREVIEW'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset Defaults Action Strip */}
      <div className="flex items-center justify-between bg-[#0e1628] border border-[#1e2a44] rounded px-3 py-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#00e676]" />
          <span className="text-[10px] text-[#8b9bb4]">
            Chimes are synthesized locally via Web Audio API. Preferences persist across terminal restarts.
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141b28] hover:bg-[#ff334b]/20 text-[#8b9bb4] hover:text-[#ff334b] border border-[#222d44] hover:border-[#ff334b]/40 rounded text-[10.5px] font-bold transition-all cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET CHIMES</span>
        </button>
      </div>
    </div>
  );
};
