import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Select } from '../ui/Select';
import { Toggle } from '../ui/Toggle';
import { SchemaEditor } from './SchemaEditor';
import { useCreateAgent, useUpdateAgent } from '../../hooks/useAgents';
import type { Agent, SchemaField } from '../../types';

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

interface AgentFormProps {
  agent?: Agent;
}

export function AgentForm({ agent }: AgentFormProps) {
  const navigate = useNavigate();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();

  const [name, setName] = useState(agent?.name ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [steps, setSteps] = useState<string[]>(agent?.steps ?? []);
  const [stepInput, setStepInput] = useState('');
  const [provider, setProvider] = useState(agent?.provider ?? 'claude_code');
  const [model, setModel] = useState(agent?.model ?? 'claude-sonnet-4-6');
  const [computerUse, setComputerUse] = useState(agent?.computer_use ?? false);
  const [inputSchema, setInputSchema] = useState<SchemaField[]>(agent?.input_schema ?? []);
  const [outputSchema, setOutputSchema] = useState<SchemaField[]>(agent?.output_schema ?? []);

  const isEditing = !!agent;
  const isBusy = agent?.status === 'creating' || agent?.status === 'updating';
  const isPending = createAgent.isPending || updateAgent.isPending;

  const addStep = () => {
    const trimmed = stepInput.trim();
    if (trimmed && !steps.includes(trimmed)) {
      setSteps([...steps, trimmed]);
      setStepInput('');
    }
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addStep();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await updateAgent.mutateAsync({
        id: agent.id,
        body: {
          name, description, steps, provider, model,
          computer_use: computerUse,
          input_schema: inputSchema,
          output_schema: outputSchema,
        },
      });
      navigate(`/agents/${agent.id}`);
    } else {
      await createAgent.mutateAsync({
        name, description, steps, provider, model,
        computer_use: computerUse,
      });
      navigate('/agents');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Input
        label="Agent Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. research-agent"
        required
        maxLength={200}
      />

      <TextArea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what this agent should do in plain language."
        rows={4}
        maxLength={10000}
        disabled={isBusy}
      />

      {/* Steps Editor */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">Steps</label>
        <div className="flex flex-wrap gap-2 min-h-[36px]">
          {steps.map((step, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm"
            >
              {step}
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-accent/60 hover:text-accent ml-0.5"
                disabled={isBusy}
              >
                x
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={stepInput}
            onChange={(e) => setStepInput(e.target.value)}
            onKeyDown={handleStepKeyDown}
            placeholder="Add a step and press Enter"
            className="flex-1 px-3 py-2 bg-bg-input border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            disabled={isBusy}
          />
          <Button type="button" variant="secondary" size="sm" onClick={addStep} disabled={!stepInput.trim() || isBusy}>
            + Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Select
          label="Provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            const models = modelOptions[e.target.value];
            if (models?.length) setModel(models[0].value);
          }}
          options={providerOptions}
        />
        <Select
          label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          options={modelOptions[provider] ?? []}
        />
      </div>

      <Toggle label="Computer Use" checked={computerUse} onChange={setComputerUse} disabled={isBusy} />

      {/* Schema editors only shown when editing an existing agent (schemas are auto-generated by forge) */}
      {isEditing && (
        <>
          <SchemaEditor label="Input Schema" fields={inputSchema} onChange={setInputSchema} />
          <SchemaEditor label="Output Schema" fields={outputSchema} onChange={setOutputSchema} />
        </>
      )}

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={!name.trim() || isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Agent'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
