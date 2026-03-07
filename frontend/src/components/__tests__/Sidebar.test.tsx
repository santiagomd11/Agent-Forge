import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

function renderSidebar(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('renders the Agent Forge brand', () => {
    renderSidebar();
    expect(screen.getByText('Agent Forge')).toBeInTheDocument();
    expect(screen.getByText('AF')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Runs')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('links point to correct routes', () => {
    renderSidebar();
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Tasks').closest('a')).toHaveAttribute('href', '/tasks');
    expect(screen.getByText('Projects').closest('a')).toHaveAttribute('href', '/projects');
    expect(screen.getByText('Runs').closest('a')).toHaveAttribute('href', '/runs');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');
  });

  it('highlights active route', () => {
    renderSidebar('/tasks');
    const tasksLink = screen.getByText('Tasks').closest('a');
    expect(tasksLink).toHaveClass('bg-accent/12');
  });
});
