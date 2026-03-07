import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { tasksApi } from '../api';
import { Button, Input, TextArea, Select, Toggle } from '../components/ui';
import type { TaskCreate } from '../types';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
};

const TASK_TYPES = [
  { value: 'task', label: 'Task' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'approval', label: 'Approval' },
];

export function TaskEditor() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(taskId) && taskId !== 'new';

  const [form, setForm] = useState<TaskCreate>({
    name: '',
    description: '',
    type: 'task',
    samples: [],
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    computer_use: false,
  });

  const { data: existingTask } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.get(taskId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingTask) {
      setForm({
        name: existingTask.name,
        description: existingTask.description,
        type: existingTask.type,
        samples: existingTask.samples,
        provider: existingTask.provider,
        model: existingTask.model,
        computer_use: existingTask.computer_use,
        input_schema: existingTask.input_schema,
        output_schema: existingTask.output_schema,
      });
    }
  }, [existingTask]);

  const createMutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.create(data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(`/tasks/${task.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: TaskCreate) => tasksApi.update(taskId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      navigate(`/tasks/${taskId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const update = (field: keyof TaskCreate, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-8 max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-8">
        {isEditing ? 'Edit Task' : 'Create Task'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="name"
          label="Task Name"
          placeholder="e.g. Data Extraction"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />

        <TextArea
          id="description"
          label="Description"
          placeholder="What does this task do?"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
        />

        <Select
          id="type"
          label="Task Type"
          options={TASK_TYPES}
          value={form.type}
          onChange={(e) => update('type', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            id="provider"
            label="Provider"
            options={PROVIDERS}
            value={form.provider}
            onChange={(e) => {
              const provider = e.target.value;
              update('provider', provider);
              update('model', MODELS[provider][0].value);
            }}
          />
          <Select
            id="model"
            label="Model"
            options={MODELS[form.provider || 'anthropic']}
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
          />
        </div>

        <Toggle
          label="Computer Use"
          checked={form.computer_use || false}
          onChange={(checked) => update('computer_use', checked)}
        />

        <div className="border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Samples</h2>
          <TextArea
            id="samples"
            placeholder="Add example prompts, one per line"
            value={(form.samples || []).join('\n')}
            onChange={(e) =>
              update('samples', e.target.value.split('\n').filter(Boolean))
            }
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !form.name}>
            <Save size={16} />
            {isPending ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
