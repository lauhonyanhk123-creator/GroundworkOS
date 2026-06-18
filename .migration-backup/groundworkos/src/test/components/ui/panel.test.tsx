import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from '@/components/ui/panel';

describe('Panel', () => {
  it('renders children', () => {
    render(<Panel>Hello world</Panel>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Panel title="Test Panel">content</Panel>);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
  });

  it('does not render a header when no title or actions', () => {
    const { container } = render(<Panel>content</Panel>);
    expect(container.querySelector('.border-b')).not.toBeInTheDocument();
  });

  it('renders count badge when provided', () => {
    render(<Panel title="Jobs" count={5}>content</Panel>);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(
      <Panel title="Panel" actions={<button>Action</button>}>
        content
      </Panel>
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('applies noPadding — inner div has no p-4', () => {
    const { container } = render(<Panel noPadding>content</Panel>);
    const inner = container.querySelector('div > div > div:last-child');
    expect(inner?.className).not.toContain('p-4');
  });

  it('applies padding by default', () => {
    const { container } = render(<Panel>content</Panel>);
    const inner = container.querySelector('div > div > div:last-child');
    expect(inner?.className).toContain('p-4');
  });

  it('accepts additional className', () => {
    const { container } = render(<Panel className="custom-class">content</Panel>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
