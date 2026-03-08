import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';

const STORAGE_KEY = 'agent-forge-settings';

interface AppSettings {
  defaultProvider: string;
  defaultModel: string;
  computerUse: boolean;
  theme: 'dark' | 'light';
  autoRefreshInterval: string;
  maxConcurrentRuns: number;
}

const defaults: AppSettings = {
  defaultProvider: 'claude_code',
  defaultModel: 'claude-sonnet-4-6',
  computerUse: false,
  theme: 'dark',
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

const providerOptions = [
  { value: 'claude_code', label: 'Claude Code' },
  { value: 'anthropic', label: 'Anthropic' },
];

const modelOptions: Record<string, { value: string; label: string }[]> = {
  claude_code: [{ value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' }],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  ],
};

const refreshOptions = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '60 seconds' },
];

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState(false);

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
      // TODO: call DELETE on all agents when endpoint supports bulk delete
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
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-text-primary">Settings</h1>

      {/* Default Provider Configuration */}
      <Card className="p-5 space-y-5">
        <h2 className="text-sm font-medium text-text-primary">Default Provider Configuration</h2>
        <Select
          label="Default Provider"
          value={settings.defaultProvider}
          onChange={(e) => {
            update('defaultProvider', e.target.value);
            const models = modelOptions[e.target.value];
            if (models?.length) update('defaultModel', models[0].value);
          }}
          options={providerOptions}
        />
        <Select
          label="Default Model"
          value={settings.defaultModel}
          onChange={(e) => update('defaultModel', e.target.value)}
          options={modelOptions[settings.defaultProvider] ?? []}
        />
        <Toggle
          label="Computer Use"
          checked={settings.computerUse}
          onChange={(v) => update('computerUse', v)}
        />
        <p className="text-xs text-text-muted">Enable desktop automation for agents by default.</p>
      </Card>

      {/* Application */}
      <Card className="p-5 space-y-5">
        <h2 className="text-sm font-medium text-text-primary">Application</h2>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Theme</label>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              className={`px-4 py-2 text-sm ${settings.theme === 'dark' ? 'bg-accent text-white' : 'bg-bg-primary text-text-secondary'}`}
              onClick={() => update('theme', 'dark')}
            >
              Dark
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm ${settings.theme === 'light' ? 'bg-accent text-white' : 'bg-bg-primary text-text-secondary'}`}
              onClick={() => update('theme', 'light')}
            >
              Light
            </button>
          </div>
        </div>
        <Select
          label="Auto-refresh interval"
          value={settings.autoRefreshInterval}
          onChange={(e) => update('autoRefreshInterval', e.target.value)}
          options={refreshOptions}
        />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Max concurrent runs</label>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.maxConcurrentRuns}
            onChange={(e) => update('maxConcurrentRuns', parseInt(e.target.value) || 1)}
            className="w-24 px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-5 space-y-4 border-danger/30">
        <h2 className="text-sm font-medium text-danger">Danger Zone</h2>
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-text-secondary">Reset all agents</span>
          <Button variant="danger" size="sm" onClick={handleResetAgents}>Reset</Button>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-text-secondary">Clear run history</span>
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
  );
}
