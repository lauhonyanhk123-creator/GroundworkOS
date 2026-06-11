# GroundworkOS — Setup & Deployment Guide

This guide walks you through setting up GroundworkOS from scratch on a fresh server. Follow every step in order.

---

## Prerequisites — Accounts to Create

| Service | URL | Cost | What it's used for |
|---------|-----|------|--------------------|
| Supabase | supabase.com | Free | Database, authentication, file storage |
| Mistral AI | console.mistral.ai | Free | AI assistant (48 tools) |
| SendGrid | sendgrid.com | Free (100 emails/day) | Send invoices and quotes by email |
| Oracle Cloud | cloud.oracle.com | Free (Always Free VM) | Hosting the application |

---

## Step 1 — Supabase Setup

### 1.1 Create a project
1. Sign in to [supabase.com](https://supabase.com)
2. Click **New project**
3. Choose a name (e.g. `groundworkos`), set a strong database password, pick the closest region
4. Wait for the project to finish provisioning (~2 minutes)

### 1.2 Get your API keys
1. Go to **Settings → API**
2. Copy these three values — you'll need them later:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable (anon) key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** → `SUPABASE_SECRET_KEY`

### 1.3 Run the database schema
1. Go to **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `database/schema.sql` from the GroundworkOS repository
4. Paste the entire contents into the editor
5. Click **Run** — all tables, functions, and RLS policies will be created

### 1.4 Enable Email authentication
1. Go to **Authentication → Providers**
2. Ensure **Email** is enabled (it is by default)
3. Under **Email → Confirm email**, you can disable email confirmation for internal users if preferred

### 1.5 Create the storage bucket
1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name it exactly: `groundworkos-documents`
4. Leave **Public bucket** toggled **off** (private — files require signed URLs)
5. Click **Save**

### 1.6 Create the first user (your client's login)
1. Go to **Authentication → Users**
2. Click **Invite user**
3. Enter the client's email address
4. They will receive an email to set their password
5. On first sign-in they are taken to **/onboarding** to create their company
   (or an existing company admin can add them from **Settings → Team**)

### 1.7 (Optional) Seed demo data
1. Add `SEED_USER_EMAIL=you@example.com` to `.env.local` (an already-registered user)
2. Run `npm run seed` from the `groundworkos/` directory
3. This creates a **Demo Groundworks Ltd** company with clients, jobs, quotes,
   invoices, documents, and schedule entries, and links the seed user as its admin.
   Re-running the seed wipes and recreates only this demo company.

---

## Step 2 — Mistral AI Setup

1. Sign in to [console.mistral.ai](https://console.mistral.ai)
2. Go to **API Keys** in the left sidebar
3. Click **Create new key**
4. Copy the key → `MISTRAL_API_KEY`

**Important for production:** Go to **Admin Console → Privacy** and opt out of data used for model training. By default, Mistral may use API request content to improve their models. Since this CRM contains real business data (client names, invoice amounts), disable this before going live.

---

## Step 3 — SendGrid Setup

1. Sign up at [sendgrid.com](https://sendgrid.com) (free — 100 emails/day)
2. **Verify your sender email:**
   - Go to **Settings → Sender Authentication**
   - Choose **Single Sender Verification** (quickest) or **Domain Authentication** (recommended for production)
   - Complete the verification for the email address you want invoices to come from (e.g. `invoices@yourdomain.com`)
3. **Create an API key:**
   - Go to **Settings → API Keys**
   - Click **Create API key**
   - Name it `GroundworkOS`
   - Select **Restricted Access → Mail Send → Full Access**
   - Copy the key → `SENDGRID_API_KEY`
4. Note the verified sender email → `SENDGRID_FROM_EMAIL`

---

## Step 4 — Oracle Cloud VM Setup

### 4.1 Create a VM instance
1. Sign in to [cloud.oracle.com](https://cloud.oracle.com)
2. Go to **Compute → Instances → Create instance**
3. Choose **Always Free** eligible shape (Ampere A1 or VM.Standard.E2.1.Micro)
4. Select **Ubuntu 22.04** as the OS image
5. Generate or upload an SSH key pair — save the private key
6. Click **Create**

### 4.2 Open firewall ports
1. In the Oracle Console, go to your instance → **Subnet → Security List**
2. Add two **Ingress Rules**:
   - Port 80 (HTTP) — source `0.0.0.0/0`, protocol TCP
   - Port 443 (HTTPS) — source `0.0.0.0/0`, protocol TCP
3. Also open the Ubuntu firewall on the VM itself:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

### 4.3 Install Docker and Docker Compose
SSH into your VM and run:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add your user to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 4.4 Point your domain to the VM
In your domain registrar's DNS settings, add an **A record**:
- Name: `@` (or your subdomain, e.g. `crm`)
- Value: your Oracle VM's public IP address
- TTL: 300

Wait for DNS to propagate (usually 5–30 minutes) before deploying.

---

## Step 5 — Clone and Configure the Repository

SSH into your Oracle VM:

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/groundworkos.git /opt/groundworkos
cd /opt/groundworkos
```

Create your production environment file:
```bash
cp .env.production.example .env.production
nano .env.production
```

Fill in all values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
MISTRAL_API_KEY=your-mistral-api-key
SENDGRID_API_KEY=SG.your-sendgrid-key
SENDGRID_FROM_EMAIL=invoices@yourdomain.com
ADMIN_EMAIL=your-email@example.com
```

Update the Nginx config with your domain:
```bash
nano nginx/nginx.conf
```
Replace the placeholder domain with your real domain name (appears in the `server_name` directive).

---

## Step 6 — Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

The deploy script will:
1. Validate that `.env.production` exists
2. Obtain an SSL certificate from Let's Encrypt using your domain
3. Build the Next.js Docker image
4. Start all services (Next.js app, Nginx, Certbot auto-renewal)

This takes 3–5 minutes on first run.

---

## Step 7 — Post-Deploy Verification Checklist

Work through each item to confirm everything is working:

- [ ] Visit `https://yourdomain.com` — login page loads with no browser warnings
- [ ] Log in with the user created in Step 1.6
- [ ] Create a test client (Clients → New Client)
- [ ] Create a test job linked to that client (Jobs → New Job)
- [ ] Create a test invoice for that client with a real email address on file (Invoices → New Invoice → Send Invoice)
- [ ] Check that the invoice email arrives in the inbox with correct amounts and due date
- [ ] Create a test quote with line items and click Send Quote — confirm email arrives
- [ ] Upload a test document (Documents → Upload Document → attach a PDF file)
- [ ] Click **View** on the uploaded document — confirm the file opens
- [ ] Open the AI assistant chat and ask "How many active jobs do I have?" — confirm it responds with real data
- [ ] Check Supabase Storage → `groundworkos-documents` bucket — confirm the uploaded file appears

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key (safe for client-side) |
| `SUPABASE_SECRET_KEY` | Yes | Supabase secret key (server-side only — never expose) |
| `MISTRAL_API_KEY` | Yes | Mistral AI API key for the AI assistant |
| `SENDGRID_API_KEY` | Yes | SendGrid API key for email sending |
| `SENDGRID_FROM_EMAIL` | Yes | Verified sender email address for outgoing emails |
| `ADMIN_EMAIL` | Yes | Your email — used by Certbot for SSL certificate registration |

---

## Updating the Application

To deploy a new version:
```bash
cd /opt/groundworkos
git pull origin main
./deploy.sh
```

The script rebuilds the Docker image and restarts services with zero-downtime rollover.

---

## Troubleshooting

**Login page doesn't load / SSL error:**
- Check DNS has propagated: `dig yourdomain.com +short`
- Check Nginx logs: `docker compose logs nginx`
- Check Let's Encrypt issued a cert: `docker compose logs certbot`

**AI assistant returns errors:**
- Check `MISTRAL_API_KEY` is set correctly in `.env.production`
- Check API route logs: `docker compose logs nextjs | grep '\[ai\]'`

**Emails not sending:**
- Verify the sender email is authenticated in SendGrid
- Check `SENDGRID_API_KEY` starts with `SG.`
- Check `SENDGRID_FROM_EMAIL` exactly matches the verified sender
- Check logs: `docker compose logs nextjs | grep '\[Email\]'`

**Documents won't upload:**
- Confirm the `groundworkos-documents` bucket exists in Supabase Storage
- Confirm the bucket is **private** (not public)
- Check the Supabase Storage RLS policies were applied when you ran `schema.sql`
