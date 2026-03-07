export interface Task {
  id: string;
  name: string;
  description: string;
  type: 'task' | 'workflow' | 'approval';
  samples: string[];
  input_schema: SchemaField[];
  output_schema: SchemaField[];
  computer_use: boolean;
  forge_config: Record<string, unknown>;
  provider: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface SchemaField {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface TaskCreate {
  name: string;
  description?: string;
  type?: 'task' | 'workflow' | 'approval';
  samples?: string[];
  input_schema?: SchemaField[];
  output_schema?: SchemaField[];
  computer_use?: boolean;
  forge_config?: Record<string, unknown>;
  provider?: string;
  model?: string;
}

export interface TaskUpdate extends Partial<TaskCreate> {}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectNode {
  id: string;
  project_id: string;
  task_id: string;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
}

export interface ProjectEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  source_output: string;
  target_input: string;
}

export interface Run {
  id: string;
  project_id: string | null;
  task_id: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}
