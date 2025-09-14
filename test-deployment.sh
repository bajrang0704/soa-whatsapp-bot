#!/bin/bash

# Test script for Google Cloud Run deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing SOA WhatsApp Bot Deployment${NC}"
echo "============================================="

# Get service URL
SERVICE_URL=$(gcloud run services describe soa-whatsapp-bot --region=us-central1 --format='value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}❌ Could not get service URL. Is the service deployed?${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Service URL: $SERVICE_URL${NC}"

# Test health endpoint
echo -e "${BLUE}🔍 Testing health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s "$SERVICE_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test chat endpoint
echo -e "${BLUE}🔍 Testing chat endpoint...${NC}"
CHAT_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "language": "en", "sessionId": "test"}')

if echo "$CHAT_RESPONSE" | grep -q "response"; then
    echo -e "${GREEN}✅ Chat endpoint working${NC}"
    echo "Response: $CHAT_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Chat endpoint may have issues${NC}"
    echo "Response: $CHAT_RESPONSE"
fi

# Test voice endpoint (without audio file)
echo -e "${BLUE}🔍 Testing voice endpoint...${NC}"
VOICE_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/voice/process" \
  -F "language=en")

if echo "$VOICE_RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✅ Voice endpoint responding (expected error without audio)${NC}"
    echo "Response: $VOICE_RESPONSE"
else
    echo -e "${YELLOW}⚠️  Voice endpoint response unexpected${NC}"
    echo "Response: $VOICE_RESPONSE"
fi

echo -e "${GREEN}🎉 Deployment test completed!${NC}"
echo ""
echo -e "${BLUE}📋 Your service is available at:${NC}"
echo "$SERVICE_URL"
echo ""
echo -e "${BLUE}📋 Available endpoints:${NC}"
echo "- Health: $SERVICE_URL/health"
echo "- Chat: $SERVICE_URL/api/chat/message"
echo "- Voice: $SERVICE_URL/api/voice/process"
echo "- Voice Stream: $SERVICE_URL/voice-stream"
