import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '../Dashboard';

vi.mock('../../api', () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'p1',
        name: 'Test Project',
        description: 'A test project',
        created_at: '2026-03-06T10:00:00Z',
        updated_at: '2026-03-06T11:00:00Z',
      },
    ]),
  },
  tasksApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 't1',
        name: 'Test Task',
        type: 'task',
        description: 'A test task',
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        computer_use: false,
        samples: [],
        input_schema: [],
        output_schema: [],
        created_at: '2026-03-06T10:00:00Z',
        updated_at: '2026-03-06T11:00:00Z',
      },
    ]),
  },
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Dashboard', () => {
  it('renders the page heading', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders New Project and New Task buttons', () => {
    renderDashboard();
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  it('renders section headings', () => {
    renderDashboard();
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByText('Recent Tasks')).toBeInTheDocument();
  });

  it('renders project and task data after loading', async () => {
    renderDashboard();
    expect(await screen.findByText('Test Project')).toBeInTheDocument();
    expect(await screen.findByText('Test Task')).toBeInTheDocument();
  });
});
