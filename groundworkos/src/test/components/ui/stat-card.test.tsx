import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/ui/stat-card';

describe('StatCard', () => {
  it('renders the label', () => {
    render(<StatCard label="Active Jobs" value={5} />);
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
  });

  it('renders a numeric value', () => {
    render(<StatCard label="Count" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a string value', () => {
    render(<StatCard label="Status" value="All Good" />);
    expect(screen.getByText('All Good')).toBeInTheDocument();
  });

  it('formats currency when format="currency"', () => {
    render(<StatCard label="Revenue" value={1500} format="currency" />);
    expect(screen.getByText('£1,500.00')).toBeInTheDocument();
  });

  it('does not format as currency when format="number"', () => {
    render(<StatCard label="Jobs" value={10} format="number" />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders sub text when provided', () => {
    render(<StatCard label="Revenue" value={1000} sub="last 30 days" />);
    expect(screen.getByText('last 30 days')).toBeInTheDocument();
  });

  it('renders change indicator when provided', () => {
    render(<StatCard label="Jobs" value={5} change="+2 this month" changeType="up" />);
    expect(screen.getByText('+2 this month')).toBeInTheDocument();
  });

  it('down changeType renders danger colour on change text', () => {
    const { container } = render(
      <StatCard label="Jobs" value={3} change="-1" changeType="down" />
    );
    const changeEl = container.querySelector('.text-danger');
    expect(changeEl).toBeInTheDocument();
  });

  it('warn changeType renders warning colour on change text', () => {
    const { container } = render(
      <StatCard label="Overdue" value={2} change="2 overdue" changeType="warn" />
    );
    const changeEl = container.querySelector('.text-warning');
    expect(changeEl).toBeInTheDocument();
  });

  it('renders progress bar when barPercent is provided', () => {
    const { container } = render(
      <StatCard label="Progress" value="50%" barPercent={50} />
    );
    const bar = container.querySelector('.bg-yellow');
    expect(bar).toBeInTheDocument();
    expect((bar as HTMLElement).style.width).toBe('50%');
  });

  it('clamps barPercent to 100', () => {
    const { container } = render(
      <StatCard label="Over" value="110%" barPercent={110} />
    );
    const bar = container.querySelector('.bg-yellow');
    expect((bar as HTMLElement).style.width).toBe('100%');
  });

  it('clamps barPercent to 0', () => {
    const { container } = render(
      <StatCard label="Under" value="0%" barPercent={-5} />
    );
    const bar = container.querySelector('.bg-yellow');
    expect((bar as HTMLElement).style.width).toBe('0%');
  });
});
