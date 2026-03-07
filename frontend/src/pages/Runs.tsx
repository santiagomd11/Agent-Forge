import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { runsApi } from '../api';
import { Card, Badge } from '../components/ui';
import { useTimeAgo } from '../hooks/useTimeAgo';
import type { Run } from '../types';

const statusVariant = {
  queued: 'default' as const,
  running: 'info' as const,
  completed: 'success' as const,
  failed: 'error' as const,
  paused: 'warning' as const,
};

function RunRow({ run }: { run: Run }) {
  const navigate = useNavigate();
  const timeAgo = useTimeAgo(run.started_at || run.completed_at || '');

  return (
    <Card
      className="flex items-center justify-between cursor-pointer hover:border-border-hover"
      onClick={() => navigate(`/runs/${run.id}`)}
    >
      <div className="flex items-center gap-4">
        <Badge variant={statusVariant[run.status]}>{run.status}</Badge>
        <span className="text-sm font-mono text-text-muted">{run.id.slice(0, 8)}</span>
        {run.task_id && (
          <span className="text-xs text-text-muted">Task run</span>
        )}
        {run.project_id && (
          <span className="text-xs text-text-muted">Project run</span>
        )}
      </div>
      <span className="text-xs text-text-muted">{timeAgo}</span>
    </Card>
  );
}

export function Runs() {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => runsApi.list(),
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-8">Runs</h1>
      {isLoading ? (
        <p className="text-text-muted">Loading...</p>
      ) : runs.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-muted">No runs yet. Run a task or project to see results here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
