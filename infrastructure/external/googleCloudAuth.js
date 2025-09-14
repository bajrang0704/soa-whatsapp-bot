/**
 * Google Cloud Authentication Helper
 * 
 * Handles Google Cloud authentication using either:
 * 1. Service account JSON file (for local development)
 * 2. Environment variables (for production deployment)
 */

class GoogleCloudAuth {
    constructor() {
        this.serviceAccount = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.loadCredentials();
    }

    /**
     * Load Google Cloud credentials from file or environment variables
     */
    loadCredentials() {
        try {
            // Option 1: Try environment variables first (production)
            if (this.loadFromEnvironment()) {
                console.log('✅ Google Cloud credentials loaded from environment variables');
                return;
            }

            // Option 2: Try service account file (local development)
            if (this.loadFromFile()) {
                console.log('✅ Google Cloud credentials loaded from service account file');
                return;
            }

            console.warn('⚠️ No Google Cloud credentials found. Voice services will be disabled.');
            
        } catch (error) {
            console.error('❌ Error loading Google Cloud credentials:', error.message);
        }
    }

    /**
     * Load credentials from environment variables
     */
    loadFromEnvironment() {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY;
        const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL;

        if (projectId && privateKey && clientEmail) {
            this.serviceAccount = {
                type: "service_account",
                project_id: projectId,
                private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID || "default",
                private_key: privateKey.replace(/\\n/g, '\n'),
                client_email: clientEmail,
                client_id: process.env.GOOGLE_CLOUD_CLIENT_ID || "default",
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
            };
            return true;
        }
        return false;
    }

    /**
     * Load credentials from service account file
     */
    loadFromFile() {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Try multiple possible file locations
            const possiblePaths = [
                path.join(__dirname, '../../plexiform-shine-471813-e5-83fb1800e34e.json'),
                path.join(process.cwd(), 'plexiform-shine-471813-e5-83fb1800e34e.json'),
                process.env.GOOGLE_APPLICATION_CREDENTIALS
            ].filter(Boolean);

            for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                    const credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.serviceAccount = credentials;
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error loading service account file:', error.message);
            return false;
        }
    }

    /**
     * Get access token for API calls
     */
    async getAccessToken() {
        if (!this.serviceAccount) {
            throw new Error('No Google Cloud credentials available');
        }

        // Check if we have a valid cached token
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        // Request new token
        return await this.requestAccessToken();
    }

    /**
     * Request new access token from Google
     */
    async requestAccessToken() {
        try {
            const jwt = require('jsonwebtoken');
            const axios = require('axios');

            // Create JWT
            const now = Math.floor(Date.now() / 1000);
            const payload = {
                iss: this.serviceAccount.client_email,
                scope: 'https://www.googleapis.com/auth/cloud-platform',
                aud: 'https://oauth2.googleapis.com/token',
                iat: now,
                exp: now + 3600 // 1 hour
            };

            const token = jwt.sign(payload, this.serviceAccount.private_key, {
                algorithm: 'RS256',
                header: {
                    typ: 'JWT',
                    alg: 'RS256'
                }
            });

            // Exchange JWT for access token
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: token
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            return this.accessToken;

        } catch (error) {
            console.error('Error requesting access token:', error.message);
            throw error;
        }
    }

    /**
     * Check if credentials are available
     */
    isAuthenticated() {
        return this.serviceAccount !== null;
    }

    /**
     * Get service account info (without sensitive data)
     */
    getServiceAccountInfo() {
        if (!this.serviceAccount) return null;
        
        return {
            project_id: this.serviceAccount.project_id,
            client_email: this.serviceAccount.client_email,
            type: this.serviceAccount.type
        };
    }
}

module.exports = GoogleCloudAuth;
