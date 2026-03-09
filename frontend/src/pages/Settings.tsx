import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTheme } from '../hooks/useTheme';
import { PixelMoon, PixelSun, PixelGear, PixelClock } from '../components/ui/PixelIcon';

const STORAGE_KEY = 'agent-forge-settings';

interface AppSettings {
  defaultProvider: string;
  defaultModel: string;
  computerUse: boolean;
  autoRefreshInterval: string;
  maxConcurrentRuns: number;
}

const defaults: AppSettings = {
  defaultProvider: 'claude_code',
  defaultModel: 'claude-sonnet-4-6',
  computerUse: false,
  autoRefreshInterval: '5',
  maxConcurrentRuns: 3,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaults;
}

const providerOptions = ['claude_code', 'codex', 'aider'];

export function Settings() {
  const { theme, toggle } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  };

  const handleResetAgents = () => {
    if (confirm('This will delete ALL agents. Are you sure?')) {
      alert('Not implemented yet -- delete agents individually from the Agents page.');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear local run history cache?')) {
      localStorage.removeItem('agent-forge-run-cache');
      alert('Local run cache cleared.');
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-heading text-[28px] font-semibold text-text-primary tracking-tight mb-1">Settings</h1>
        <p className="font-body text-[13px] text-text-muted font-light">Configure your Agent Forge workspace</p>
      </div>

      <div className="flex flex-col gap-5 max-w-[600px]">
        {/* Appearance */}
        <Card className="px-7 py-6">
          <div className="flex items-center gap-2.5 mb-4">
            {theme === 'dark' ? <PixelMoon size={16} color="var(--color-info)" /> : <PixelSun size={16} color="var(--color-warning)" />}
            <h2 className="font-heading text-lg font-semibold text-text-primary">Appearance</h2>
          </div>
          <div className="flex gap-2.5">
            {(['light', 'dark'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { if (m !== theme) toggle(); }}
                className={`flex-1 py-3.5 px-5 rounded-xl border-2 transition-all cursor-pointer font-body text-[13px] font-medium flex items-center justify-center gap-2 capitalize ${
                  theme === m
                    ? 'border-accent bg-accent/[0.14] text-accent'
                    : 'border-border text-text-muted hover:border-border-hover'
                }`}
              >
                {m === 'dark' ? <PixelMoon size={14} color={theme === m ? 'var(--color-accent)' : 'var(--color-text-muted)'} /> : <PixelSun size={14} color={theme === m ? 'var(--color-accent)' : 'var(--color-text-muted)'} />}
                {m} Mode
              </button>
            ))}
          </div>
        </Card>

        {/* Default Provider */}
        <Card className="px-7 py-6">
          <div className="flex items-center gap-2.5 mb-4">
            <PixelGear size={16} color="var(--color-text-muted)" hole="var(--color-bg-secondary)" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Default Provider</h2>
          </div>
          <div className="flex gap-2">
            {providerOptions.map((p) => (
              <button
                key={p}
                onClick={() => update('defaultProvider', p)}
                className={`flex-1 py-3 px-4 rounded-[10px] border-2 transition-all cursor-pointer font-mono text-xs ${
                  settings.defaultProvider === p
                    ? 'border-accent bg-accent/[0.14] text-accent'
                    : 'border-border text-text-muted hover:border-border-hover'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </Card>

        {/* Auto-Refresh */}
        <Card className="px-7 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-1">
                <PixelClock size={16} color="var(--color-text-muted)" />
                <h2 className="font-heading text-lg font-semibold text-text-primary">Auto-Refresh</h2>
              </div>
              <p className="font-body text-xs text-text-muted font-light ml-[26px]">Automatically refresh dashboard data every 30 seconds</p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="w-12 h-[26px] rounded-full border-none cursor-pointer relative transition-colors shrink-0 ml-4"
              style={{ background: autoRefresh ? 'var(--color-success)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-all"
                style={{ left: autoRefresh ? 25 : 3 }}
              />
            </button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="px-7 py-6 border-danger/30">
          <h2 className="font-heading text-lg font-semibold text-danger mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-text-secondary font-body">Reset all agents</span>
            <Button variant="danger" size="sm" onClick={handleResetAgents}>Reset</Button>
          </div>
          <div className="flex items-center justify-between py-2 mt-2">
            <span className="text-sm text-text-secondary font-body">Clear run history</span>
            <Button variant="danger" size="sm" onClick={handleClearHistory}>Clear</Button>
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            {saved ? 'Saved' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
