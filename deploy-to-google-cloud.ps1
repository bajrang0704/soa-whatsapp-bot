# Deploy SOA WhatsApp Bot to Google Cloud Run
Write-Host "🚀 Deploying SOA WhatsApp Bot to Google Cloud Run..." -ForegroundColor Green
Write-Host ""

# Set your project ID
$PROJECT_ID = "plexiform-shine-471813-e5"

Write-Host "📋 Project ID: $PROJECT_ID" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed and authenticated
Write-Host "🔍 Checking Google Cloud CLI..." -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud not found"
    }
    Write-Host "✅ Google Cloud CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "📥 Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if user is authenticated
Write-Host "🔐 Checking authentication..." -ForegroundColor Yellow
try {
    $authCheck = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Not authenticated"
    }
    Write-Host "✅ Authenticated as: $authCheck" -ForegroundColor Green
} catch {
    Write-Host "❌ Not authenticated. Please run: gcloud auth login" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Set the project
Write-Host "🎯 Setting project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set project" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Project set to $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Enable required APIs
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
Write-Host "✅ APIs enabled" -ForegroundColor Green
Write-Host ""

# Build and deploy
Write-Host "🏗️ Building and deploying..." -ForegroundColor Yellow
gcloud builds submit --config cloudbuild.yaml
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""

# Get the service URL
Write-Host "🌐 Your app is now running at:" -ForegroundColor Cyan
$serviceUrl = gcloud run services describe soa-whatsapp-bot --region=us-central1 --format="value(status.url)"
Write-Host $serviceUrl -ForegroundColor White
Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Read-Host "Press Enter to exit"
