import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toHaveClass('bg-bg-tertiary');
  });

  it('applies success variant', () => {
    render(<Badge variant="success">Done</Badge>);
    expect(screen.getByText('Done')).toHaveClass('text-success');
  });

  it('applies error variant', () => {
    render(<Badge variant="error">Failed</Badge>);
    expect(screen.getByText('Failed')).toHaveClass('text-error');
  });

  it('applies info variant', () => {
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info')).toHaveClass('text-info');
  });

  it('applies warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toHaveClass('text-warning');
  });
});
