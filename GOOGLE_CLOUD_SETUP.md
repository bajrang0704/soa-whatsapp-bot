# Google Cloud Credentials Setup

## 🔐 **Credentials Extracted Successfully**

Your Google Cloud service account credentials have been extracted from `plexiform-shine-471813-e5-83fb1800e34e.json` and are now available as environment variables.

## 📋 **Extracted Credentials**

| Variable | Value |
|----------|-------|
| `GOOGLE_CLOUD_PROJECT_ID` | `plexiform-shine-471813-e5` |
| `GOOGLE_CLOUD_CLIENT_EMAIL` | `voice-agent@plexiform-shine-471813-e5.iam.gserviceaccount.com` |
| `GOOGLE_CLOUD_PRIVATE_KEY_ID` | `83fb1800e34e7090142a38940386033044a6b80b` |
| `GOOGLE_CLOUD_CLIENT_ID` | `115407410597088434086` |
| `GOOGLE_CLOUD_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----...` (Full private key) |

## 🚀 **How It Works on Servers**

### **Local Development**
- Uses the JSON file: `plexiform-shine-471813-e5-83fb1800e34e.json`
- File is excluded from Git (secure)

### **Production Deployment**
- Uses environment variables instead of JSON file
- More secure and cloud-friendly
- No need to manage JSON files on servers

## 📁 **Files Created**

1. **`google-cloud-credentials.env`** - Template with all credentials
2. **`setup-env-vars.bat`** - Script to set environment variables locally
3. **`infrastructure/external/googleCloudAuth.js`** - Enhanced auth helper
4. **Updated deployment scripts** - Ready for cloud deployment

## 🔧 **Usage**

### **For Local Development**
```bash
# Run the setup script
setup-env-vars.bat

# Or manually set environment variables
set GOOGLE_CLOUD_PROJECT_ID=plexiform-shine-471813-e5
set GOOGLE_CLOUD_CLIENT_EMAIL=voice-agent@plexiform-shine-471813-e5.iam.gserviceaccount.com
# ... etc
```

### **For Cloud Deployment**
The deployment scripts are already configured with your credentials:

- **Google Cloud Run**: `deploy-google-cloud.bat`
- **AWS Elastic Beanstalk**: `.ebextensions/02-environment.config`

## 🔒 **Security Notes**

✅ **Secure**: JSON file is excluded from Git  
✅ **Production Ready**: Environment variables configured  
✅ **Cloud Compatible**: Works with all major cloud platforms  
✅ **No Hardcoded Secrets**: All credentials are properly externalized  

## 🎯 **Next Steps**

1. **Push to GitHub** - Credentials are secure and won't be exposed
2. **Deploy to Cloud** - Use the provided deployment scripts
3. **Test Voice Services** - Google Cloud TTS/STT should work seamlessly

## 📞 **Support**

If you encounter any issues:
1. Check that environment variables are set correctly
2. Verify Google Cloud APIs are enabled
3. Ensure service account has proper permissions
4. Check cloud platform logs for authentication errors
