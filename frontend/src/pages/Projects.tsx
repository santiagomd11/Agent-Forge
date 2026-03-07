import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { projectsApi } from '../api';
import { Button, Card } from '../components/ui';
import { useTimeAgo } from '../hooks/useTimeAgo';
import type { Project } from '../types';

function ProjectRow({ project }: { project: Project }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timeAgo = useTimeAgo(project.updated_at);

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(project.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <Card className="flex items-center justify-between">
      <div
        className="flex-1 cursor-pointer"
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <h3 className="font-semibold text-sm mb-1">{project.name}</h3>
        <p className="text-sm text-text-secondary line-clamp-1">
          {project.description || 'No description'}
        </p>
        <span className="text-xs text-text-muted mt-2 inline-block">Updated {timeAgo}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Delete this project?')) deleteMutation.mutate();
        }}
      >
        <Trash2 size={14} className="text-error" />
      </Button>
    </Card>
  );
}

export function Projects() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus size={16} />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Loading...</p>
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-muted mb-4">No projects yet. Create one to get started.</p>
          <Button onClick={() => navigate('/projects/new')}>Create Project</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
