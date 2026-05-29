import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    console.log('🗑️  Clearing existing data...');
    await supabase.from('job_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('schedule_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('quote_line_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('quotes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('subcontractors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('👥 Seeding clients...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .insert([
        {
          company_name: 'Barrett Homes',
          contact_name: 'John Smith',
          email: 'john@barretthomes.co.uk',
          phone: '01234 567890',
          address: '12 Business Park, Reading RG1 2LP',
          companies_house_number: '01234567',
          notes: 'Preferred client. Priority service on all jobs.',
        },
        {
          company_name: 'Weston Homes',
          contact_name: 'Sarah Jones',
          email: 'sarah@westonhomes.co.uk',
          phone: '01865 432100',
          address: '45 High Street, Oxford OX1 1AA',
          companies_house_number: '09876543',
          notes: 'Large volume client. Good payment history.',
        },
        {
          company_name: 'Local Council',
          contact_name: 'David Brown',
          email: 'd.brown@localcouncil.gov.uk',
          phone: '01793 654321',
          address: 'Council Offices, Swindon SN1 1AB',
          notes: 'Government client. Requires purchase orders.',
        },
        {
          company_name: 'Bloor Homes',
          contact_name: 'Emma Wilson',
          email: 'emma@bloorhomes.co.uk',
          phone: '01684 987654',
          address: '78 Industrial Estate, Worcester WR1 2YZ',
          companies_house_number: '02468135',
        },
        {
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
          company_name: 'ABC Excavations Ltd',
          contact_name: 'Mike Johnson',
          email: 'mike@abcexcavations.co.uk',
          phone: '07700 900123',
          trade: 'Excavation',
          cis_status: 'verified',
          utr_number: '12345678901',
          notes: 'Primary excavation subcontractor. Very reliable.',
        },
        {
          company_name: 'XYZ Drainage Co',
          contact_name: 'Sarah Brown',
          email: 'sarah@xyzdrainage.co.uk',
          phone: '07700 900456',
          trade: 'Drainage',
          cis_status: 'unverified',
          utr_number: '98765432109',
        },
        {
          company_name: 'Quick Concrete Services',
          contact_name: 'Tom Wilson',
          email: 'tom@quickconcrete.co.uk',
          phone: '07700 900789',
          trade: 'Concrete',
          cis_status: 'gross',
          utr_number: '56789123456',
          notes: 'Specialist in large pours.',
        },
        {
          company_name: 'Professional Kerbing',
          contact_name: 'Lisa Davis',
          email: 'lisa@profkerb.co.uk',
          phone: '07700 900321',
          trade: 'Kerbing',
          cis_status: 'verified',
          utr_number: '24681357912',
        },
      ])
      .select();

    if (subcontractorsError) throw subcontractorsError;
    console.log(`✅ Created ${subcontractors.length} subcontractors`);

    console.log('📋 Seeding jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .insert([
        {
          client_id: clients[0].id,
          title: 'Newbury Site Preparation',
          description: 'Full site preparation including excavation, drainage installation, and groundworks for a new residential development.',
          site_address: 'Newbury Business Park, RG14 2LP',
          status: 'active',
          type: 'Foundations',
          value: 45000,
          progress_percent: 65,
          start_date: '2024-01-15',
          end_date: '2024-03-30',
        },
        {
          client_id: clients[1].id,
          title: 'Reading Retail Development',
          description: 'Excavation and groundworks for new retail complex.',
          site_address: 'Reading Town Centre, RG1 7LG',
          status: 'active',
          type: 'Excavation',
          value: 32000,
          progress_percent: 40,
          start_date: '2024-01-20',
          end_date: '2024-04-15',
        },
        {
          client_id: clients[2].id,
          title: 'Swindon Depot Upgrade',
          description: 'Drainage improvements and resurfacing work at council depot.',
          site_address: 'Swindon Industrial Estate, SN1 4LZ',
          status: 'on-hold',
          type: 'Drainage',
          value: 18000,
          progress_percent: 80,
          start_date: '2023-12-01',
        },
        {
          client_id: clients[3].id,
          title: 'Oxford Housing Development',
          description: 'Kerbing and footway work for new housing estate.',
          site_address: 'Oxford Business Park, OX4 2JZ',
          status: 'complete',
          type: 'Kerbing',
          value: 25000,
          progress_percent: 100,
          start_date: '2023-11-01',
          end_date: '2024-01-31',
        },
        {
          client_id: clients[4].id,
          title: 'Bristol Office Block',
          description: 'Foundation and drainage work for commercial office development.',
          site_address: 'Bristol Harbour, BS1 6AH',
          status: 'quoted',
          type: 'Foundations',
          value: 85000,
          progress_percent: 0,
        },
      ])
      .select();

    if (jobsError) throw jobsError;
    console.log(`✅ Created ${jobs.length} jobs`);

    console.log('📝 Adding job history...');
    for (const job of jobs) {
      await supabase.from('job_history').insert([
        { job_id: job.id, status: 'enquiry', notes: 'Initial enquiry received' },
        { job_id: job.id, status: 'quoted', notes: 'Quote sent to client' },
        { job_id: job.id, status: job.status, notes: 'Status updated' },
      ]);
    }
    console.log(`✅ Added history for ${jobs.length} jobs`);

    console.log('💰 Seeding quotes...');
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .insert([
        {
          client_id: clients[0].id,
          title: 'Newbury Site Preparation',
          status: 'sent',
          subtotal: 37500,
          vat_amount: 7500,
          total_amount: 45000,
          notes: 'Price valid for 30 days.',
          sent_at: new Date().toISOString(),
        },
        {
          client_id: clients[1].id,
          title: 'Reading Excavation',
          status: 'draft',
          subtotal: 26666.67,
          vat_amount: 5333.33,
          total_amount: 32000,
        },
        {
          client_id: clients[3].id,
          title: 'Oxford Foundations',
          status: 'accepted',
          subtotal: 48333.33,
          vat_amount: 9666.67,
          total_amount: 58000,
          sent_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        },
      ])
      .select();

    if (quotesError) throw quotesError;

    const quoteLineItems = [
      { quote_id: quotes[0].id, description: 'Site clearance and preparation', quantity: 1, unit_price: 5000, total: 5000 },
      { quote_id: quotes[0].id, description: 'Excavation works', quantity: 1, unit_price: 12000, total: 12000 },
      { quote_id: quotes[0].id, description: 'Drainage installation', quantity: 1, unit_price: 8000, total: 8000 },
      { quote_id: quotes[0].id, description: 'Foundation concrete pour', quantity: 1, unit_price: 8500, total: 8500 },
      { quote_id: quotes[0].id, description: 'Backfill and compaction', quantity: 1, unit_price: 4000, total: 4000 },
      { quote_id: quotes[1].id, description: 'Bulk excavation', quantity: 1, unit_price: 15000, total: 15000 },
      { quote_id: quotes[1].id, description: 'Site levelling', quantity: 1, unit_price: 5000, total: 5000 },
      { quote_id: quotes[1].id, description: 'Disposal of spoil', quantity: 1, unit_price: 6666.67, total: 6666.67 },
      { quote_id: quotes[2].id, description: 'Foundation trenches', quantity: 1, unit_price: 20000, total: 20000 },
      { quote_id: quotes[2].id, description: 'Concrete fill', quantity: 1, unit_price: 15000, total: 15000 },
      { quote_id: quotes[2].id, description: 'Steel reinforcement', quantity: 1, unit_price: 8000, total: 8000 },
      { quote_id: quotes[2].id, description: 'Damp proof membrane', quantity: 1, unit_price: 5333.33, total: 5333.33 },
    ];

    await supabase.from('quote_line_items').insert(quoteLineItems);
    console.log(`✅ Created ${quotes.length} quotes with line items`);

    console.log('📄 Seeding documents...');
    const { error: documentsError } = await supabase.from('documents').insert([
      {
        name: 'Public Liability Insurance',
        type: 'insurance',
        related_type: 'company',
        expiry_date: '2024-12-31',
        notes: '£5M coverage',
      },
      {
        name: 'Employers Liability Insurance',
        type: 'insurance',
        related_type: 'company',
        expiry_date: '2024-06-30',
        notes: '£10M coverage',
      },
      {
        name: 'CIS Certificate',
        type: 'cis',
        related_type: 'company',
        expiry_date: '2025-03-15',
      },
      {
        name: 'CSCS Card - John Smith',
        type: 'cscs',
        related_type: 'subcontractor',
        related_id: subcontractors[0].id,
        expiry_date: '2025-06-01',
      },
      {
        name: 'RAMS Document - Newbury',
        type: 'rams',
        related_type: 'job',
        related_id: jobs[0].id,
        expiry_date: '2024-08-01',
      },
    ]);

    if (documentsError) throw documentsError;
    console.log('✅ Created 5 documents');

    console.log('📅 Seeding schedule entries...');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { error: scheduleError } = await supabase.from('schedule_entries').insert([
      {
        job_id: jobs[0].id,
        title: 'Site Preparation',
        description: 'Begin site clearance and setup',
        start_datetime: new Date(today.setHours(8, 0, 0, 0)).toISOString(),
        end_datetime: new Date(today.setHours(17, 0, 0, 0)).toISOString(),
        crew_count: 4,
        plant_assigned: 'Excavator',
        notes: 'Weather dependent',
      },
      {
        job_id: jobs[1].id,
        title: 'Concrete Pour',
        description: 'Foundation concrete pour',
        start_datetime: new Date(tomorrow.setHours(8, 0, 0, 0)).toISOString(),
        end_datetime: new Date(tomorrow.setHours(12, 0, 0, 0)).toISOString(),
        crew_count: 3,
        notes: 'Ensure concrete truck arrives on time',
      },
    ]);

    if (scheduleError) throw scheduleError;
    console.log('✅ Created 2 schedule entries');

    console.log('🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
