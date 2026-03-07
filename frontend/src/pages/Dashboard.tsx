import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, ListTodo, FileText, Zap, CheckCircle } from 'lucide-react';
import { tasksApi, projectsApi } from '../api';
import { Button, Card, Badge } from '../components/ui';
import { useTimeAgo } from '../hooks/useTimeAgo';
import type { Task, Project } from '../types';

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const timeAgo = useTimeAgo(project.updated_at);

  return (
    <Card
      className="cursor-pointer hover:border-border-hover transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] group relative overflow-hidden"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      <h3 className="font-semibold text-text-primary mb-1.5 group-hover:text-accent transition-colors">{project.name}</h3>
      <p className="text-sm text-text-secondary mb-3 line-clamp-2 leading-relaxed">
        {project.description || 'No description'}
      </p>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
        <span className="text-xs text-text-muted">Updated {timeAgo}</span>
      </div>
    </Card>
  );
}

const typeIcon = {
  task: { icon: FileText, color: 'text-info' },
  workflow: { icon: Zap, color: 'text-success' },
  approval: { icon: CheckCircle, color: 'text-warning' },
};

function TaskCard({ task }: { task: Task }) {
  const navigate = useNavigate();
  const timeAgo = useTimeAgo(task.updated_at);

  const typeConfig = typeIcon[task.type] || typeIcon.task;
  const Icon = typeConfig.icon;

  const typeVariant = {
    task: 'info' as const,
    workflow: 'success' as const,
    approval: 'warning' as const,
  };

  const typeBg = {
    task: 'bg-info/10',
    workflow: 'bg-success/10',
    approval: 'bg-warning/10',
  };

  return (
    <Card
      className="cursor-pointer hover:border-border-hover transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${typeBg[task.type]}`}>
            <Icon size={14} className={typeConfig.color} />
          </div>
          <h3 className="font-semibold text-text-primary text-sm">{task.name}</h3>
        </div>
        <Badge variant={typeVariant[task.type]}>{task.type}</Badge>
      </div>
      <p className="text-sm text-text-secondary mb-3 line-clamp-1 leading-relaxed">
        {task.description || 'No description'}
      </p>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
        <span className="text-xs text-text-muted">Updated {timeAgo}</span>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/projects/new')}>
            <Plus size={16} />
            New Project
          </Button>
          <Button onClick={() => navigate('/tasks/new')}>
            <Plus size={16} />
            New Task
          </Button>
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <FolderKanban size={18} className="text-text-muted" />
          <h2 className="text-lg font-semibold">Recent Projects</h2>
        </div>
        {projects.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-text-muted mb-3">No projects yet</p>
            <Button size="sm" onClick={() => navigate('/projects/new')}>
              Create your first project
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <ListTodo size={18} className="text-text-muted" />
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
        </div>
        {tasks.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-text-muted mb-3">No tasks yet</p>
            <Button size="sm" onClick={() => navigate('/tasks/new')}>
              Create your first task
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.slice(0, 6).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
