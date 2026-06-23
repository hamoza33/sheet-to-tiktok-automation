# VPS Deployment Guide

This document explains how to deploy the sheet-to-tiktok-automation project to your VPS.

## Option 1: GitHub Actions (Recommended - Automatic)

GitHub Actions will automatically deploy to your VPS whenever you push to the `main` or `deploy-project-to-vps` branch.

### Setup Instructions

1. **Add VPS credentials as GitHub Secrets:**
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Add these 3 secrets:
     - `VPS_HOST`: Your VPS IP (e.g., `35.255.81.115`)
     - `VPS_USER`: Your VPS username (e.g., `aichaguimaoune`)
     - `VPS_PASSWORD`: Your VPS password

2. **First-time VPS setup:**
   ```bash
   ssh aichaguimaoune@35.255.81.115
   
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   sudo apt install -y docker-compose
   
   # Clone the repository
   cd ~
   git clone https://github.com/hamoza33/sheet-to-tiktok-automation.git
   cd sheet-to-tiktok-automation
   
   # Create .env file with your credentials
   nano .env
   # Add your environment variables:
   # SHEET_ID=your-sheet-id
   # BUFFER_ACCESS_TOKEN=your-token
   # BUFFER_TIKTOK_PROFILE_ID=your-profile-id
   
   # Create credentials directory and add service account JSON
   mkdir -p credentials
   # Copy your service-account.json to credentials/
   ```

3. **Deploy:**
   - Push code to GitHub → GitHub Actions automatically deploys!
   - Watch deployment in GitHub Actions tab

## Option 2: Manual Script Deployment (Use locally)

Use this if you prefer to deploy manually from your terminal.

### Setup Instructions

1. **First-time VPS setup (same as Option 1):**
   - Install Docker
   - Clone repository
   - Create `.env` file
   - Add credentials

2. **Deploy using the script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh 35.255.81.115 aichaguimaoune
   ```

   The script will:
   - Push your code to GitHub
   - SSH into your VPS
   - Pull the latest code
   - Stop old containers
   - Start new containers with Docker Compose

## Option 3: Manual SSH Deployment (Direct commands)

SSH into your VPS and run:

```bash
ssh aichaguimaoune@35.255.81.115

cd ~/sheet-to-tiktok-automation
git pull origin main
docker-compose down
docker-compose up -d
docker-compose logs -f automation
```

## Monitoring Your Deployment

### Check container status:
```bash
docker-compose ps
```

### View logs:
```bash
docker-compose logs -f automation
```

### Stop the service:
```bash
docker-compose down
```

### Restart the service:
```bash
docker-compose restart
```

## Troubleshooting

### Docker not found
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
```

### Permission denied (publickey,password)
- Update `VPS_PASSWORD` secret in GitHub
- Or use SSH keys instead of passwords for better security

### Container won't start
```bash
# Check logs
docker-compose logs automation

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Out of disk space
```bash
# Clean up Docker
docker system prune -a
```

## Environment Variables

Create a `.env` file on your VPS with:

```
SHEET_ID=your-google-sheet-id
BUFFER_ACCESS_TOKEN=your-buffer-api-token
BUFFER_TIKTOK_PROFILE_ID=your-tiktok-profile-id
PORT=3000
```

## Security Best Practices

- ✅ Use GitHub Secrets for credentials (Option 1)
- ✅ Don't commit `.env` files
- ✅ Use SSH keys instead of passwords (recommended)
- ✅ Regularly update Docker and dependencies
- ❌ Never share VPS credentials in chat/email
