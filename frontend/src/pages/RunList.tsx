import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRuns } from '../hooks/useRuns';
import { useAgents } from '../hooks/useAgents';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { PixelArrow } from '../components/ui/PixelIcon';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '--';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function duration(start: string | null, end: string | null): string {
  if (!start || !end) return '-';
  const s = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const statusFilters = ['all', 'running', 'queued', 'awaiting_approval', 'completed', 'failed'] as const;

export function RunList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const { data: runs = [], isLoading } = useRuns(filter === 'all' ? undefined : filter);
  const { data: agents = [] } = useAgents();
  const { data: allRuns = [] } = useRuns();

  const counts: Record<string, number> = {
    all: allRuns.length,
    running: allRuns.filter((r) => r.status === 'running').length,
    queued: allRuns.filter((r) => r.status === 'queued').length,
    awaiting_approval: allRuns.filter((r) => r.status === 'awaiting_approval').length,
    completed: allRuns.filter((r) => r.status === 'completed').length,
    failed: allRuns.filter((r) => r.status === 'failed').length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-[28px] font-semibold text-text-primary tracking-tight mb-1">Runs</h1>
        <p className="font-body text-[13px] text-text-muted font-light">{allRuns.length} total runs</p>
      </div>

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] text-xs rounded-lg transition-all cursor-pointer font-body font-medium capitalize ${
              filter === s
                ? 'bg-accent/[0.14] text-accent border border-accent'
                : 'text-text-muted border border-border hover:text-text-secondary hover:bg-hover-bg'
            }`}
          >
            {s.replace(/_/g, ' ')} <span className="opacity-60 text-[11px]">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-text-muted">Loading...</div>
      ) : runs.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[0.7fr_1.5fr_1.2fr_1fr_1fr_0.3fr] px-7 py-3 border-b border-border">
            {['Run ID', 'Agent', 'Status', 'Started', 'Duration', ''].map((h) => (
              <span key={h} className="font-body text-[10px] font-semibold text-text-muted uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {runs.map((run, i) => {
            const agent = agents.find((a) => a.id === run.agent_id);
            return (
              <div
                key={run.id}
                className="grid grid-cols-[0.7fr_1.5fr_1.2fr_1fr_1fr_0.3fr] px-7 py-3.5 items-center cursor-pointer transition-colors hover:bg-hover-bg"
                style={{ background: i % 2 === 1 ? 'var(--color-hover-bg)' : 'transparent' }}
                onClick={() => navigate(`/runs/${run.id}`)}
              >
                <span className="font-mono text-[11px] text-text-muted">{run.id.slice(0, 8)}</span>
                <span className="font-body text-[13px] text-text-primary">{agent?.name ?? '--'}</span>
                <StatusBadge status={run.status} />
                <span className="font-body text-xs text-text-muted font-light">{timeAgo(run.started_at)}</span>
                <span className="font-body text-xs text-text-muted font-light">{duration(run.started_at, run.completed_at)}</span>
                <span className="text-right"><PixelArrow size={12} color="var(--color-text-muted)" /></span>
              </div>
            );
          })}
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-sm text-text-muted font-body">
            {filter === 'all' ? 'No runs yet. Run an agent to get started.' : `No ${filter.replace(/_/g, ' ')} runs.`}
          </p>
        </Card>
      )}
    </div>
  );
}
