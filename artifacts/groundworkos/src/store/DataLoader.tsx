import { useEffect } from 'react';
import {
  useGetClients, useGetJobs, useGetQuotes, useGetInvoices,
  useGetSubcontractors, useGetDocuments, useGetSchedule,
  useGetPlant, useGetRateBook,
} from '@workspace/api-client-react';
import { useApp } from './AppContext';
import {
  toClient, toJob, toQuote, toInvoice, toSubcontractor,
  toDocument, toScheduleEntry, toPlant,
} from '../lib/apiTransforms';

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
  const { data: _rateBook } = useGetRateBook();

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

  return null;
}
