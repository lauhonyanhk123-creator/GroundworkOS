import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders the status text uppercased', () => {
    render(<Badge status="active" />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('replaces hyphens with spaces in display text', () => {
    render(<Badge status="on-hold" />);
    expect(screen.getByText('ON HOLD')).toBeInTheDocument();
  });

  it('active status gets green variant', () => {
    const { container } = render(<Badge status="active" />);
    expect(container.firstChild).toHaveClass('text-success');
  });

  it('complete status gets green variant', () => {
    const { container } = render(<Badge status="complete" />);
    expect(container.firstChild).toHaveClass('text-success');
  });

  it('paid status gets green variant', () => {
    const { container } = render(<Badge status="paid" />);
    expect(container.firstChild).toHaveClass('text-success');
  });

  it('overdue status gets orange variant', () => {
    const { container } = render(<Badge status="overdue" />);
    expect(container.firstChild).toHaveClass('text-warning');
  });

  it('cancelled status gets red variant', () => {
    const { container } = render(<Badge status="cancelled" />);
    expect(container.firstChild).toHaveClass('text-danger');
  });

  it('expired status gets red variant', () => {
    const { container } = render(<Badge status="expired" />);
    expect(container.firstChild).toHaveClass('text-danger');
  });

  it('draft status gets yellow variant', () => {
    const { container } = render(<Badge status="draft" />);
    expect(container.firstChild).toHaveClass('text-yellow');
  });

  it('sent status gets yellow variant', () => {
    const { container } = render(<Badge status="sent" />);
    expect(container.firstChild).toHaveClass('text-yellow');
  });

  it('unknown status falls back to default variant', () => {
    const { container } = render(<Badge status="unknown-status" />);
    expect(container.firstChild).toHaveClass('bg-surface-2');
  });

  it('accepts explicit variant override', () => {
    const { container } = render(<Badge status="active" variant="red" />);
    expect(container.firstChild).toHaveClass('text-danger');
  });

  it('accepts additional className', () => {
    const { container } = render(<Badge status="active" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
