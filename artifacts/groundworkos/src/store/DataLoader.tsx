import { useEffect } from 'react';
import {
  useGetClients, useGetJobs, useGetQuotes, useGetInvoices,
  useGetSubcontractors, useGetDocuments, useGetSchedule,
  useGetPlant, useGetRateBook,
} from '@workspace/api-client-react';
import { useApp } from './AppContext';
import {
  toClient, toJob, toQuote, toInvoice, toSubcontractor,
  toDocument, toScheduleEntry, toPlant, toTimesheet,
} from '../lib/apiTransforms';
import type { CISReturn } from '../types';

function mapCisReturn(row: Record<string, unknown>, idx: number): CISReturn {
  const period = (row.period as string | null) ?? '';
  const taxMonth = period ? period.slice(0, 7) : '';
  return {
    id: `cis-${idx}-${taxMonth}`,
    tax_month: taxMonth,
    subcontractor_id: '',
    subcontractor_name: (row.company_name as string) ?? '—',
    gross_payment: Number(row.gross_payment ?? 0),
    deduction_rate: Number(row.cis_deduction_rate ?? 0),
    deduction_amount: Number(row.cis_deducted ?? 0),
    net_payment: Number(row.net_payment ?? 0),
    submitted: false,
    submitted_at: null,
  };
}

export function DataLoader() {
  const { dispatch } = useApp();

  const { data: clients } = useGetClients();
  const { data: jobs } = useGetJobs();
  const { data: quotes } = useGetQuotes();
  const { data: invoices } = useGetInvoices();
  const { data: subcontractors } = useGetSubcontractors();
  const { data: documents } = useGetDocuments();
  const { data: schedule } = useGetSchedule();
  const { data: plant } = useGetPlant();
  const { data: rateBook } = useGetRateBook();

  useEffect(() => {
    if (clients) dispatch({ type: 'INIT_CLIENTS', clients: clients.map(toClient) });
  }, [clients, dispatch]);

  useEffect(() => {
    if (jobs) dispatch({ type: 'INIT_JOBS', jobs: jobs.map(toJob) });
  }, [jobs, dispatch]);

  useEffect(() => {
    if (quotes) dispatch({ type: 'INIT_QUOTES', quotes: quotes.map(toQuote) });
  }, [quotes, dispatch]);

  useEffect(() => {
    if (invoices) dispatch({ type: 'INIT_INVOICES', invoices: invoices.map(toInvoice) });
  }, [invoices, dispatch]);

  useEffect(() => {
    if (subcontractors) dispatch({ type: 'INIT_SUBCONTRACTORS', subcontractors: subcontractors.map(toSubcontractor) });
  }, [subcontractors, dispatch]);

  useEffect(() => {
    if (documents) dispatch({ type: 'INIT_DOCUMENTS', documents: documents.map(toDocument) });
  }, [documents, dispatch]);

  useEffect(() => {
    if (schedule) dispatch({ type: 'INIT_SCHEDULE', schedule: schedule.map(toScheduleEntry) });
  }, [schedule, dispatch]);

  useEffect(() => {
    if (plant) dispatch({ type: 'INIT_PLANT', plant: plant.map(toPlant) });
  }, [plant, dispatch]);

  useEffect(() => {
    if (rateBook) dispatch({ type: 'INIT_RATE_BOOK', rateBook });
  }, [rateBook, dispatch]);

  useEffect(() => {
    const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, '') ?? '';
    fetch(`${BASE}/api/timesheets`)
      .then(r => r.json())
      .then((rows: Record<string, unknown>[]) => {
        if (!Array.isArray(rows)) return;
        dispatch({ type: 'INIT_TIMESHEETS', timesheets: rows.map(toTimesheet) });
      })
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    fetch('/api/cis/returns')
      .then(r => r.json())
      .then((rows: Record<string, unknown>[]) => {
        if (!Array.isArray(rows)) return;
        dispatch({ type: 'INIT_CIS_RETURNS', cisReturns: rows.map(mapCisReturn) });
      })
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    fetch('/api/settings/company')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          dispatch({ type: 'INIT_SETTINGS', settings: data });
        }
      })
      .catch(() => {});
  }, [dispatch]);

  return null;
}
