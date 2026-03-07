import { api } from './client';
import type { Task, TaskCreate, TaskUpdate } from '../types';

export const tasksApi = {
  list: () => api.get<Task[]>('/tasks'),
  get: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: TaskCreate) => api.post<Task>('/tasks', data),
  update: (id: string, data: TaskUpdate) => api.put<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete<void>(`/tasks/${id}`),
  run: (id: string, inputs: Record<string, unknown> = {}) =>
    api.post<{ run_id: string; status: string }>(`/tasks/${id}/run`, { inputs }),
  listRuns: (id: string) => api.get<import('../types').Run[]>(`/tasks/${id}/runs`),
};
