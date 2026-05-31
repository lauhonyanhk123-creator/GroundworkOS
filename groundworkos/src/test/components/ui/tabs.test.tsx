import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

function TabsFixture({ onValueChange = vi.fn(), value = 'overview' } = {}) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="jobs">Jobs</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview content</TabsContent>
      <TabsContent value="jobs">Jobs content</TabsContent>
      <TabsContent value="invoices">Invoices content</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<TabsFixture />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
  });

  it('shows content for the active tab', () => {
    render(<TabsFixture value="overview" />);
    expect(screen.getByText('Overview content')).toBeInTheDocument();
  });

  it('hides content for inactive tabs', () => {
    render(<TabsFixture value="overview" />);
    expect(screen.queryByText('Jobs content')).not.toBeInTheDocument();
    expect(screen.queryByText('Invoices content')).not.toBeInTheDocument();
  });

  it('active tab trigger has yellow background', () => {
    render(<TabsFixture value="overview" />);
    const overviewBtn = screen.getByRole('button', { name: 'Overview' });
    expect(overviewBtn.className).toContain('bg-yellow');
  });

  it('inactive tab trigger does not have yellow background', () => {
    render(<TabsFixture value="overview" />);
    const jobsBtn = screen.getByRole('button', { name: 'Jobs' });
    expect(jobsBtn.className).not.toContain('bg-yellow');
  });

  it('clicking a tab calls onValueChange with correct id', () => {
    const onValueChange = vi.fn();
    render(<TabsFixture onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Jobs' }));
    expect(onValueChange).toHaveBeenCalledWith('jobs');
  });

  it('throws when TabsTrigger used outside Tabs', () => {
    expect(() => {
      render(<TabsTrigger value="test">Test</TabsTrigger>);
    }).toThrow();
  });
});
