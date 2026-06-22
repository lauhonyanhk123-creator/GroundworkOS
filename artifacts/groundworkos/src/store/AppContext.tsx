import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Job, Quote, Invoice, Client, Subcontractor, Document, ScheduleEntry, Plant } from '../types';
import type { CISReturn } from '../types';

export interface AppState {
  jobs: Job[];
  quotes: Quote[];
  invoices: Invoice[];
  clients: Client[];
  subcontractors: Subcontractor[];
  documents: Document[];
  schedule: ScheduleEntry[];
  plant: Plant[];
  cisReturns: CISReturn[];
}

export type AppAction =
  | { type: 'INIT_JOBS'; jobs: Job[] }
  | { type: 'INIT_QUOTES'; quotes: Quote[] }
  | { type: 'INIT_INVOICES'; invoices: Invoice[] }
  | { type: 'INIT_CLIENTS'; clients: Client[] }
  | { type: 'INIT_SUBCONTRACTORS'; subcontractors: Subcontractor[] }
  | { type: 'INIT_DOCUMENTS'; documents: Document[] }
  | { type: 'INIT_SCHEDULE'; schedule: ScheduleEntry[] }
  | { type: 'INIT_PLANT'; plant: Plant[] }
  | { type: 'ADD_JOB'; job: Job }
  | { type: 'UPDATE_JOB'; id: string; updates: Partial<Job> }
  | { type: 'ADD_QUOTE'; quote: Quote }
  | { type: 'UPDATE_QUOTE'; id: string; updates: Partial<Quote> }
  | { type: 'ADD_INVOICE'; invoice: Invoice }
  | { type: 'UPDATE_INVOICE'; id: string; updates: Partial<Invoice> }
  | { type: 'ADD_CLIENT'; client: Client }
  | { type: 'UPDATE_CLIENT'; id: string; updates: Partial<Client> }
  | { type: 'ADD_SUBCONTRACTOR'; sub: Subcontractor }
  | { type: 'UPDATE_SUBCONTRACTOR'; id: string; updates: Partial<Subcontractor> }
  | { type: 'ADD_DOCUMENT'; doc: Document }
  | { type: 'ADD_PLANT'; plant: Plant }
  | { type: 'UPDATE_PLANT'; id: string; updates: Partial<Plant> }
  | { type: 'ADD_SCHEDULE'; entry: ScheduleEntry };

const initialState: AppState = {
  jobs: [],
  quotes: [],
  invoices: [],
  clients: [],
  subcontractors: [],
  documents: [],
  schedule: [],
  plant: [],
  cisReturns: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'INIT_JOBS': return { ...state, jobs: action.jobs };
    case 'INIT_QUOTES': return { ...state, quotes: action.quotes };
    case 'INIT_INVOICES': return { ...state, invoices: action.invoices };
    case 'INIT_CLIENTS': return { ...state, clients: action.clients };
    case 'INIT_SUBCONTRACTORS': return { ...state, subcontractors: action.subcontractors };
    case 'INIT_DOCUMENTS': return { ...state, documents: action.documents };
    case 'INIT_SCHEDULE': return { ...state, schedule: action.schedule };
    case 'INIT_PLANT': return { ...state, plant: action.plant };
    case 'ADD_JOB':
      return { ...state, jobs: [action.job, ...state.jobs] };
    case 'UPDATE_JOB':
      return { ...state, jobs: state.jobs.map(j => j.id === action.id ? { ...j, ...action.updates } : j) };
    case 'ADD_QUOTE':
      return { ...state, quotes: [action.quote, ...state.quotes] };
    case 'UPDATE_QUOTE':
      return { ...state, quotes: state.quotes.map(q => q.id === action.id ? { ...q, ...action.updates } : q) };
    case 'ADD_INVOICE':
      return { ...state, invoices: [action.invoice, ...state.invoices] };
    case 'UPDATE_INVOICE':
      return { ...state, invoices: state.invoices.map(i => i.id === action.id ? { ...i, ...action.updates } : i) };
    case 'ADD_CLIENT':
      return { ...state, clients: [action.client, ...state.clients] };
    case 'UPDATE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.id ? { ...c, ...action.updates } : c) };
    case 'ADD_SUBCONTRACTOR':
      return { ...state, subcontractors: [action.sub, ...state.subcontractors] };
    case 'UPDATE_SUBCONTRACTOR':
      return { ...state, subcontractors: state.subcontractors.map(s => s.id === action.id ? { ...s, ...action.updates } : s) };
    case 'ADD_DOCUMENT':
      return { ...state, documents: [action.doc, ...state.documents] };
    case 'ADD_PLANT':
      return { ...state, plant: [action.plant, ...state.plant] };
    case 'UPDATE_PLANT':
      return { ...state, plant: state.plant.map(p => p.id === action.id ? { ...p, ...action.updates } : p) };
    case 'ADD_SCHEDULE':
      return { ...state, schedule: [action.entry, ...state.schedule] };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function nextJobNumber(jobs: Job[]): string {
  const year = new Date().getFullYear();
  const nums = jobs.map(j => parseInt(j.job_number.split('-')[2] ?? '0')).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `GW-${year}-${String(next).padStart(3, '0')}`;
}

export function nextInvoiceNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const nums = invoices.map(i => parseInt(i.invoice_number.split('-')[2] ?? '0')).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `INV-${year}-${String(next).padStart(3, '0')}`;
}

export function nextQuoteNumber(quotes: Quote[]): string {
  const year = new Date().getFullYear();
  const nums = quotes.map(q => parseInt(q.quote_number.split('-')[2] ?? '0')).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `QT-${year}-${String(next).padStart(3, '0')}`;
}
