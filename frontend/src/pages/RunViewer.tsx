import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, Pause, FileText, Zap, CheckCircle } from 'lucide-react';
import { runsApi, projectsApi, tasksApi } from '../api';
import { Card, Badge, Button } from '../components/ui';
import type { Task } from '../types';

const statusConfig = {
  queued: { variant: 'default' as const, icon: Clock, label: 'Queued' },
  running: { variant: 'info' as const, icon: Loader2, label: 'Running' },
  completed: { variant: 'success' as const, icon: CheckCircle2, label: 'Completed' },
  failed: { variant: 'error' as const, icon: XCircle, label: 'Failed' },
  paused: { variant: 'warning' as const, icon: Pause, label: 'Paused for Approval' },
};

const typeIcons = {
  task: FileText,
  workflow: Zap,
  approval: CheckCircle,
};

const typeColors = {
  task: { dot: 'bg-info', text: 'text-info' },
  workflow: { dot: 'bg-success', text: 'text-success' },
  approval: { dot: 'bg-warning', text: 'text-warning' },
};

export function RunViewer() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: run, isLoading } = useQuery({
    queryKey: ['runs', runId],
    queryFn: () => runsApi.get(runId!),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'running' || status === 'queued' ? 2000 : false;
    },
  });

  const { data: projectNodes = [] } = useQuery({
    queryKey: ['projects', run?.project_id, 'nodes'],
    queryFn: () => projectsApi.getNodes(run!.project_id!),
    enabled: Boolean(run?.project_id),
  });

  const { data: projectEdges = [] } = useQuery({
    queryKey: ['projects', run?.project_id, 'edges'],
    queryFn: () => projectsApi.getEdges(run!.project_id!),
    enabled: Boolean(run?.project_id),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
    enabled: Boolean(run?.project_id) && projectNodes.length > 0,
  });

  const taskMap = useMemo(() => {
    const map: Record<string, Task> = {};
    tasks.forEach((t) => (map[t.id] = t));
    return map;
  }, [tasks]);

  // Topologically sort nodes for the pipeline display
  const sortedNodes = useMemo(() => {
    if (projectNodes.length === 0) return [];
    const adj: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    for (const n of projectNodes) {
      adj[n.id] = [];
      inDegree[n.id] = 0;
    }
    for (const e of projectEdges) {
      adj[e.source_node_id]?.push(e.target_node_id);
      if (e.target_node_id in inDegree) inDegree[e.target_node_id]++;
    }
    const queue = Object.keys(inDegree).filter((id) => inDegree[id] === 0);
    const result: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      for (const next of adj[id] || []) {
        inDegree[next]--;
        if (inDegree[next] === 0) queue.push(next);
      }
    }
    return result.map((id) => projectNodes.find((n) => n.id === id)!).filter(Boolean);
  }, [projectNodes, projectEdges]);

  const cancelMutation = useMutation({
    mutationFn: () => runsApi.cancel(runId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['runs', runId] }),
  });

  const approveMutation = useMutation({
    mutationFn: () => runsApi.approve(runId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['runs', runId] }),
  });

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (!run) return <div className="p-8 text-error">Run not found</div>;

  const config = statusConfig[run.status as keyof typeof statusConfig] || statusConfig.queued;
  const StatusIcon = config.icon;
  const isActive = run.status === 'running' || run.status === 'queued';
  const duration = run.started_at
    ? ((run.completed_at ? new Date(run.completed_at).getTime() : Date.now()) - new Date(run.started_at).getTime()) / 1000
    : 0;
  const durationStr = duration > 0
    ? duration < 60 ? `${Math.round(duration)}s` : `${Math.floor(duration / 60)}m ${Math.round(duration % 60)}s`
    : '--';

  return (
    <div className="p-8 max-w-5xl">
      <button
        onClick={() => navigate('/runs')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Runs
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Run Viewer</h1>
          <Badge variant={config.variant}>
            <StatusIcon size={12} className={isActive ? 'animate-spin' : ''} />
            <span className="ml-1">{config.label}</span>
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {run.status === 'paused' && (
            <Button size="sm" onClick={() => approveMutation.mutate()}>
              Approve
            </Button>
          )}
          {isActive && (
            <Button variant="danger" size="sm" onClick={() => cancelMutation.mutate()}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Node Pipeline */}
      {sortedNodes.length > 0 && (
        <Card className="mb-6">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Pipeline</h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {sortedNodes.map((node, i) => {
              const task = taskMap[node.task_id];
              const taskType = (task?.type || 'task') as keyof typeof typeColors;
              const colors = typeColors[taskType];
              const Icon = typeIcons[taskType] || FileText;

              // Derive per-node visual status from overall run status
              let dotClass = 'bg-bg-tertiary'; // pending
              let statusLabel = 'Pending';
              if (run.status === 'completed') {
                dotClass = 'bg-success';
                statusLabel = 'Done';
              } else if (run.status === 'failed') {
                dotClass = i === 0 ? 'bg-error' : 'bg-bg-tertiary';
                statusLabel = i === 0 ? 'Failed' : 'Skipped';
              } else if (run.status === 'running') {
                dotClass = i === 0 ? 'bg-info animate-pulse' : 'bg-bg-tertiary';
                statusLabel = i === 0 ? 'Running' : 'Pending';
              } else if (run.status === 'paused') {
                dotClass = 'bg-warning';
                statusLabel = 'Paused';
              }

              return (
                <div key={node.id} className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg bg-bg-primary border border-border min-w-28">
                    <div className="flex items-center gap-2 w-full">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                      <Icon size={12} className={colors.text} />
                      <span className="text-xs font-medium text-text-primary truncate">
                        {task?.name || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-[10px] text-text-muted">{statusLabel}</span>
                  </div>
                  {i < sortedNodes.length - 1 && (
                    <div className="w-6 h-px bg-border shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Run ID</h3>
          <p className="text-sm font-mono text-text-secondary truncate">{run.id}</p>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Duration</h3>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-text-muted" />
            <p className="text-sm font-mono">{durationStr}</p>
          </div>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Started</h3>
          <p className="text-sm">{run.started_at ? new Date(run.started_at).toLocaleString() : 'Not started'}</p>
        </Card>
      </div>

      {/* Execution Logs */}
      <Card className="mb-6">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Execution Logs</h3>
        <div className="bg-bg-primary rounded-lg border border-border p-4 font-mono text-xs space-y-1.5 max-h-64 overflow-y-auto">
          {run.started_at && (
            <div className="flex gap-3">
              <span className="text-text-muted shrink-0">{new Date(run.started_at).toLocaleTimeString()}</span>
              <span className="text-info">Run started...</span>
            </div>
          )}
          {run.status === 'running' && (
            <div className="flex gap-3">
              <span className="text-text-muted shrink-0">{new Date().toLocaleTimeString()}</span>
              <span className="text-text-secondary">Processing nodes...</span>
            </div>
          )}
          {run.status === 'paused' && (
            <div className="flex gap-3">
              <span className="text-text-muted shrink-0">{new Date().toLocaleTimeString()}</span>
              <span className="text-warning">Waiting for approval...</span>
            </div>
          )}
          {run.status === 'failed' && (
            <div className="flex gap-3">
              <span className="text-text-muted shrink-0">{new Date().toLocaleTimeString()}</span>
              <span className="text-error">Run failed</span>
            </div>
          )}
          {run.status === 'completed' && run.completed_at && (
            <div className="flex gap-3">
              <span className="text-text-muted shrink-0">{new Date(run.completed_at).toLocaleTimeString()}</span>
              <span className="text-success">Run completed successfully</span>
            </div>
          )}
          {Object.keys(run.inputs).length === 0 && Object.keys(run.outputs).length === 0 && run.status === 'queued' && (
            <div className="text-text-muted">Waiting to start...</div>
          )}
        </div>
      </Card>

      {/* Inputs / Outputs */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Inputs</h3>
          {Object.keys(run.inputs).length > 0 ? (
            <pre className="text-xs bg-bg-primary rounded-lg border border-border p-3 overflow-auto max-h-48 font-mono text-text-secondary">
              {JSON.stringify(run.inputs, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-text-muted">No inputs</p>
          )}
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Outputs</h3>
          {Object.keys(run.outputs).length > 0 ? (
            <pre className="text-xs bg-bg-primary rounded-lg border border-border p-3 overflow-auto max-h-48 font-mono text-text-secondary">
              {JSON.stringify(run.outputs, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-text-muted">{isActive ? 'Waiting for results...' : 'No outputs'}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
