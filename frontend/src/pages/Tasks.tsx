import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Play } from 'lucide-react';
import { tasksApi } from '../api';
import { Button, Card, Badge } from '../components/ui';
import { useTimeAgo } from '../hooks/useTimeAgo';
import type { Task } from '../types';

function TaskRow({ task }: { task: Task }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timeAgo = useTimeAgo(task.updated_at);

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const typeVariant = {
    task: 'info' as const,
    workflow: 'success' as const,
    approval: 'warning' as const,
  };

  return (
    <Card className="flex items-center justify-between">
      <div
        className="flex-1 cursor-pointer"
        onClick={() => navigate(`/tasks/${task.id}`)}
      >
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold text-sm">{task.name}</h3>
          <Badge variant={typeVariant[task.type]}>{task.type}</Badge>
          {task.computer_use && <Badge variant="warning">computer use</Badge>}
        </div>
        <p className="text-sm text-text-secondary line-clamp-1">
          {task.description || 'No description'}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-text-muted">{task.provider} / {task.model}</span>
          <span className="text-xs text-text-muted">Updated {timeAgo}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/tasks/${task.id}/run`)}>
          <Play size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/tasks/${task.id}/edit`)}>
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this task?')) deleteMutation.mutate();
          }}
        >
          <Trash2 size={14} className="text-error" />
        </Button>
      </div>
    </Card>
  );
}

export function Tasks() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <Button onClick={() => navigate('/tasks/new')}>
          <Plus size={16} />
          New Task
        </Button>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Loading...</p>
      ) : tasks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-muted mb-4">No tasks yet. Create one to get started.</p>
          <Button onClick={() => navigate('/tasks/new')}>Create Task</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
