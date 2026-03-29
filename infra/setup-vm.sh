#!/bin/bash
# infra/setup-vm.sh
# Run once on your Ubuntu VM (192.168.1.50) to set up:
# - Docker (if not already installed)
# - GitHub Actions self-hosted runner
# - SSL cert (self-signed for local use)
# - Directory structure

set -e
echo "=== Nexo Commodities — VM Setup ==="

# ── 1. Docker ─────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

# ── 2. Docker Compose Plugin ──────────────────────────
if ! docker compose version &> /dev/null; then
  sudo apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed"
fi

# ── 3. GitHub Actions Runner ──────────────────────────
echo ""
echo "=== GitHub Actions Runner Setup ==="
echo "Go to: https://github.com/YOUR_ORG/nexo-commodities/settings/actions/runners"
echo "Click 'New self-hosted runner' → Linux → copy the token"
echo ""
read -p "Paste your runner token here: " RUNNER_TOKEN
read -p "Your GitHub repo URL (e.g. https://github.com/sven/nexo): " REPO_URL

mkdir -p ~/actions-runner && cd ~/actions-runner

# Download latest runner
RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep tag_name | cut -d'"' -f4 | sed 's/v//')
curl -sO "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
tar xzf "actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

# Configure
./config.sh --url "$REPO_URL" --token "$RUNNER_TOKEN" --name "nexo-vm" --labels "self-hosted,nexo,ubuntu" --unattended

# Install as systemd service (auto-start on boot)
sudo ./svc.sh install
sudo ./svc.sh start
echo "✅ GitHub Actions runner installed and running"

# ── 4. Project directories ───────────────────────────
echo ""
echo "=== Creating project directories ==="
sudo mkdir -p /opt/nexo/{models,ssl,logs}
sudo chown -R $USER:$USER /opt/nexo
echo "✅ Directories created at /opt/nexo"

# ── 5. Self-signed SSL cert (for local dev) ──────────
if [ ! -f /opt/nexo/ssl/cert.pem ]; then
  echo "Generating self-signed SSL cert..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /opt/nexo/ssl/key.pem \
    -out    /opt/nexo/ssl/cert.pem \
    -subj   "/CN=nexo-local/O=Nexo/C=CH"
  echo "✅ SSL cert generated at /opt/nexo/ssl/"
  echo "   For production: replace with Let's Encrypt (certbot)"
fi

# ── 6. GitHub Container Registry login ───────────────
echo ""
echo "=== GHCR Login ==="
echo "Create a GitHub PAT with 'read:packages' scope at:"
echo "https://github.com/settings/tokens"
read -p "GitHub username: " GH_USER
read -sp "GitHub PAT token: " GH_TOKEN
echo ""
echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin
echo "✅ Logged in to GHCR"

# ── 7. .env file for docker compose ──────────────────
if [ ! -f /opt/nexo/.env ]; then
  cat > /opt/nexo/.env << 'ENVEOF'
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_REPOSITORY_OWNER=your-github-username
IMAGE_TAG=main
ENVEOF
  echo "✅ .env template created at /opt/nexo/.env"
  echo "   → Fill in your secrets!"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Fill in /opt/nexo/.env with your real secrets"
echo "  2. Add secrets to GitHub repo Settings → Secrets:"
echo "     SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY"
echo "     PROD_API_URL=https://your-vm-ip:8000"
echo "     PROD_WS_URL=wss://your-vm-ip:8000"
echo "  3. Push to main branch → pipeline runs automatically"
echo "  4. Check runner: sudo systemctl status actions.runner.*"
