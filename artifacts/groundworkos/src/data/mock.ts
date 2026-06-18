import type {
  Job, Quote, Invoice, Client, Subcontractor, Document,
  ScheduleEntry, Plant, RateBookEntry, CISReturn
} from '../types';

export const CLIENTS: Client[] = [
  { id: 'c1', company_name: 'Midlands Build Ltd', contact_name: 'Steve Hartley', email: 'steve@midlandsbuild.co.uk', phone: '07712 334 556', address: '14 Canalside Ind. Est, Birmingham, B12 0PQ', vat_number: 'GB 234 5678 90', notes: null, created_at: '2024-01-10T09:00:00Z', total_jobs: 8, total_value: 340000 },
  { id: 'c2', company_name: 'Trent Developments PLC', contact_name: 'Mark Okafor', email: 'mark.okafor@trentdev.co.uk', phone: '07834 221 890', address: '3 Commerce Park, Nottingham, NG1 1AB', vat_number: 'GB 876 4321 12', notes: null, created_at: '2024-02-14T09:00:00Z', total_jobs: 5, total_value: 215000 },
  { id: 'c3', company_name: 'Peak Civil Engineering', contact_name: 'Diane Sutcliffe', email: 'dsutcliffe@peakcivil.co.uk', phone: '07590 112 344', address: 'Holborn Rd, Sheffield, S3 8BG', vat_number: 'GB 543 9910 33', notes: 'Preferred subcontractor status', created_at: '2024-03-05T09:00:00Z', total_jobs: 3, total_value: 98000 },
  { id: 'c4', company_name: 'Wolverhampton Homes', contact_name: 'James Bayliss', email: 'jbayliss@wvhomes.co.uk', phone: '07441 668 990', address: '67 Stafford St, Wolverhampton, WV1 1NB', vat_number: 'GB 112 3300 88', notes: null, created_at: '2024-04-20T09:00:00Z', total_jobs: 4, total_value: 175000 },
  { id: 'c5', company_name: 'Severn Valley Groundworks', contact_name: 'Rachel Moss', email: 'rachel@svgw.co.uk', phone: '07722 990 123', address: 'Unit 7, Stourport Rd, Kidderminster, DY11 7QX', vat_number: 'GB 667 2219 55', notes: null, created_at: '2024-05-01T09:00:00Z', total_jobs: 2, total_value: 67000 },
];

export const JOBS: Job[] = [
  { id: 'j1', job_number: 'GW-2024-001', title: 'Drainage & Sewers - New Estate Phase 1', client_id: 'c1', client: { company_name: 'Midlands Build Ltd' }, type: 'drainage', site_address: 'Longbridge Lane, Birmingham, B31 4SX', value: 85000, start_date: '2024-06-01', end_date: '2024-08-30', status: 'active', progress_percent: 72, description: 'Full drainage and sewer connection for 45-plot residential estate. Includes CCTV survey on completion.', created_at: '2024-05-15T09:00:00Z', foreman: 'Dave Walters', crew_count: 6, nrswa_required: true, permit_number: 'BCC-2024-0892' },
  { id: 'j2', job_number: 'GW-2024-002', title: 'Concrete Foundations - Industrial Unit', client_id: 'c2', client: { company_name: 'Trent Developments PLC' }, type: 'foundations', site_address: 'Redfield Way, Nottingham, NG8 3FW', value: 47500, start_date: '2024-07-10', end_date: '2024-09-15', status: 'active', progress_percent: 45, description: 'Strip and trench foundations for 2400sqm industrial unit. RC pile caps and ground beams.', created_at: '2024-06-20T09:00:00Z', foreman: 'Colin Sharp', crew_count: 4, nrswa_required: false, permit_number: null },
  { id: 'j3', job_number: 'GW-2024-003', title: 'Kerbing & Subbase - Car Park Extension', client_id: 'c3', client: { company_name: 'Peak Civil Engineering' }, type: 'kerbing', site_address: 'Holborn Rd, Sheffield, S3 8BG', value: 22000, start_date: '2024-08-01', end_date: '2024-09-01', status: 'complete', progress_percent: 100, description: 'Precast kerbing, MOT Type 1 subbase and bitmac base course for 3200sqm car park.', created_at: '2024-07-01T09:00:00Z', foreman: 'Dave Walters', crew_count: 3, nrswa_required: false, permit_number: null },
  { id: 'j4', job_number: 'GW-2024-004', title: 'Utility Ducting - High Street Scheme', client_id: 'c4', client: { company_name: 'Wolverhampton Homes' }, type: 'utilities', site_address: 'High St, Wolverhampton, WV1 1TN', value: 38000, start_date: '2024-09-05', end_date: '2024-10-20', status: 'active', progress_percent: 20, description: 'Installation of MDPE gas mains, HPPE electric ducting and MDPE water mains under carriageway.', created_at: '2024-08-10T09:00:00Z', foreman: 'Raj Patel', crew_count: 5, nrswa_required: true, permit_number: 'WCC-2024-1134' },
  { id: 'j5', job_number: 'GW-2024-005', title: 'Reinstatement Works - Gas Main Repair', client_id: 'c5', client: { company_name: 'Severn Valley Groundworks' }, type: 'reinstatement', site_address: 'Comberton Rd, Kidderminster, DY10 3EF', value: 12500, start_date: '2024-09-18', end_date: '2024-09-25', status: 'complete', progress_percent: 100, description: 'Full permanent reinstatement following emergency gas main repair. Category B carriageway.', created_at: '2024-09-15T09:00:00Z', foreman: 'Raj Patel', crew_count: 2, nrswa_required: true, permit_number: 'WCC-2024-1202' },
  { id: 'j6', job_number: 'GW-2024-006', title: 'Bulk Excavation - New Housing Site', client_id: 'c1', client: { company_name: 'Midlands Build Ltd' }, type: 'excavation', site_address: 'Shenley Lane, Birmingham, B29 4HG', value: 63000, start_date: '2024-10-01', end_date: null, status: 'quoted', progress_percent: 0, description: 'Mass excavation and disposal of approx 8,500m³ of made ground. Temporary works design included.', created_at: '2024-09-20T09:00:00Z', foreman: null, crew_count: null, nrswa_required: false, permit_number: null },
  { id: 'j7', job_number: 'GW-2024-007', title: 'Piling - 4-Storey Apartment Block', client_id: 'c2', client: { company_name: 'Trent Developments PLC' }, type: 'piling', site_address: 'Canal St, Nottingham, NG1 7HJ', value: 125000, start_date: '2024-11-01', end_date: null, status: 'quoted', progress_percent: 0, description: 'CFA piling 180No 450mm dia piles to depths of 12-18m. Piling mat and RC caps included.', created_at: '2024-09-25T09:00:00Z', foreman: null, crew_count: null, nrswa_required: false, permit_number: null },
  { id: 'j8', job_number: 'GW-2024-008', title: 'Sewer Inspection & Repair', client_id: 'c3', client: { company_name: 'Peak Civil Engineering' }, type: 'sewers', site_address: 'Woodseats Rd, Sheffield, S8 0PD', value: 9500, start_date: '2024-10-10', end_date: null, status: 'enquiry', progress_percent: 0, description: 'CCTV survey of existing sewer network, patch lining defective sections.', created_at: '2024-10-01T09:00:00Z', foreman: null, crew_count: null, nrswa_required: false, permit_number: null },
];

export const QUOTES: Quote[] = [
  {
    id: 'q1', quote_number: 'QT-2024-012', client_id: 'c1', client: { company_name: 'Midlands Build Ltd' },
    job_id: 'j6', title: 'Bulk Excavation - New Housing Site',
    status: 'sent', subtotal: 52500, vat_amount: 10500, total_amount: 63000,
    valid_until: '2024-11-15', notes: 'Price based on site investigation report dated 12/09/24. Disposal costs subject to tip charges in force at time of works.', created_at: '2024-09-20T09:00:00Z', sent_at: '2024-09-22T09:00:00Z',
    line_items: [
      { id: 'li1', description: 'Bulk excavation and disposal offsite', quantity: 8500, unit: 'm³', unit_price: 5.50, total: 46750 },
      { id: 'li2', description: 'Temporary works design and installation', quantity: 1, unit: 'Item', unit_price: 4500, total: 4500 },
      { id: 'li3', description: 'Dewatering allowance', quantity: 1, unit: 'Item', unit_price: 1250, total: 1250 },
    ],
  },
  {
    id: 'q2', quote_number: 'QT-2024-013', client_id: 'c2', client: { company_name: 'Trent Developments PLC' },
    job_id: 'j7', title: 'CFA Piling - Canal St Apartments',
    status: 'accepted', subtotal: 104167, vat_amount: 20833, total_amount: 125000,
    valid_until: '2024-12-01', notes: 'Pile test to be carried out by others. Site investigation assumed adequate for design.', created_at: '2024-09-25T09:00:00Z', sent_at: '2024-09-27T09:00:00Z',
    line_items: [
      { id: 'li4', description: 'CFA piling 450mm dia - per linear metre', quantity: 2700, unit: 'lm', unit_price: 32.50, total: 87750 },
      { id: 'li5', description: 'Piling mat - hardcore and geotextile', quantity: 850, unit: 'm²', unit_price: 12, total: 10200 },
      { id: 'li6', description: 'Reinforced pile caps (180 No)', quantity: 180, unit: 'No', unit_price: 35.65, total: 6417 },
    ],
  },
  {
    id: 'q3', quote_number: 'QT-2024-011', client_id: 'c4', client: { company_name: 'Wolverhampton Homes' },
    job_id: null, title: 'Subbase & Drainage - Phase 2 Housing',
    status: 'draft', subtotal: 78400, vat_amount: 15680, total_amount: 94080,
    valid_until: '2024-12-30', notes: null, created_at: '2024-10-01T09:00:00Z', sent_at: null,
    line_items: [
      { id: 'li7', description: 'Excavation to formation level', quantity: 5600, unit: 'm²', unit_price: 4.50, total: 25200 },
      { id: 'li8', description: 'Supply and lay MOT Type 1 subbase 250mm', quantity: 5600, unit: 'm²', unit_price: 8.75, total: 49000 },
      { id: 'li9', description: '150mm UPVC drainage with gullies', quantity: 420, unit: 'lm', unit_price: 10, total: 4200 },
    ],
  },
  {
    id: 'q4', quote_number: 'QT-2024-009', client_id: 'c5', client: { company_name: 'Severn Valley Groundworks' },
    job_id: null, title: 'Car Park Resurfacing Works',
    status: 'declined', subtotal: 18500, vat_amount: 3700, total_amount: 22200,
    valid_until: '2024-10-01', notes: 'Client opted for alternative contractor.', created_at: '2024-09-01T09:00:00Z', sent_at: '2024-09-03T09:00:00Z',
    line_items: [],
  },
];

export const INVOICES: Invoice[] = [
  { id: 'i1', invoice_number: 'INV-2024-021', client_id: 'c1', client: { company_name: 'Midlands Build Ltd' }, job_id: 'j1', job: { title: 'Drainage & Sewers - New Estate Phase 1' }, quote_id: null, subtotal: 28500, vat_amount: 5700, total_amount: 34200, status: 'paid', issued_date: '2024-07-01', due_date: '2024-07-31', paid_at: '2024-07-28T00:00:00Z', notes: 'Stage 1 payment - drainage installation complete', created_at: '2024-07-01T09:00:00Z', cis_deduction: null },
  { id: 'i2', invoice_number: 'INV-2024-025', client_id: 'c1', client: { company_name: 'Midlands Build Ltd' }, job_id: 'j1', job: { title: 'Drainage & Sewers - New Estate Phase 1' }, quote_id: null, subtotal: 25000, vat_amount: 5000, total_amount: 30000, status: 'sent', issued_date: '2024-09-01', due_date: '2024-10-01', paid_at: null, notes: 'Stage 2 payment - sewer connection and testing', created_at: '2024-09-01T09:00:00Z', cis_deduction: null },
  { id: 'i3', invoice_number: 'INV-2024-019', client_id: 'c2', client: { company_name: 'Trent Developments PLC' }, job_id: 'j2', job: { title: 'Concrete Foundations - Industrial Unit' }, quote_id: null, subtotal: 20000, vat_amount: 4000, total_amount: 24000, status: 'overdue', issued_date: '2024-08-15', due_date: '2024-09-15', paid_at: null, notes: 'Stage 1 - excavation and blinding', created_at: '2024-08-15T09:00:00Z', cis_deduction: null },
  { id: 'i4', invoice_number: 'INV-2024-022', client_id: 'c3', client: { company_name: 'Peak Civil Engineering' }, job_id: 'j3', job: { title: 'Kerbing & Subbase - Car Park Extension' }, quote_id: null, subtotal: 18333, vat_amount: 3667, total_amount: 22000, status: 'paid', issued_date: '2024-09-05', due_date: '2024-10-05', paid_at: '2024-09-30T00:00:00Z', notes: 'Final account - all works complete', created_at: '2024-09-05T09:00:00Z', cis_deduction: null },
  { id: 'i5', invoice_number: 'INV-2024-024', client_id: 'c5', client: { company_name: 'Severn Valley Groundworks' }, job_id: 'j5', job: { title: 'Reinstatement Works - Gas Main Repair' }, quote_id: null, subtotal: 10417, vat_amount: 2083, total_amount: 12500, status: 'paid', issued_date: '2024-09-26', due_date: '2024-10-26', paid_at: '2024-10-15T00:00:00Z', notes: null, created_at: '2024-09-26T09:00:00Z', cis_deduction: null },
  { id: 'i6', invoice_number: 'INV-2024-026', client_id: 'c4', client: { company_name: 'Wolverhampton Homes' }, job_id: 'j4', job: { title: 'Utility Ducting - High Street Scheme' }, quote_id: null, subtotal: 8500, vat_amount: 1700, total_amount: 10200, status: 'overdue', issued_date: '2024-09-20', due_date: '2024-10-20', paid_at: null, notes: 'Initial mobilisation and excavation works', created_at: '2024-09-20T09:00:00Z', cis_deduction: null },
];

export const SUBCONTRACTORS: Subcontractor[] = [
  { id: 's1', company_name: 'BK Drainage Solutions', contact_name: 'Barry Knowles', email: 'bk@bkdrainage.co.uk', phone: '07811 556 332', utr_number: '1234 56789 01', cis_status: 'gross', cis_deduction_rate: 0, trade: 'Drainage', nrswa_card_number: 'SR12345', nrswa_expiry: '2025-06-30', public_liability_expiry: '2025-03-31', cscs_card_expiry: '2026-01-15', address: '22 Pump House Lane, Birmingham, B15 3TH', notes: 'Preferred drainage specialist', created_at: '2024-01-01T09:00:00Z', active: true },
  { id: 's2', company_name: 'J&T Plant Hire', contact_name: 'Tommy Jenkins', email: 'tommy@jtplant.co.uk', phone: '07733 118 992', utr_number: '9876 54321 00', cis_status: 'net', cis_deduction_rate: 20, trade: 'Plant Hire', nrswa_card_number: null, nrswa_expiry: null, public_liability_expiry: '2025-01-15', cscs_card_expiry: '2025-08-20', address: 'Depot Rd, Walsall, WS1 4NP', notes: null, created_at: '2024-02-01T09:00:00Z', active: true },
  { id: 's3', company_name: 'TJ Concrete Ltd', contact_name: 'Steve Tomkins', email: 'steve@tjconcrete.co.uk', phone: '07900 442 110', utr_number: '5555 44444 33', cis_status: 'gross', cis_deduction_rate: 0, trade: 'Concrete Works', nrswa_card_number: null, nrswa_expiry: null, public_liability_expiry: '2024-11-30', cscs_card_expiry: '2025-04-10', address: '8 Quarry Bank Rd, Dudley, DY2 9EL', notes: 'Public liability expires soon!', created_at: '2024-03-15T09:00:00Z', active: true },
  { id: 's4', company_name: 'Northern Groundworks Ltd', contact_name: 'Alan Hodgson', email: 'ahodgson@northerngroundworks.co.uk', phone: '07521 334 667', utr_number: '2222 11111 99', cis_status: 'net', cis_deduction_rate: 20, trade: 'Groundworks', nrswa_card_number: 'SR67890', nrswa_expiry: '2026-02-28', public_liability_expiry: '2025-07-31', cscs_card_expiry: '2025-12-31', address: '55 Industrial Ave, Rotherham, S60 1DL', notes: null, created_at: '2024-04-10T09:00:00Z', active: true },
  { id: 's5', company_name: 'Quick Set Piling', contact_name: 'Gareth Williams', email: 'g.williams@quicksetpiling.co.uk', phone: '07644 887 003', utr_number: '7777 88888 11', cis_status: 'unverified', cis_deduction_rate: 30, trade: 'Piling', nrswa_card_number: null, nrswa_expiry: null, public_liability_expiry: '2025-05-31', cscs_card_expiry: '2025-11-30', address: 'Piling House, Stoke-on-Trent, ST4 5JR', notes: 'Awaiting CIS verification', created_at: '2024-06-01T09:00:00Z', active: true },
];

export const DOCUMENTS: Document[] = [
  { id: 'd1', name: 'Public Liability Insurance 2024/25', type: 'insurance', status: 'valid', expiry_date: '2025-03-31', issued_date: '2024-04-01', related_to: 'company', related_id: null, related_name: 'GroundworkOS Ltd', notes: '£10m cover - Aviva', created_at: '2024-04-01T09:00:00Z' },
  { id: 'd2', name: 'Employers Liability Insurance 2024/25', type: 'insurance', status: 'valid', expiry_date: '2025-03-31', issued_date: '2024-04-01', related_to: 'company', related_id: null, related_name: 'GroundworkOS Ltd', notes: '£10m statutory cover - Aviva', created_at: '2024-04-01T09:00:00Z' },
  { id: 'd3', name: 'CHAS Accreditation', type: 'certification', status: 'expiring_soon', expiry_date: '2024-11-30', issued_date: '2023-12-01', related_to: 'company', related_id: null, related_name: 'GroundworkOS Ltd', notes: 'Renewal submitted - awaiting confirmation', created_at: '2023-12-01T09:00:00Z' },
  { id: 'd4', name: 'Constructionline Gold', type: 'certification', status: 'valid', expiry_date: '2025-08-31', issued_date: '2024-09-01', related_to: 'company', related_id: null, related_name: 'GroundworkOS Ltd', notes: null, created_at: '2024-09-01T09:00:00Z' },
  { id: 'd5', name: 'RAMS - Drainage & Sewers Phase 1', type: 'rams', status: 'valid', expiry_date: null, issued_date: '2024-05-20', related_to: 'job', related_id: 'j1', related_name: 'GW-2024-001', notes: 'Rev 2 - approved by client 20/05/24', created_at: '2024-05-20T09:00:00Z' },
  { id: 'd6', name: 'RAMS - Utility Ducting High Street', type: 'rams', status: 'valid', expiry_date: null, issued_date: '2024-09-01', related_to: 'job', related_id: 'j4', related_name: 'GW-2024-004', notes: 'Includes Traffic Management Plan', created_at: '2024-09-01T09:00:00Z' },
  { id: 'd7', name: 'Street Works Permit - Utility Ducting', type: 'permit', status: 'valid', expiry_date: '2024-11-20', issued_date: '2024-09-05', related_to: 'job', related_id: 'j4', related_name: 'GW-2024-004', notes: 'Major Works Permit WCC-2024-1134', created_at: '2024-09-05T09:00:00Z' },
  { id: 'd8', name: 'TJ Concrete - Public Liability', type: 'insurance', status: 'expiring_soon', expiry_date: '2024-11-30', issued_date: '2023-12-01', related_to: 'subcontractor', related_id: 's3', related_name: 'TJ Concrete Ltd', notes: 'Request renewal certificate urgently', created_at: '2023-12-01T09:00:00Z' },
  { id: 'd9', name: 'JCB 3CX Thorough Examination', type: 'compliance', status: 'valid', expiry_date: '2025-02-14', issued_date: '2024-02-14', related_to: 'plant', related_id: 'p1', related_name: 'JCB 3CX - YD21 XPR', notes: 'LOLER Thorough Examination cert', created_at: '2024-02-14T09:00:00Z' },
  { id: 'd10', name: 'SMSTS Cert - Dave Walters', type: 'certification', status: 'valid', expiry_date: '2029-03-15', issued_date: '2024-03-15', related_to: 'company', related_id: null, related_name: 'Dave Walters', notes: '5-year cert', created_at: '2024-03-15T09:00:00Z' },
  { id: 'd11', name: 'NRSWA Supervisor - Raj Patel', type: 'certification', status: 'valid', expiry_date: '2027-01-20', issued_date: '2024-01-20', related_to: 'company', related_id: null, related_name: 'Raj Patel', notes: 'Unit 002, 003, 010', created_at: '2024-01-20T09:00:00Z' },
  { id: 'd12', name: 'ISO 9001:2015 Certification', type: 'certification', status: 'expired', expiry_date: '2024-08-31', issued_date: '2021-09-01', related_to: 'company', related_id: null, related_name: 'GroundworkOS Ltd', notes: 'Renewal required - contact BSI', created_at: '2021-09-01T09:00:00Z' },
];

const today = new Date();
const getDate = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(today.getDate() + offsetDays);
  return d.toISOString().replace('T', ' ').substring(0, 16);
};

export const SCHEDULE: ScheduleEntry[] = [
  { id: 'se1', job_id: 'j1', job: { job_number: 'GW-2024-001', title: 'Drainage & Sewers - New Estate Phase 1', client: { company_name: 'Midlands Build Ltd' } }, title: 'Drain run chainage 0-120m', start_datetime: `${today.toISOString().split('T')[0]}T07:30:00`, end_datetime: `${today.toISOString().split('T')[0]}T17:00:00`, crew_count: 5, plant_assigned: 'JCB 3CX, Wacker Plate', foreman: 'Dave Walters', notes: 'Aim to complete drain run to manhole 6', type: 'site_work' },
  { id: 'se2', job_id: 'j4', job: { job_number: 'GW-2024-004', title: 'Utility Ducting - High Street Scheme', client: { company_name: 'Wolverhampton Homes' } }, title: 'Gas duct installation Day 3', start_datetime: `${today.toISOString().split('T')[0]}T07:00:00`, end_datetime: `${today.toISOString().split('T')[0]}T16:30:00`, crew_count: 4, plant_assigned: 'Bobcat E35, Road Saw', foreman: 'Raj Patel', notes: 'Traffic management in place from 0630', type: 'site_work' },
  { id: 'se3', job_id: 'j2', job: { job_number: 'GW-2024-002', title: 'Concrete Foundations - Industrial Unit', client: { company_name: 'Trent Developments PLC' } }, title: 'Concrete pour - pile caps grid A', start_datetime: getDate(1) + ':00', end_datetime: getDate(1).replace('T07', 'T16'), crew_count: 3, plant_assigned: 'Concrete Pump, Poker Vibrator', foreman: 'Colin Sharp', notes: 'Pumping from Hanson Nottingham - call-off 0700', type: 'site_work' },
  { id: 'se4', job_id: 'j1', job: { job_number: 'GW-2024-001', title: 'Drainage & Sewers - New Estate Phase 1', client: { company_name: 'Midlands Build Ltd' } }, title: 'CCTV drain survey sections 1-3', start_datetime: getDate(2) + ':30', end_datetime: getDate(2).replace('T07', 'T13'), crew_count: 2, plant_assigned: 'CCTV Van', foreman: 'Dave Walters', notes: 'Survey and produce report for client', type: 'inspection' },
  { id: 'se5', job_id: null, job: null, title: 'Plant Delivery - JCB 13t to Nottingham', start_datetime: getDate(2) + ':00', end_datetime: getDate(2).replace('T07', 'T10'), crew_count: 1, plant_assigned: 'Hiab Transport', foreman: null, notes: 'Lowloader booked from depot 0600', type: 'delivery' },
  { id: 'se6', job_id: 'j4', job: { job_number: 'GW-2024-004', title: 'Utility Ducting - High Street Scheme', client: { company_name: 'Wolverhampton Homes' } }, title: 'Site meeting - WCC Inspector', start_datetime: getDate(3) + ':00', end_datetime: getDate(3).replace('T07', 'T09'), crew_count: 2, plant_assigned: null, foreman: 'Raj Patel', notes: 'Compliance check and inspection', type: 'meeting' },
];

export const PLANT: Plant[] = [
  { id: 'p1', name: 'JCB 3CX Backhoe Loader', registration: 'YD21 XPR', category: 'Backhoe', make: 'JCB', model: '3CX Pro', year: 2021, status: 'on_site', current_job_id: 'j1', current_job: { title: 'Drainage & Sewers - New Estate Phase 1' }, service_due: '2025-01-15', mot_due: null, thorough_exam_due: '2025-02-14', notes: null, daily_rate: 280, owned: true },
  { id: 'p2', name: 'Bobcat E35 Mini Excavator', registration: null, category: 'Excavator', make: 'Bobcat', model: 'E35', year: 2022, status: 'on_site', current_job_id: 'j4', current_job: { title: 'Utility Ducting - High Street Scheme' }, service_due: '2024-12-01', mot_due: null, thorough_exam_due: '2025-03-10', notes: null, daily_rate: 195, owned: true },
  { id: 'p3', name: 'Komatsu PC138 13t Excavator', registration: 'SN68 VKB', category: 'Excavator', make: 'Komatsu', model: 'PC138US-11', year: 2019, status: 'available', current_job_id: null, current_job: null, service_due: '2025-02-28', mot_due: null, thorough_exam_due: '2024-12-05', notes: 'Service overdue check', daily_rate: 420, owned: true },
  { id: 'p4', name: 'Wacker Plate Compactor', registration: null, category: 'Compaction', make: 'Wacker Neuson', model: 'DPU 6555', year: 2020, status: 'on_site', current_job_id: 'j1', current_job: { title: 'Drainage & Sewers - New Estate Phase 1' }, service_due: '2025-01-01', mot_due: null, thorough_exam_due: null, notes: null, daily_rate: 55, owned: true },
  { id: 'p5', name: '3t Dumper', registration: null, category: 'Dumper', make: 'Thwaites', model: 'MACH 3', year: 2021, status: 'available', current_job_id: null, current_job: null, service_due: '2025-03-01', mot_due: null, thorough_exam_due: '2025-01-20', notes: null, daily_rate: 120, owned: true },
  { id: 'p6', name: 'Hilta Road Saw', registration: null, category: 'Saw', make: 'Hilta', model: 'FS500', year: 2022, status: 'maintenance', current_job_id: null, current_job: null, service_due: '2024-10-15', mot_due: null, thorough_exam_due: null, notes: 'Diamond blade replacement - in workshop', daily_rate: 75, owned: true },
  { id: 'p7', name: 'Benford PT2000 Roller', registration: null, category: 'Roller', make: 'Benford', model: 'PT2000', year: 2018, status: 'hired_in', current_job_id: 'j3', current_job: null, service_due: null, mot_due: null, thorough_exam_due: null, notes: 'Hired from Hewden - returns Friday', daily_rate: 145, owned: false },
];

export const RATE_BOOK: RateBookEntry[] = [
  { id: 'rb1', category: 'Drainage', description: 'Excavation for drain trench 0-1.5m deep', unit: 'm³', labour_rate: 12.50, material_rate: 0, plant_rate: 8.00, total_rate: 20.50, notes: 'Includes disposal to waste' },
  { id: 'rb2', category: 'Drainage', description: 'UPVC 110mm drainage pipe laid and haunched', unit: 'lm', labour_rate: 8.00, material_rate: 6.50, plant_rate: 2.00, total_rate: 16.50, notes: null },
  { id: 'rb3', category: 'Drainage', description: 'UPVC 150mm drainage pipe laid and haunched', unit: 'lm', labour_rate: 9.00, material_rate: 9.00, plant_rate: 2.50, total_rate: 20.50, notes: null },
  { id: 'rb4', category: 'Drainage', description: 'UPVC 225mm drainage pipe laid and haunched', unit: 'lm', labour_rate: 12.00, material_rate: 18.00, plant_rate: 4.00, total_rate: 34.00, notes: null },
  { id: 'rb5', category: 'Drainage', description: 'Standard 450mm dia precast concrete manhole to 1.5m', unit: 'No', labour_rate: 180, material_rate: 350, plant_rate: 60, total_rate: 590, notes: 'Per No. including frame and cover' },
  { id: 'rb6', category: 'Excavation', description: 'Bulk excavation by machine', unit: 'm³', labour_rate: 2.50, material_rate: 0, plant_rate: 3.00, total_rate: 5.50, notes: 'Excludes disposal - add tip charges' },
  { id: 'rb7', category: 'Excavation', description: 'Disposal of excavated material offsite', unit: 'm³', labour_rate: 1.00, material_rate: 8.50, plant_rate: 2.00, total_rate: 11.50, notes: 'Material tip charge variable' },
  { id: 'rb8', category: 'Subbase', description: 'Supply and lay MOT Type 1 subbase 150mm', unit: 'm²', labour_rate: 3.00, material_rate: 4.50, plant_rate: 1.50, total_rate: 9.00, notes: null },
  { id: 'rb9', category: 'Subbase', description: 'Supply and lay MOT Type 1 subbase 250mm', unit: 'm²', labour_rate: 4.00, material_rate: 6.75, plant_rate: 2.00, total_rate: 12.75, notes: null },
  { id: 'rb10', category: 'Kerbing', description: 'Precast concrete kerb type HB2 laid on C7.5 bed', unit: 'lm', labour_rate: 9.00, material_rate: 7.50, plant_rate: 1.50, total_rate: 18.00, notes: null },
  { id: 'rb11', category: 'Kerbing', description: 'Precast concrete edging 50x150mm', unit: 'lm', labour_rate: 7.00, material_rate: 4.00, plant_rate: 1.00, total_rate: 12.00, notes: null },
  { id: 'rb12', category: 'Foundations', description: 'Strip foundation excavation and concrete C25 250mm', unit: 'lm', labour_rate: 22.00, material_rate: 18.00, plant_rate: 6.00, total_rate: 46.00, notes: 'Width 600mm assumed' },
  { id: 'rb13', category: 'Reinstatement', description: 'Cat B carriageway permanent reinstatement', unit: 'm²', labour_rate: 18.00, material_rate: 32.00, plant_rate: 8.00, total_rate: 58.00, notes: 'Per Highways England SHW' },
  { id: 'rb14', category: 'Reinstatement', description: 'Cat A footway permanent reinstatement', unit: 'm²', labour_rate: 14.00, material_rate: 20.00, plant_rate: 4.00, total_rate: 38.00, notes: 'Block paving match existing' },
  { id: 'rb15', category: 'Labour', description: 'Groundworker day rate', unit: 'day', labour_rate: 195, material_rate: 0, plant_rate: 0, total_rate: 195, notes: 'CIS gross rate' },
  { id: 'rb16', category: 'Labour', description: 'Ganger / working foreman day rate', unit: 'day', labour_rate: 240, material_rate: 0, plant_rate: 0, total_rate: 240, notes: 'SSSTS qualified' },
  { id: 'rb17', category: 'Labour', description: 'Plant operator day rate', unit: 'day', labour_rate: 210, material_rate: 0, plant_rate: 0, total_rate: 210, notes: 'CPCS card required' },
];

export const CIS_RETURNS: CISReturn[] = [
  { id: 'cis1', tax_month: '2024-09', subcontractor_id: 's2', subcontractor_name: 'J&T Plant Hire', gross_payment: 8400, deduction_rate: 20, deduction_amount: 1680, net_payment: 6720, submitted: true, submitted_at: '2024-10-19T09:00:00Z' },
  { id: 'cis2', tax_month: '2024-09', subcontractor_id: 's4', subcontractor_name: 'Northern Groundworks Ltd', gross_payment: 12500, deduction_rate: 20, deduction_amount: 2500, net_payment: 10000, submitted: true, submitted_at: '2024-10-19T09:00:00Z' },
  { id: 'cis3', tax_month: '2024-09', subcontractor_id: 's5', subcontractor_name: 'Quick Set Piling', gross_payment: 5000, deduction_rate: 30, deduction_amount: 1500, net_payment: 3500, submitted: true, submitted_at: '2024-10-19T09:00:00Z' },
  { id: 'cis4', tax_month: '2024-10', subcontractor_id: 's2', subcontractor_name: 'J&T Plant Hire', gross_payment: 6200, deduction_rate: 20, deduction_amount: 1240, net_payment: 4960, submitted: false, submitted_at: null },
  { id: 'cis5', tax_month: '2024-10', subcontractor_id: 's4', subcontractor_name: 'Northern Groundworks Ltd', gross_payment: 9800, deduction_rate: 20, deduction_amount: 1960, net_payment: 7840, submitted: false, submitted_at: null },
];
