# GroundworkOS Deployment Guide

## Prerequisites (both options)

- Supabase project created and schema applied (see below)
- Mistral AI API key

---

## Option A: Vercel (Recommended — 5 minutes)

The MCP servers are imported as TypeScript modules inside the Next.js API route — they are **not separate processes**. The entire app is a standard Next.js project and deploys to Vercel with zero infrastructure to manage.

### Steps

1. Push your branch to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Set **Root Directory** to `groundworkos`
4. Add environment variables in the Vercel dashboard:

   | Variable | Where to get it |
   |----------|----------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API Keys |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API Keys |
   | `SUPABASE_SECRET_KEY` | Supabase → Settings → API Keys |
   | `MISTRAL_API_KEY` | console.mistral.ai → API Keys |

5. Click **Deploy**. Vercel handles SSL, CDN, and auto-deploys on every push to main.

### Update Supabase Auth settings

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

### Apply the database schema

In Supabase Dashboard → SQL Editor, run the contents of `database/schema.sql`.

That's it. The app is live.

---

## Option B: Oracle Cloud Free Tier (Self-hosted)

This guide covers deploying GroundworkOS to Oracle Cloud Free Tier.

### Prerequisites

- Oracle Cloud Free Tier account (always free, no expiry)
- SSH key for server access
- Supabase project created
- Mistral AI API key

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Oracle Cloud Free Tier            │
│                                             │
│  ┌─────────────┐    ┌─────────────────────┐ │
│  │   VM #1     │    │      VM #2          │ │
│  │             │    │                     │ │
│  │ ┌─────────┐ │    │ ┌─────────────────┐ │ │
│  │ │Next.js  │ │    │ │ MCP Servers     │ │ │
│  │ │Frontend │ │    │ │ (8 x Node.js)   │ │ │
│  │ │:3000    │ │    │ │ :3001 - :3008   │ │ │
│  │ └────┬────┘ │    │ └────────┬────────┘ │ │
│  │      │      │    │          │          │ │
│  │      └──────┼────┴──────────┘          │ │
│  │             │                          │ │
│  │    Nginx    │                          │ │
│  │  (SSL/443)  │                          │ │
│  └─────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────┘
         │
         ▼
   Supabase (Cloud)
   Mistral AI (Cloud)
```

## Step 1: Create Oracle Cloud Free Tier VMs

### 1.1 Create Your First VM (Frontend)

1. Log in to [Oracle Cloud](https://cloud.oracle.com)
2. Go to **Compute** → **Instances**
3. Click **Create Instance**
4. Configure:
   - **Name**: `groundworkos-frontend`
   - **Operating System**: Ubuntu 22.04 LTS
   - **Shape**: `VM.Standard.E2.1.Micro` (Always Free)
   - **Networking**: Create new VCN or use default
   - **Add SSH Keys**: Upload your public SSH key
5. Note the public IP address

### 1.2 Create Your Second VM (MCP Servers)

1. Repeat steps above
2. **Name**: `groundworkos-mcp`
3. Note the private IP address (for MCP servers to communicate)

## Step 2: Set Up Ubuntu VMs

SSH into each VM and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

## Step 3: Deploy Next.js Frontend

### On your local machine

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/groundworkos.git
cd groundworkos

# SSH copy the entire project to VM1
scp -r . ubuntu@YOUR_VM1_IP:/home/ubuntu/groundworkos
```

### On VM1 (Frontend Server)

```bash
cd /home/ubuntu/groundworkos

# Install dependencies
npm install

# Create environment file
nano .env.production
```

Add these environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-service-role-key

# Mistral AI
MISTRAL_API_KEY=your-mistral-api-key

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Build and test

```bash
# Build the application
npm run build

# Test it runs
npm start

# If it works, kill it (Ctrl+C) and start with PM2
pm2 start npm --name "groundworkos" -- start

# Make it start on reboot
pm2 startup
pm2 save
```

## Step 4: Deploy MCP Servers

### On VM2 (MCP Server)

```bash
cd /home/ubuntu

# Clone MCP servers repository
git clone https://github.com/YOUR_USERNAME/groundworkos-mcp.git
cd groundworkos-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create environment file
nano .env
```

Add:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
PORT=3001
```

### Create startup script

```bash
# Create start script
nano start-mcp-servers.sh
```

```bash
#!/bin/bash
cd /home/ubuntu/groundworkos-mcp

# Start all MCP servers on different ports
pm2 start dist/servers/clients-mcp/index.js --name "mcp-clients" --watch
pm2 start dist/servers/jobs-mcp/index.js --name "mcp-jobs" --watch
pm2 start dist/servers/quotes-mcp/index.js --name "mcp-quotes" --watch
pm2 start dist/servers/invoices-mcp/index.js --name "mcp-invoices" --watch
pm2 start dist/servers/subcon-mcp/index.js --name "mcp-subcon" --watch
pm2 start dist/servers/schedule-mcp/index.js --name "mcp-schedule" --watch
pm2 start dist/servers/compliance-mcp/index.js --name "mcp-compliance" --watch
pm2 start dist/servers/reporting-mcp/index.js --name "mcp-reporting" --watch

pm2 save
```

```bash
chmod +x start-mcp-servers.sh
./start-mcp-servers.sh

# Verify all servers running
pm2 list
```

## Step 5: Configure Nginx Reverse Proxy

### On VM1 (Frontend)

```bash
sudo nano /etc/nginx/sites-available/groundworkos
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # MCP Servers API (if using HTTP mode)
    location /api/ {
        proxy_pass http://VM2_PRIVATE_IP:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/groundworkos /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 6: Set Up SSL Certificate

```bash
# Install Certbot
sudo certbot --nginx -d yourdomain.com

# Follow prompts
# Certbot will automatically configure SSL

# Auto-renewal (should be automatic, but test it)
sudo certbot renew --dry-run
```

## Step 7: Configure Supabase

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Update **Site URL** to: `https://yourdomain.com`
3. Add to **Redirect URLs**:
   ```
   https://yourdomain.com/auth/callback
   https://yourdomain.com/*
   ```

4. Run database schema (skip if already done in Step 1):
   - Go to **SQL Editor**
   - Paste contents of `database/schema.sql`
   - Execute
   - For an existing database, run the scripts in `database/migrations/` instead

## Step 8: Set Up Custom Domain (Optional)

### In Oracle Cloud Console

1. Go to **Networking** → **DNS Management**
2. Add your domain
3. Create A record pointing to VM1 public IP
4. Create CNAME for www

### Update DNS

Add these records at your domain registrar:

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_VM1_PUBLIC_IP |
| CNAME | www | yourdomain.com |

Wait 5-30 minutes for DNS propagation.

## Step 9: Verify Deployment

1. Visit `https://yourdomain.com`
2. Test login/signup
3. Verify AI assistant works
4. Test creating a job
5. Check PM2 logs: `pm2 logs`

## Maintenance

### Updating the Application

**Frontend (VM1):**
```bash
cd /home/ubuntu/groundworkos
git pull origin main
npm install
npm run build
pm2 restart groundworkos
```

**MCP Servers (VM2):**
```bash
cd /home/ubuntu/groundworkos-mcp
git pull origin main
npm install
npm run build
pm2 restart all
```

### Monitoring

```bash
# Check all services
pm2 list

# View logs
pm2 logs --lines 50

# Monitor resources
htop
```

### Backups

- Supabase handles database backups automatically
- Consider taking VM snapshots monthly
- Keep your code in GitHub (already done)

## Troubleshooting

### Services not starting

```bash
# Check logs
pm2 logs

# Check if port is in use
sudo lsof -i :3000

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal if needed
sudo certbot renew
```

### Database connection issues

- Verify SUPABASE_SECRET_KEY is correct
- Check Supabase dashboard for any outages
- Verify your IP is not blocked

### MCP servers not responding

```bash
# On VM2, check if servers are running
pm2 list

# Restart all MCP servers
pm2 restart all

# Check individual server logs
pm2 logs mcp-clients
```

## Security Checklist

- [ ] Ubuntu firewall enabled (ufw)
- [ ] Only required ports open (22, 80, 443)
- [ ] SSH key authentication (no password login)
- [ ] Fail2ban installed
- [ ] SSL certificate active
- [ ] Environment variables set (no secrets in code)
- [ ] Supabase RLS policies enabled
- [ ] Regular system updates: `sudo apt update && sudo apt upgrade`

## Security Hardening

```bash
# Enable firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Install fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

## Free Forever Guarantee

Oracle Cloud Free Tier includes:
- 2 VMs (1GB RAM each) - NEVER expire
- 50GB Block Storage
- Unlimited bandwidth
- No credit card required after signup

Your app will run 24/7, forever, for £0.

---

Last updated: 2026-05-29
