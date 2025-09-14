@echo off
echo 🚀 Deploying SOA WhatsApp Bot to AWS Elastic Beanstalk...

REM Check if EB CLI is installed
eb --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS Elastic Beanstalk CLI is not installed.
    echo Please install it first: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html
    pause
    exit /b 1
)

REM Initialize EB application (only needed once)
if not exist ".elasticbeanstalk" (
    echo 📋 Initializing Elastic Beanstalk application...
    eb init soa-whatsapp-bot --platform "Node.js 18" --region us-east-1
)

REM Create environment (only needed once)
if not exist ".elasticbeanstalk\config.yml" (
    echo 🌍 Creating Elastic Beanstalk environment...
    eb create soa-whatsapp-bot-prod --instance-type t3.medium --platform "Node.js 18"
)

REM Deploy the application
echo 📦 Deploying application...
eb deploy

echo ✅ Deployment complete!
echo 🌐 Your app will be available at: https://soa-whatsapp-bot-prod.elasticbeanstalk.com
pause
