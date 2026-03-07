import { api } from './client';
import type { Project, ProjectCreate, ProjectNode, ProjectEdge } from '../types';

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: ProjectCreate) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<ProjectCreate>) =>
    api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete<void>(`/projects/${id}`),

  // Nodes
  getNodes: (projectId: string) =>
    api.get<ProjectNode[]>(`/projects/${projectId}/nodes`),
  addNode: (projectId: string, data: { task_id: string; config?: Record<string, unknown>; position_x?: number; position_y?: number }) =>
    api.post<ProjectNode>(`/projects/${projectId}/nodes`, data),
  updateNode: (projectId: string, nodeId: string, data: Partial<{ config: Record<string, unknown>; position_x: number; position_y: number }>) =>
    api.put<ProjectNode>(`/projects/${projectId}/nodes/${nodeId}`, data),
  deleteNode: (projectId: string, nodeId: string) =>
    api.delete<void>(`/projects/${projectId}/nodes/${nodeId}`),

  // Edges
  getEdges: (projectId: string) =>
    api.get<ProjectEdge[]>(`/projects/${projectId}/edges`),
  addEdge: (projectId: string, data: { source_node_id: string; target_node_id: string; source_output: string; target_input: string }) =>
    api.post<ProjectEdge>(`/projects/${projectId}/edges`, data),
  deleteEdge: (projectId: string, edgeId: string) =>
    api.delete<void>(`/projects/${projectId}/edges/${edgeId}`),

  // Run
  run: (projectId: string, inputs: Record<string, unknown> = {}) =>
    api.post<{ run_id: string; status: string }>(`/projects/${projectId}/runs`, { inputs }),
};
