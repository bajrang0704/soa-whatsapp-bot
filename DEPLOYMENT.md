# Google Cloud Run Deployment Guide

## Prerequisites

1. **Google Cloud CLI**: Install from [here](https://cloud.google.com/sdk/docs/install)
2. **Google Cloud Project**: Create a project in [Google Cloud Console](https://console.cloud.google.com/)
3. **Service Account**: Ensure you have the service account key file (`plexiform-shine-471813-e5-83fb1800e34e.json`)

## Step 1: Setup Google Cloud CLI

```bash
# Install Google Cloud CLI (if not already installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Verify configuration
gcloud config list
```

## Step 2: Enable Required APIs

```bash
# Enable required Google Cloud APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable speech.googleapis.com
gcloud services enable texttospeech.googleapis.com
```

## Step 3: Deploy to Cloud Run

### Option A: Using the deployment script (Recommended)

```bash
# Make the script executable (Linux/Mac)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

### Option B: Manual deployment

```bash
# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml .
```

## Step 4: Configure Environment Variables

After deployment, set your API keys:

```bash
# Set environment variables
gcloud run services update soa-whatsapp-bot \
  --region=us-central1 \
  --set-env-vars="GROQ_API_KEY=your_groq_api_key_here" \
  --set-env-vars="OPENAI_API_KEY=your_openai_api_key_here" \
  --set-env-vars="NODE_ENV=production"
```

## Step 5: Get Your Service URL

```bash
# Get the service URL
gcloud run services describe soa-whatsapp-bot \
  --region=us-central1 \
  --format='value(status.url)'
```

## Step 6: Test Your Deployment

```bash
# Test the health endpoint
curl https://your-service-url/health

# Test the voice endpoint
curl -X POST https://your-service-url/api/voice/process \
  -F "audio=@test-audio.wav" \
  -F "language=en"
```

## Configuration Details

### Cloud Run Settings
- **Memory**: 2GB
- **CPU**: 2 vCPUs
- **Timeout**: 300 seconds
- **Concurrency**: 100 requests per instance
- **Max Instances**: 10

### Environment Variables
- `NODE_ENV=production`
- `PORT=8080`
- `GROQ_API_KEY` (your Groq API key)
- `OPENAI_API_KEY` (your OpenAI API key)

### Service Account
The application uses the service account key file for Google Cloud APIs:
- Speech-to-Text API
- Text-to-Speech API

## Monitoring and Logs

```bash
# View logs
gcloud run services logs read soa-whatsapp-bot --region=us-central1

# Monitor service
gcloud run services describe soa-whatsapp-bot --region=us-central1
```

## Troubleshooting

### Common Issues

1. **Service Account Permissions**: Ensure the service account has access to:
   - Cloud Speech-to-Text API
   - Cloud Text-to-Speech API
   - Cloud Run

2. **API Quotas**: Check your API quotas in Google Cloud Console

3. **Memory Issues**: If you encounter memory issues, increase the memory allocation:
   ```bash
   gcloud run services update soa-whatsapp-bot \
     --region=us-central1 \
     --memory=4Gi
   ```

### Health Check

The application includes a health check endpoint at `/health` that returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-13T20:43:02.373Z",
  "services": {
    "rag": "built",
    "departments_count": 16
  }
}
```

## Cost Optimization

- **CPU Allocation**: Only allocate CPU during request processing
- **Memory**: Start with 2GB, adjust based on usage
- **Max Instances**: Set based on expected traffic
- **Timeout**: Set appropriate timeout for your use case

## Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **Service Account**: Use least privilege principle
3. **CORS**: Configure appropriate CORS origins
4. **HTTPS**: Cloud Run automatically provides HTTPS

## Support

For issues with deployment, check:
1. Google Cloud Run logs
2. Application logs
3. API quotas and permissions
4. Service account configuration
