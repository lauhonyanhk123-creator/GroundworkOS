import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// All demo data lives under this tenant. Re-running the seed deletes the
// company row first, and ON DELETE CASCADE clears every dependent table —
// other tenants' data is never touched.
const DEMO_COMPANY_NAME = 'Demo Groundworks Ltd';

function daysFrom(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function atHour(dayOffset: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function nextNumber(rpc: 'generate_job_number' | 'generate_quote_number' | 'generate_invoice_number'): Promise<string> {
  const { data, error } = await supabase.rpc(rpc);
  if (error) throw error;
  return data as string;
}

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    console.log('🗑️  Removing previous demo company (cascades to all demo data)...');
    const { error: wipeError } = await supabase
      .from('companies')
      .delete()
      .eq('name', DEMO_COMPANY_NAME);
    if (wipeError) throw wipeError;

    console.log('🏢 Creating demo company...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: DEMO_COMPANY_NAME,
        email: 'office@demogroundworks.co.uk',
        phone: '01234 567890',
        address: 'Unit 4, Trade Park, Reading RG1 2LP',
        vat_number: 'GB123456789',
      })
      .select()
      .single();
    if (companyError || !company) throw companyError ?? new Error('Company insert returned no row');
    const companyId: string = company.id;
    console.log(`✅ Created company ${DEMO_COMPANY_NAME} (${companyId})`);

    const seedUserEmail = process.env.SEED_USER_EMAIL;
    if (seedUserEmail) {
      console.log(`🔗 Linking ${seedUserEmail} as admin...`);
      const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      const authUser = userList.users.find(
        (u) => u.email?.toLowerCase() === seedUserEmail.toLowerCase()
      );
      if (!authUser) {
        console.warn(`⚠️  No auth user found for ${seedUserEmail} — sign up first, then re-run the seed.`);
      } else {
        const { error: linkError } = await supabase
          .from('user_companies')
          .insert({ user_id: authUser.id, company_id: companyId, role: 'admin' });
        if (linkError) throw linkError;
        console.log(`✅ Linked ${seedUserEmail} as admin of ${DEMO_COMPANY_NAME}`);
      }
    } else {
      console.log('ℹ️  Set SEED_USER_EMAIL in .env.local to link your login to the demo company.');
    }

    console.log('👥 Seeding clients...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .insert([
        {
          company_id: companyId,
          company_name: 'Barrett Homes',
          contact_name: 'John Smith',
          email: 'john@barretthomes.co.uk',
          phone: '01234 567890',
          address: '12 Business Park, Reading RG1 2LP',
          companies_house_number: '01234567',
          notes: 'Preferred client. Priority service on all jobs.',
        },
        {
          company_id: companyId,
          company_name: 'Weston Homes',
          contact_name: 'Sarah Jones',
          email: 'sarah@westonhomes.co.uk',
          phone: '01865 432100',
          address: '45 High Street, Oxford OX1 1AA',
          companies_house_number: '09876543',
          notes: 'Large volume client. Good payment history.',
        },
        {
          company_id: companyId,
          company_name: 'Local Council',
          contact_name: 'David Brown',
          email: 'd.brown@localcouncil.gov.uk',
          phone: '01793 654321',
          address: 'Council Offices, Swindon SN1 1AB',
          notes: 'Government client. Requires purchase orders.',
        },
        {
          company_id: companyId,
          company_name: 'Bloor Homes',
          contact_name: 'Emma Wilson',
          email: 'emma@bloorhomes.co.uk',
          phone: '01684 987654',
          address: '78 Industrial Estate, Worcester WR1 2YZ',
          companies_house_number: '02468135',
        },
        {
          company_id: companyId,
          company_name: 'Commercial Developments Ltd',
          contact_name: 'Robert Taylor',
          email: 'robert@commercialdevs.co.uk',
          phone: '01189 123456',
          address: '90 Commerce Park, Bristol BS1 6AH',
          companies_house_number: '13579246',
        },
      ])
      .select();

    if (clientsError) throw clientsError;
    console.log(`✅ Created ${clients.length} clients`);

    console.log('🔧 Seeding subcontractors...');
    const { data: subcontractors, error: subcontractorsError } = await supabase
      .from('subcontractors')
      .insert([
        {
          company_id: companyId,
          company_name: 'ABC Excavations Ltd',
          contact_name: 'Mike Johnson',
          email: 'mike@abcexcavations.co.uk',
          phone: '07700 900123',
          trade: 'Excavation',
          cis_status: 'net',
          cis_verified_at: new Date().toISOString(),
          utr_number: '12345678901',
          notes: 'Primary excavation subcontractor. Very reliable.',
        },
        {
          company_id: companyId,
          company_name: 'XYZ Drainage Co',
          contact_name: 'Sarah Brown',
          email: 'sarah@xyzdrainage.co.uk',
          phone: '07700 900456',
          trade: 'Drainage',
          cis_status: 'unverified',
          utr_number: '98765432109',
        },
        {
          company_id: companyId,
          company_name: 'Quick Concrete Services',
          contact_name: 'Tom Wilson',
          email: 'tom@quickconcrete.co.uk',
          phone: '07700 900789',
          trade: 'Concrete',
          cis_status: 'gross',
          cis_verified_at: new Date().toISOString(),
          utr_number: '56789123456',
          notes: 'Specialist in large pours.',
        },
        {
          company_id: companyId,
          company_name: 'Professional Kerbing',
          contact_name: 'Lisa Davis',
          email: 'lisa@profkerb.co.uk',
          phone: '07700 900321',
          trade: 'Kerbing',
          cis_status: 'net',
          cis_verified_at: new Date().toISOString(),
          utr_number: '24681357912',
        },
      ])
      .select();

    if (subcontractorsError) throw subcontractorsError;
    console.log(`✅ Created ${subcontractors.length} subcontractors`);

    console.log('📋 Seeding jobs...');
    const jobRows = [
      {
        client_id: clients[0].id,
        title: 'Newbury Site Preparation',
        description:
          'Full site preparation including excavation, drainage installation, and groundworks for a new residential development.',
        site_address: 'Newbury Business Park, RG14 2LP',
        status: 'active',
        type: 'foundations',
        value: 45000,
        progress_percent: 65,
        start_date: daysFrom(-45),
        end_date: daysFrom(30),
      },
      {
        client_id: clients[1].id,
        title: 'Reading Retail Development',
        description: 'Excavation and groundworks for new retail complex.',
        site_address: 'Reading Town Centre, RG1 7LG',
        status: 'active',
        type: 'excavation',
        value: 32000,
        progress_percent: 40,
        start_date: daysFrom(-30),
        end_date: daysFrom(45),
      },
      {
        client_id: clients[2].id,
        title: 'Swindon Depot Upgrade',
        description: 'Drainage improvements and resurfacing work at council depot.',
        site_address: 'Swindon Industrial Estate, SN1 4LZ',
        status: 'on-hold',
        type: 'drainage',
        value: 18000,
        progress_percent: 80,
        start_date: daysFrom(-90),
      },
      {
        client_id: clients[3].id,
        title: 'Oxford Housing Development',
        description: 'Kerbing and footway work for new housing estate.',
        site_address: 'Oxford Business Park, OX4 2JZ',
        status: 'complete',
        type: 'kerbing',
        value: 25000,
        progress_percent: 100,
        start_date: daysFrom(-120),
        end_date: daysFrom(-20),
      },
      {
        client_id: clients[4].id,
        title: 'Bristol Office Block',
        description: 'Foundation and drainage work for commercial office development.',
        site_address: 'Bristol Harbour, BS1 6AH',
        status: 'quoted',
        type: 'foundations',
        value: 85000,
        progress_percent: 0,
      },
    ];

    const jobs = [];
    for (const row of jobRows) {
      const job_number = await nextNumber('generate_job_number');
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({ ...row, company_id: companyId, job_number })
        .select()
        .single();
      if (jobError || !job) throw jobError ?? new Error('Job insert returned no row');
      jobs.push(job);
    }
    console.log(`✅ Created ${jobs.length} jobs`);

    console.log('📝 Adding job history...');
    for (const job of jobs) {
      const { error: historyError } = await supabase.from('status_history').insert([
        {
          company_id: companyId,
          entity_type: 'job',
          entity_id: job.id,
          old_status: null,
          new_status: 'enquiry',
          notes: 'Initial enquiry received',
        },
        {
          company_id: companyId,
          entity_type: 'job',
          entity_id: job.id,
          old_status: 'enquiry',
          new_status: 'quoted',
          notes: 'Quote sent to client',
        },
        {
          company_id: companyId,
          entity_type: 'job',
          entity_id: job.id,
          old_status: 'quoted',
          new_status: job.status,
          notes: 'Status updated',
        },
      ]);
      if (historyError) throw historyError;
    }
    console.log(`✅ Added history for ${jobs.length} jobs`);

    console.log('💰 Seeding quotes...');
    const quoteRows = [
      {
        client_id: clients[0].id,
        job_id: jobs[0].id,
        title: 'Newbury Site Preparation',
        status: 'accepted',
        line_items: [
          { description: 'Site clearance and preparation', quantity: 1, unit_price: 5000, total: 5000 },
          { description: 'Excavation works', quantity: 1, unit_price: 12000, total: 12000 },
          { description: 'Drainage installation', quantity: 1, unit_price: 8000, total: 8000 },
          { description: 'Foundation concrete pour', quantity: 1, unit_price: 8500, total: 8500 },
          { description: 'Backfill and compaction', quantity: 1, unit_price: 4000, total: 4000 },
        ],
        subtotal: 37500,
        vat_amount: 7500,
        total_amount: 45000,
        notes: 'Price valid for 30 days.',
        sent_at: atHour(-40, 9),
        accepted_at: atHour(-35, 14),
      },
      {
        client_id: clients[1].id,
        job_id: jobs[1].id,
        title: 'Reading Excavation',
        status: 'draft',
        line_items: [
          { description: 'Bulk excavation', quantity: 1, unit_price: 15000, total: 15000 },
          { description: 'Site levelling', quantity: 1, unit_price: 5000, total: 5000 },
          { description: 'Disposal of spoil', quantity: 1, unit_price: 6666.67, total: 6666.67 },
        ],
        subtotal: 26666.67,
        vat_amount: 5333.33,
        total_amount: 32000,
      },
      {
        client_id: clients[3].id,
        job_id: jobs[3].id,
        title: 'Oxford Foundations',
        status: 'accepted',
        line_items: [
          { description: 'Foundation trenches', quantity: 1, unit_price: 20000, total: 20000 },
          { description: 'Concrete fill', quantity: 1, unit_price: 15000, total: 15000 },
          { description: 'Steel reinforcement', quantity: 1, unit_price: 8000, total: 8000 },
          { description: 'Damp proof membrane', quantity: 1, unit_price: 5333.33, total: 5333.33 },
        ],
        subtotal: 48333.33,
        vat_amount: 9666.67,
        total_amount: 58000,
        sent_at: atHour(-100, 9),
        accepted_at: atHour(-95, 11),
      },
      {
        client_id: clients[4].id,
        job_id: jobs[4].id,
        title: 'Bristol Office Block',
        status: 'sent',
        line_items: [
          { description: 'Bulk excavation', quantity: 1, unit_price: 28000, total: 28000 },
          { description: 'Foundation trenches', quantity: 1, unit_price: 24000, total: 24000 },
          { description: 'Drainage installation', quantity: 1, unit_price: 18833.33, total: 18833.33 },
        ],
        subtotal: 70833.33,
        vat_amount: 14166.67,
        total_amount: 85000,
        sent_at: atHour(-7, 10),
      },
    ];

    const quotes = [];
    for (const row of quoteRows) {
      const quote_number = await nextNumber('generate_quote_number');
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({ ...row, company_id: companyId, quote_number })
        .select()
        .single();
      if (quoteError || !quote) throw quoteError ?? new Error('Quote insert returned no row');
      quotes.push(quote);
    }
    console.log(`✅ Created ${quotes.length} quotes with line items`);

    console.log('🧾 Seeding invoices...');
    const invoiceRows = [
      {
        client_id: clients[3].id,
        job_id: jobs[3].id,
        quote_id: quotes[2].id,
        subtotal: 48333.33,
        vat_amount: 9666.67,
        total_amount: 58000,
        status: 'paid',
        due_date: daysFrom(-15),
        paid_at: atHour(-18, 15),
        notes: 'Final invoice for Oxford housing development.',
      },
      {
        client_id: clients[0].id,
        job_id: jobs[0].id,
        quote_id: quotes[0].id,
        subtotal: 18750,
        vat_amount: 3750,
        total_amount: 22500,
        status: 'sent',
        due_date: daysFrom(21),
        notes: 'Stage payment 1 of 2 — Newbury site preparation.',
      },
      {
        client_id: clients[2].id,
        job_id: jobs[2].id,
        subtotal: 14400,
        vat_amount: 2880,
        total_amount: 17280,
        status: 'sent',
        due_date: daysFrom(-40),
        notes: 'Swindon depot drainage works. Awaiting council purchase order reference.',
      },
      {
        client_id: clients[1].id,
        job_id: jobs[1].id,
        subtotal: 12800,
        vat_amount: 2560,
        total_amount: 15360,
        status: 'draft',
        due_date: daysFrom(30),
      },
    ];

    for (const row of invoiceRows) {
      const invoice_number = await nextNumber('generate_invoice_number');
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert({ ...row, company_id: companyId, invoice_number });
      if (invoiceError) throw invoiceError;
    }
    console.log(`✅ Created ${invoiceRows.length} invoices (paid / sent / overdue / draft)`);

    console.log('📄 Seeding documents...');
    const { error: documentsError } = await supabase.from('documents').insert([
      {
        company_id: companyId,
        name: 'Public Liability Insurance',
        type: 'insurance',
        related_to: 'company',
        expiry_date: daysFrom(200),
      },
      {
        company_id: companyId,
        name: 'Employers Liability Insurance',
        type: 'insurance',
        related_to: 'company',
        expiry_date: daysFrom(20),
      },
      {
        company_id: companyId,
        name: 'Waste Carrier Licence',
        type: 'permit',
        related_to: 'company',
        expiry_date: daysFrom(-10),
      },
      {
        company_id: companyId,
        name: 'CSCS Card - Mike Johnson',
        type: 'cscs',
        related_to: 'subcontractor',
        related_id: subcontractors[0].id,
        expiry_date: daysFrom(300),
      },
      {
        company_id: companyId,
        name: 'RAMS Document - Newbury',
        type: 'rams',
        related_to: 'job',
        related_id: jobs[0].id,
        expiry_date: daysFrom(60),
      },
    ]);

    if (documentsError) throw documentsError;
    console.log('✅ Created 5 documents (valid / expiring soon / expired)');

    console.log('📅 Seeding schedule entries...');
    const { error: scheduleError } = await supabase.from('schedule_entries').insert([
      {
        company_id: companyId,
        job_id: jobs[0].id,
        title: 'Site Preparation',
        description: 'Begin site clearance and setup',
        start_datetime: atHour(0, 8),
        end_datetime: atHour(0, 17),
        crew_count: 4,
        plant_assigned: 'Excavator',
        notes: 'Weather dependent',
      },
      {
        company_id: companyId,
        job_id: jobs[1].id,
        title: 'Concrete Pour',
        description: 'Foundation concrete pour',
        start_datetime: atHour(1, 8),
        end_datetime: atHour(1, 12),
        crew_count: 3,
        notes: 'Ensure concrete truck arrives on time',
      },
      {
        company_id: companyId,
        job_id: jobs[1].id,
        title: 'Drainage Run — Phase 2',
        description: 'Lay 40m of 150mm drainage with inspection chambers',
        start_datetime: atHour(3, 8),
        end_datetime: atHour(3, 16),
        crew_count: 3,
        plant_assigned: 'Dumper',
      },
    ]);

    if (scheduleError) throw scheduleError;
    console.log('✅ Created 3 schedule entries');

    console.log('🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
