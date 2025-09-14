#!/bin/bash

# SOA WhatsApp Bot - Google Cloud Run Deployment Script
# This script deploys the application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SOA WhatsApp Bot - Google Cloud Run Deployment${NC}"
echo "=================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  You are not authenticated with Google Cloud.${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project ID set. Please set it with:${NC}"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Project ID: $PROJECT_ID${NC}"

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy
echo -e "${BLUE}🏗️  Building and deploying to Cloud Run...${NC}"
gcloud builds submit --config cloudbuild.yaml .

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Get your service URL:"
echo "   gcloud run services describe soa-whatsapp-bot --region=us-central1 --format='value(status.url)'"
echo ""
echo "2. Set up environment variables (if needed):"
echo "   gcloud run services update soa-whatsapp-bot --region=us-central1 --set-env-vars=KEY=VALUE"
echo ""
echo "3. Monitor your service:"
echo "   gcloud run services describe soa-whatsapp-bot --region=us-central1"
echo ""
echo -e "${GREEN}🎉 Your SOA WhatsApp Bot is now running on Google Cloud Run!${NC}"
