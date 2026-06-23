#!/bin/bash

# VPS Deployment Script for sheet-to-tiktok-automation
# Usage: ./deploy.sh <vps-host> <vps-user>
# Example: ./deploy.sh 35.255.81.115 aichaguimaoune

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./deploy.sh <vps-host> <vps-user>"
    echo "Example: ./deploy.sh 35.255.81.115 aichaguimaoune"
    exit 1
fi

VPS_HOST=$1
VPS_USER=$2

echo "🚀 Deploying sheet-to-tiktok-automation to $VPS_USER@$VPS_HOST"

# Push to GitHub first
echo "📤 Pushing code to GitHub..."
git push origin HEAD

# Deploy via SSH
echo "🔐 Connecting to VPS..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
  set -e
  echo "📁 Navigating to project directory..."
  cd ~/sheet-to-tiktok-automation
  
  echo "🔄 Pulling latest code..."
  git pull origin main
  
  echo "🐳 Stopping Docker containers..."
  docker-compose down || true
  
  echo "🏗️  Starting Docker containers..."
  docker-compose up -d
  
  echo "✅ Deployment complete!"
  echo "📋 Container logs:"
  docker-compose logs -f automation
EOF

echo "✨ Deployment finished!"
