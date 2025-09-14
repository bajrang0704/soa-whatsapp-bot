@echo off
echo 🚀 Deploying SOA WhatsApp Bot to AWS Elastic Beanstalk...

REM Install EB CLI if not already installed
REM pip install awsebcli

REM Initialize EB (run only once)
REM eb init

REM Deploy to AWS
eb deploy

echo ✅ Deployment complete!
echo 🌐 Your app will be available at: http://your-app-name.region.elasticbeanstalk.com
pause
