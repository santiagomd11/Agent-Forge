import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tasks } from '../Tasks';

vi.mock('../../api', () => ({
  tasksApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 't1',
        name: 'Email Summarizer',
        type: 'task',
        description: 'Summarizes emails',
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        computer_use: false,
        samples: [],
        input_schema: [],
        output_schema: [],
        created_at: '2026-03-06T10:00:00Z',
        updated_at: '2026-03-06T11:00:00Z',
      },
      {
        id: 't2',
        name: 'Web Browser',
        type: 'task',
        description: 'Browses the web',
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        computer_use: true,
        samples: [],
        input_schema: [],
        output_schema: [],
        created_at: '2026-03-06T10:00:00Z',
        updated_at: '2026-03-06T11:00:00Z',
      },
    ]),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

function renderTasks() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Tasks', () => {
  it('renders the page heading and New Task button', () => {
    renderTasks();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderTasks();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders task list after loading', async () => {
    renderTasks();
    expect(await screen.findByText('Email Summarizer')).toBeInTheDocument();
    expect(await screen.findByText('Web Browser')).toBeInTheDocument();
  });

  it('shows computer use badge for tasks with computer_use enabled', async () => {
    renderTasks();
    expect(await screen.findByText('computer use')).toBeInTheDocument();
  });

  it('displays provider and model info', async () => {
    renderTasks();
    const providerTexts = await screen.findAllByText('anthropic / claude-sonnet-4-6');
    expect(providerTexts.length).toBe(2);
  });
});
