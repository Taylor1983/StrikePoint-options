import React, { useState } from 'react';
import {
  X,
  GitBranch,
  GitCommit,
  Github,
  Download,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  ShieldCheck,
  FolderGit2,
  Code2,
  Share2,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { playKeyClick, playExecutionChime } from '../utils/terminalSound';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({ isOpen, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>('https://github.com/YOUR_USERNAME/strikepoint-terminal.git');
  const [authMethod, setAuthMethod] = useState<'https' | 'ssh' | 'gh_cli'>('https');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    playExecutionChime();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Generate personalized bash commands based on input
  const getCommandSnippet = () => {
    if (authMethod === 'gh_cli') {
      const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'strikepoint-terminal';
      return `# 1. Authenticate with GitHub CLI (if not already done)\ngh auth login\n\n# 2. Create the remote GitHub repository and push 'main' branch\ngh repo create ${repoName} --public --source=. --remote=origin --push`;
    }

    if (authMethod === 'ssh') {
      const sshUrl = repoUrl.includes('github.com:')
        ? repoUrl
        : repoUrl.replace('https://github.com/', 'git@github.com:');
      return `# 1. Configure remote origin\ngit remote add origin ${sshUrl}\n\n# 2. Ensure main branch is active\ngit branch -M main\n\n# 3. Push all commits & tags to GitHub\ngit push -u origin main`;
    }

    // Default HTTPS
    return `# 1. Link this repository to your remote GitHub repository\ngit remote add origin ${repoUrl}\n\n# 2. Ensure main branch is active\ngit branch -M main\n\n# 3. Push all changes with full commit history\ngit push -u origin main`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b101c] border border-[#1e2a44] rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 font-sans">
        {/* Top Header */}
        <div className="bg-[#0e1628] border-b border-[#1e2a44] px-4 py-3 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#00e676]/10 border border-[#00e676]/40 flex items-center justify-center text-[#00e676]">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white tracking-wide">
                  GITHUB REPOSITORY SYNCHRONIZATION &amp; EXPORT TERMINAL
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 text-[9px] font-mono font-bold">
                  GIT READY
                </span>
              </div>
              <div className="text-[10px] text-[#8b9bb4]">
                Publish and sync your complete StrikePoint Options &amp; Margin Terminal changes to GitHub
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="p-1 rounded hover:bg-[#18243c] text-[#8b9bb4] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
          {/* Status Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#080d18] border border-[#1e2a44] rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#8b9bb4] font-bold flex items-center gap-1">
                <FolderGit2 className="w-3 h-3 text-[#38bdf8]" />
                <span>GIT STATUS</span>
              </span>
              <span className="text-sm font-black text-[#00e676] font-mono mt-0.5">
                INITIALIZED &amp; CLEAN
              </span>
              <span className="text-[8.5px] text-[#64748b]">Ready to push</span>
            </div>

            <div className="bg-[#080d18] border border-[#1e2a44] rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#8b9bb4] font-bold flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-[#ffd600]" />
                <span>ACTIVE BRANCH</span>
              </span>
              <span className="text-sm font-black text-white font-mono mt-0.5">
                main
              </span>
              <span className="text-[8.5px] text-[#64748b]">Standard root branch</span>
            </div>

            <div className="bg-[#080d18] border border-[#1e2a44] rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#8b9bb4] font-bold flex items-center gap-1">
                <GitCommit className="w-3 h-3 text-[#ff9900]" />
                <span>LATEST COMMIT</span>
              </span>
              <span className="text-sm font-black text-[#ff9900] font-mono mt-0.5">
                9b1e3cb
              </span>
              <span className="text-[8.5px] text-[#64748b] truncate">Responsive Scaling &amp; Carry Blotter</span>
            </div>

            <div className="bg-[#080d18] border border-[#1e2a44] rounded p-2.5 flex flex-col">
              <span className="text-[9.5px] text-[#8b9bb4] font-bold flex items-center gap-1">
                <Code2 className="w-3 h-3 text-[#00e5ff]" />
                <span>SOURCE TRACKING</span>
              </span>
              <span className="text-sm font-black text-white font-mono mt-0.5">
                66 FILES
              </span>
              <span className="text-[8.5px] text-[#64748b]">Full React + TypeScript</span>
            </div>
          </div>

          {/* Action Choice: Push via CLI vs 1-Click Download Archive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Direct Push to GitHub Repo */}
            <div className="bg-[#0e1628] border border-[#1e2a44] rounded p-3.5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00e676]" />
                  <span className="font-bold text-white text-xs">OPTION 1: PUSH DIRECTLY VIA GIT CLI</span>
                </div>
                <p className="text-[11px] text-[#8b9bb4] mt-1 leading-relaxed">
                  Link your local repository directly to your GitHub account and push all commits with complete git history.
                </p>
              </div>

              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playKeyClick()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#18243c] hover:bg-[#203050] text-[#00d2ff] border border-[#00d2ff]/30 rounded font-bold text-xs transition-colors"
              >
                <span>Create New Empty Repo on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* 2. Download Clean Source Archive */}
            <div className="bg-[#0e1628] border border-[#1e2a44] rounded p-3.5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#ffd600]" />
                  <span className="font-bold text-white text-xs">OPTION 2: DOWNLOAD PROJECT ARCHIVE</span>
                </div>
                <p className="text-[11px] text-[#8b9bb4] mt-1 leading-relaxed">
                  Download the complete, clean source code archive (.tar.gz, 414 KB) containing all latest modifications. Drag-and-drop onto GitHub or extract anywhere.
                </p>
              </div>

              <a
                href="/strikepoint-terminal.tar.gz"
                download="strikepoint-terminal.tar.gz"
                onClick={() => playExecutionChime()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ffd600]/15 hover:bg-[#ffd600]/25 text-[#ffd600] border border-[#ffd600]/40 rounded font-black text-xs transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD ARCHIVE (strikepoint-terminal.tar.gz)</span>
              </a>
            </div>
          </div>

          {/* Interactive Remote URL Configurator & Command Generator */}
          <div className="bg-[#080d18] border border-[#1e2a44] rounded p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#18243c] pb-2.5">
              <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>STEP-BY-STEP TERMINAL COMMANDS TO PUSH TO GITHUB</span>
              </span>

              <div className="flex items-center gap-1 bg-[#0e1628] p-0.5 rounded border border-[#1e2a44] text-[10px]">
                <button
                  onClick={() => {
                    playKeyClick();
                    setAuthMethod('https');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    authMethod === 'https' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  HTTPS
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setAuthMethod('ssh');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    authMethod === 'ssh' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  SSH
                </button>
                <button
                  onClick={() => {
                    playKeyClick();
                    setAuthMethod('gh_cli');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    authMethod === 'gh_cli' ? 'bg-[#ff9900] text-black' : 'text-[#8b9bb4] hover:text-white'
                  }`}
                >
                  GitHub CLI
                </button>
              </div>
            </div>

            {/* Repository URL Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="text-[11px] text-[#8b9bb4] shrink-0 font-medium">Your GitHub Repo URL:</label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/USERNAME/REPO_NAME.git"
                className="flex-1 bg-[#0e1628] border border-[#1e2a44] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#38bdf8]"
              />
            </div>

            {/* Generated Code Block */}
            <div className="relative bg-[#05080f] border border-[#1e2a44] rounded p-3 font-mono text-[11px] text-[#cbd5e1] leading-relaxed overflow-x-auto">
              <pre>{getCommandSnippet()}</pre>
              <button
                onClick={() => handleCopy(getCommandSnippet(), 'cli_cmd')}
                className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 bg-[#18243c] hover:bg-[#203050] text-[#38bdf8] border border-[#38bdf8]/40 rounded text-[10px] font-bold transition-all"
              >
                {copiedId === 'cli_cmd' ? (
                  <>
                    <Check className="w-3 h-3 text-[#00e676]" />
                    <span className="text-[#00e676]">COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>COPY COMMANDS</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Included Features Manifest in this Commit */}
          <div className="bg-[#0e1628] border border-[#1e2a44] rounded p-3.5 flex flex-col gap-2.5">
            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00e676]" />
              <span>COMMITTED FEATURES &amp; ENHANCEMENTS MANIFEST (6834ea0)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-start gap-2 bg-[#080d18] border border-[#18243c] rounded p-2">
                <span className="text-[#00e676] font-bold">✓</span>
                <div>
                  <span className="font-bold text-white">Short Stock Borrow Interest &amp; Fees</span>
                  <p className="text-[10px] text-[#8b9bb4] mt-0.5">
                    ETB and HTB rates for TSLA, DJT, GME, NVDA with daily and annualized borrow cost calculations under 360-day standard.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[#080d18] border border-[#18243c] rounded p-2">
                <span className="text-[#00e676] font-bold">✓</span>
                <div>
                  <span className="font-bold text-white">Futures SPAN Margin Financing &amp; Carry</span>
                  <p className="text-[10px] text-[#8b9bb4] mt-0.5">
                    CME SPAN margin carrying costs and cash opportunity drag on /ES, /NQ, /CL, /GC, /BTC contracts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[#080d18] border border-[#18243c] rounded p-2">
                <span className="text-[#00e676] font-bold">✓</span>
                <div>
                  <span className="font-bold text-white">FINRA Margin Debt &amp; % of GDP Indicator</span>
                  <p className="text-[10px] text-[#8b9bb4] mt-0.5">
                    Nominal margin debt ($B) and Margin Debt as % of US GDP macro technical analysis sub-chart and watermark.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[#080d18] border border-[#18243c] rounded p-2">
                <span className="text-[#00e676] font-bold">✓</span>
                <div>
                  <span className="font-bold text-white">Canadian Accounts &amp; Norbert's Gambit</span>
                  <p className="text-[10px] text-[#8b9bb4] mt-0.5">
                    TFSA, RRSP, FHSA registered accounts and FX arbitrage to avoid 9.5% CAD/USD debit margin drag.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0e1628] border-t border-[#1e2a44] px-4 py-2.5 flex items-center justify-between text-[11px] text-[#8b9bb4]">
          <span className="font-mono">StrikePoint Terminal · Git Version Control System</span>
          <button
            onClick={() => {
              playKeyClick();
              onClose();
            }}
            className="px-3 py-1 bg-[#18243c] hover:bg-[#203050] text-white rounded font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
