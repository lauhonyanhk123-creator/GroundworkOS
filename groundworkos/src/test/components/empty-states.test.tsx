import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoClients } from '@/components/empty-states/no-clients';
import { NoJobs } from '@/components/empty-states/no-jobs';
import { NoQuotes } from '@/components/empty-states/no-quotes';
import { NoInvoices } from '@/components/empty-states/no-invoices';
import { NoSubcontractors } from '@/components/empty-states/no-subcontractors';
import { NoDocuments } from '@/components/empty-states/no-documents';

describe('NoClients', () => {
  it('renders without crashing', () => {
    const { container } = render(<NoClients />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays descriptive text', () => {
    render(<NoClients />);
    expect(screen.getAllByText(/client/i).length).toBeGreaterThan(0);
  });

  it('renders CTA button when onAddClient is provided', () => {
    render(<NoClients onAddClient={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onAddClient when button is clicked', () => {
    const fn = vi.fn();
    render(<NoClients onAddClient={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not render button when onAddClient is omitted', () => {
    render(<NoClients />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('NoJobs', () => {
  it('renders without crashing', () => {
    render(<NoJobs />);
    expect(screen.getAllByText(/job/i).length).toBeGreaterThan(0);
  });

  it('renders CTA button when onCreateJob is provided', () => {
    render(<NoJobs onCreateJob={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('NoQuotes', () => {
  it('renders without crashing', () => {
    render(<NoQuotes />);
    expect(screen.getAllByText(/quote/i).length).toBeGreaterThan(0);
  });

  it('renders CTA button when onCreateQuote is provided', () => {
    render(<NoQuotes onCreateQuote={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('NoInvoices', () => {
  it('renders without crashing', () => {
    render(<NoInvoices />);
    expect(screen.getAllByText(/invoice/i).length).toBeGreaterThan(0);
  });
});

describe('NoSubcontractors', () => {
  it('renders without crashing', () => {
    render(<NoSubcontractors />);
    expect(screen.getAllByText(/subcontractor/i).length).toBeGreaterThan(0);
  });

  it('renders CTA button when onAddSubcontractor is provided', () => {
    render(<NoSubcontractors onAddSubcontractor={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('NoDocuments', () => {
  it('renders without crashing', () => {
    render(<NoDocuments />);
    expect(screen.getAllByText(/document/i).length).toBeGreaterThan(0);
  });

  it('renders upload button when onUpload is provided', () => {
    render(<NoDocuments onUpload={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
