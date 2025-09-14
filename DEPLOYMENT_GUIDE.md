# 🚀 Google Cloud Deployment Guide

## Prerequisites

1. **Google Cloud CLI** installed and authenticated
2. **GROQ API Key** for the RAG system
3. **Google Cloud Project** with billing enabled

## Step 1: Install Google Cloud CLI

Download and install from: https://cloud.google.com/sdk/docs/install

## Step 2: Authenticate

```bash
gcloud auth login
gcloud config set project plexiform-shine-471813-e5
```

## Step 3: Get GROQ API Key

1. Go to: https://console.groq.com/keys
2. Create a new API key
3. Copy the key (starts with `gsk_`)

## Step 4: Update API Key

Edit `cloudbuild.yaml` and replace:
```yaml
- 'GROQ_API_KEY=gsk_your_groq_api_key_here'
```

With your actual GROQ API key:
```yaml
- 'GROQ_API_KEY=gsk_your_actual_groq_api_key_here'
```

## Step 5: Deploy

### Option A: Using the deployment script (Recommended)
```bash
# Windows Command Prompt
deploy-to-google-cloud.bat

# Windows PowerShell
.\deploy-to-google-cloud.ps1
```

### Option B: Manual deployment
```bash
gcloud builds submit --config cloudbuild.yaml
```

## Step 6: Access Your App

After deployment, you'll get a URL like:
```
https://soa-whatsapp-bot-xxxxx-uc.a.run.app
```

## Configuration

The deployment includes:
- ✅ **Enhanced RAG System** (enabled)
- ✅ **Google Cloud STT/TTS** (configured)
- ✅ **Voice Pipeline** (STT → RAG → LLM → TTS)
- ✅ **4GB RAM, 2 CPU cores**
- ✅ **Auto-scaling up to 10 instances**

## Troubleshooting

### If deployment fails:
1. Check your GROQ API key is valid
2. Ensure billing is enabled on your Google Cloud project
3. Check the build logs: `gcloud builds log [BUILD_ID]`

### If RAG is not working:
1. Verify GROQ_API_KEY is set correctly
2. Check the service logs: `gcloud run services logs read soa-whatsapp-bot --region=us-central1`

### If voice is not working:
1. Check browser console for errors
2. Ensure you're using HTTPS (required for microphone access)
3. Check the `/api/voice/config` endpoint

## Environment Variables

The following are automatically set during deployment:
- `NODE_ENV=production`
- `GOOGLE_CLOUD_PROJECT_ID=plexiform-shine-471813-e5`
- `GOOGLE_CLOUD_CLIENT_EMAIL=voice-agent@plexiform-shine-471813-e5.iam.gserviceaccount.com`
- `GROQ_API_KEY=your_groq_api_key_here`
- `ONNX_DISABLE_WASM=1`
- `ONNX_DISABLE_CPU_FEATURES=1`

## Cost Estimation

- **Cloud Run**: ~$0.10-0.50 per day (depending on usage)
- **Cloud Build**: ~$0.01 per build
- **Container Registry**: ~$0.01 per day
- **Total**: ~$0.12-0.52 per day

## Support

If you encounter issues:
1. Check the deployment logs
2. Verify all environment variables are set
3. Test the RAG system locally first
4. Check Google Cloud Console for service status
