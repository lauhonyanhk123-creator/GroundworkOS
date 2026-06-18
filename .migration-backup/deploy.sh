#!/usr/bin/env bash
# GroundworkOS — Oracle Cloud deployment script
# Run once on the VM: bash deploy.sh
# Subsequent deploys: bash deploy.sh (pulls latest and rebuilds)
set -euo pipefail

APP_DIR="/opt/groundworkos"
REPO_URL="https://github.com/lauhonyanhk123-creator/groundworkos.git"

# 1. Pull or clone
if [ -d "$APP_DIR/.git" ]; then
  echo "→ Pulling latest changes..."
  git -C "$APP_DIR" pull
else
  echo "→ Cloning repository..."
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER:$USER" "$APP_DIR"
fi

cd "$APP_DIR"

# 2. Verify secrets file exists
if [ ! -f .env.production ]; then
  echo "ERROR: .env.production not found."
  echo "Copy .env.production.example and fill in all values before deploying."
  exit 1
fi

# 3. Obtain SSL cert on first deploy (skip if cert already exists)
DOMAIN=$(grep -oP '(?<=server_name )\S+(?=;)' nginx/nginx.conf | head -1)
CERT_PATH="$APP_DIR/nginx/ssl/live/$DOMAIN/fullchain.pem"

if [ ! -f "$CERT_PATH" ]; then
  echo "→ Obtaining SSL certificate for $DOMAIN..."
  # Temporarily start nginx on port 80 only for the ACME challenge
  docker compose up -d nginx
  docker compose run --rm certbot certbot certonly \
    --webroot -w /var/www/certbot \
    -d "$DOMAIN" \
    --non-interactive --agree-tos \
    --email "$(grep ADMIN_EMAIL .env.production | cut -d= -f2)"
  docker compose stop nginx
fi

# 4. Build and start
echo "→ Building containers..."
docker compose build nextjs

echo "→ Starting all services..."
docker compose up -d

echo ""
echo "✓ Deployment complete — https://$DOMAIN"
echo "  Logs: docker compose logs -f nextjs"
