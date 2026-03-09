import { useParams, useNavigate } from 'react-router-dom';
import { useRun, useCancelRun } from '../hooks/useRuns';
import { useAgent } from '../hooks/useAgents';
import { useRunWebSocket } from '../hooks/useWebSocket';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { RunTimeline } from '../components/runs/RunTimeline';
import { RunLog } from '../components/runs/RunLog';
import { PixelBack, PixelStep, PixelTerminal } from '../components/ui/PixelIcon';

function duration(start: string | null, end: string | null): string {
  if (!start || !end) return '-';
  const s = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function RunViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: run, isLoading } = useRun(id ?? '');
  const { data: agent } = useAgent(run?.agent_id ?? '');
  const cancelRun = useCancelRun();
  const { events } = useRunWebSocket(id);

  if (isLoading) return <div className="text-sm text-text-muted p-10">Loading...</div>;
  if (!run) return <div className="text-sm text-text-muted p-10">Run not found.</div>;

  const isActive = run.status === 'running' || run.status === 'queued';

  const handleCancel = async () => {
    if (id) await cancelRun.mutateAsync(id);
  };

  return (
    <div>
      <div
        onClick={() => navigate('/runs')}
        className="inline-flex items-center gap-1.5 mb-5 cursor-pointer font-body text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <PixelBack size={12} color="var(--color-text-muted)" /> Back to Runs
      </div>

      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="font-heading text-[28px] font-semibold text-text-primary tracking-tight">
              {run.id.slice(0, 8)}
            </h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="font-body text-[13px] text-text-muted font-light">
            Agent: {agent ? (
              <span
                onClick={() => navigate(`/agents/${run.agent_id}`)}
                className="text-accent cursor-pointer font-medium hover:underline"
              >
                {agent.name}
              </span>
            ) : '--'}
          </p>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          ['Provider', agent?.provider ?? '-', true],
          ['Model', agent?.model ?? '-', true],
          ['Started', run.started_at ? new Date(run.started_at).toLocaleString() : '-', false],
          ['Duration', duration(run.started_at, run.completed_at), false],
        ].map(([label, val, mono]) => (
          <Card key={label as string} className="px-5 py-4">
            <p className="font-body text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{label as string}</p>
            <p className={`${mono ? 'font-mono' : 'font-body'} text-[13px] text-text-primary`}>{val as string}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-7">
        {/* Execution Steps */}
        <Card className="px-7 py-6">
          <div className="flex items-center gap-2.5 mb-4">
            <PixelStep size={16} color="var(--color-info)" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Execution Steps</h2>
          </div>
          <RunTimeline events={events} />
        </Card>

        {/* Inputs & Outputs */}
        <Card className="px-7 py-6">
          <div className="flex items-center gap-2.5 mb-4">
            <PixelTerminal size={16} color="var(--color-text-muted)" />
            <h2 className="font-heading text-lg font-semibold text-text-primary">Inputs & Outputs</h2>
          </div>
          <RunLog events={events} outputs={run.outputs} />
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {isActive && (
          <Button variant="danger" onClick={handleCancel} disabled={cancelRun.isPending}>
            Cancel Run
          </Button>
        )}
        <Button variant="secondary" onClick={() => run.agent_id && navigate(`/agents/${run.agent_id}`)}>Re-run</Button>
        {run.status === 'completed' && Object.keys(run.outputs).length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([JSON.stringify(run.outputs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `run-${run.id.slice(0, 8)}-outputs.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download Outputs
          </Button>
        )}
      </div>
    </div>
  );
}
