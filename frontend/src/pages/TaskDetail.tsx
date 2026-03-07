import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Play, Trash2 } from 'lucide-react';
import { tasksApi } from '../api';
import { Button, Card, Badge } from '../components/ui';
import { useTimeAgo } from '../hooks/useTimeAgo';

export function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.get(taskId!),
  });

  const { data: runs = [] } = useQuery({
    queryKey: ['tasks', taskId, 'runs'],
    queryFn: () => tasksApi.listRuns(taskId!),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate('/tasks');
    },
  });

  const runMutation = useMutation({
    mutationFn: () => tasksApi.run(taskId!),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'runs'] });
      navigate(`/runs/${result.run_id}`);
    },
  });

  const typeVariant = {
    task: 'info' as const,
    workflow: 'success' as const,
    approval: 'warning' as const,
  };

  const statusVariant = {
    queued: 'default' as const,
    running: 'info' as const,
    completed: 'success' as const,
    failed: 'error' as const,
  };

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (!task) return <div className="p-8 text-error">Task not found</div>;

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => navigate('/tasks')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Tasks
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{task.name}</h1>
            <Badge variant={typeVariant[task.type]}>{task.type}</Badge>
            {task.computer_use && <Badge variant="warning">computer use</Badge>}
          </div>
          <p className="text-text-secondary">{task.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => runMutation.mutate()}>
            <Play size={16} />
            Run
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/tasks/${task.id}/edit`)}>
            <Pencil size={16} />
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Delete this task?')) deleteMutation.mutate();
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card>
          <h3 className="text-sm font-semibold text-text-secondary mb-2">Provider</h3>
          <p className="text-sm">{task.provider}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-text-secondary mb-2">Model</h3>
          <p className="text-sm">{task.model}</p>
        </Card>
      </div>

      {task.samples.length > 0 && (
        <Card className="mb-8">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Samples</h3>
          <ul className="space-y-2">
            {task.samples.map((sample, i) => (
              <li key={i} className="text-sm bg-bg-input rounded-lg px-3 py-2">
                {sample}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Runs</h2>
        {runs.length === 0 ? (
          <p className="text-text-muted text-sm">No runs yet</p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} statusVariant={statusVariant} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RunRow({
  run,
  statusVariant,
}: {
  run: import('../types').Run;
  statusVariant: Record<string, 'default' | 'info' | 'success' | 'error'>;
}) {
  const navigate = useNavigate();
  const timeAgo = useTimeAgo(run.started_at || run.completed_at || '');

  return (
    <Card
      className="flex items-center justify-between cursor-pointer hover:border-border-hover"
      onClick={() => navigate(`/runs/${run.id}`)}
    >
      <div className="flex items-center gap-3">
        <Badge variant={statusVariant[run.status]}>{run.status}</Badge>
        <span className="text-sm text-text-muted font-mono">{run.id.slice(0, 8)}</span>
      </div>
      <span className="text-xs text-text-muted">{timeAgo}</span>
    </Card>
  );
}
