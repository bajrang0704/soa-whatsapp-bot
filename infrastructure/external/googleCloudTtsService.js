/**
 * Google Cloud Text-to-Speech Service
 * 
 * External service integration for Google Cloud TTS with Arabic support.
 */

const axios = require('axios');

class GoogleCloudTtsService {
    constructor() {
        this.apiKey = process.env.GOOGLE_CLOUD_API_KEY;
        this.ttsUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize';
        
        // Try to load service account for authentication
        this.serviceAccount = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.loadServiceAccount();
        
        // Arabic voice configurations
        this.arabicVoices = {
            female: {
                name: 'ar-XA-Wavenet-A',
                languageCode: 'ar-XA',
                ssmlGender: 'FEMALE'
            },
            male: {
                name: 'ar-XA-Wavenet-B', 
                languageCode: 'ar-XA',
                ssmlGender: 'MALE'
            }
        };
        
        // English voice configurations
        this.englishVoices = {
            female: {
                name: 'en-US-Wavenet-F',
                languageCode: 'en-US',
                ssmlGender: 'FEMALE'
            },
            male: {
                name: 'en-US-Wavenet-D',
                languageCode: 'en-US', 
                ssmlGender: 'MALE'
            }
        };
        
        if (!this.apiKey && !this.serviceAccount) {
            console.warn('⚠️ Neither GOOGLE_CLOUD_API_KEY nor service account found');
        }
    }
    
    /**
     * Load service account from environment variables or file
     */
    loadServiceAccount() {
        try {
            // First try environment variables (production)
            if (this.loadFromEnvironment()) {
                console.log('✅ Google Cloud TTS service account loaded from environment variables');
                return;
            }

            // Fallback to file (local development)
            if (this.loadFromFile()) {
                console.log('✅ Google Cloud TTS service account loaded from file');
                return;
            }

            console.warn('⚠️ No Google Cloud TTS credentials found');
        } catch (error) {
            console.warn('⚠️ Could not load service account:', error.message);
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
     * Load credentials from service account file (fallback)
     */
    loadFromFile() {
        try {
            const fs = require('fs');
            const path = require('path');
            const serviceAccountPath = path.join(__dirname, '../../plexiform-shine-471813-e5-83fb1800e34e.json');
            
            if (fs.existsSync(serviceAccountPath)) {
                const serviceAccountData = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                this.serviceAccount = serviceAccountData;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading service account file:', error.message);
            return false;
        }
    }
    
    /**
     * Generate JWT token for service account authentication
     */
    async generateAccessToken() {
        if (!this.serviceAccount) {
            throw new Error('Service account not loaded');
        }
        
        // Check if we have a valid token
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        
        try {
            const jwt = require('jsonwebtoken');
            
            // Create JWT payload
            const now = Math.floor(Date.now() / 1000);
            const payload = {
                iss: this.serviceAccount.client_email,
                scope: 'https://www.googleapis.com/auth/cloud-platform',
                aud: 'https://oauth2.googleapis.com/token',
                iat: now,
                exp: now + 3600 // 1 hour
            };
            
            // Sign the JWT
            const token = jwt.sign(payload, this.serviceAccount.private_key, {
                algorithm: 'RS256',
                header: {
                    kid: this.serviceAccount.private_key_id
                }
            });
            
            // Exchange JWT for access token
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: token
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
            
            console.log('✅ Google Cloud access token generated');
            return this.accessToken;
            
        } catch (error) {
            console.error('❌ Failed to generate access token:', error.message);
            throw error;
        }
    }
    
    /**
     * Synthesizes text to speech using Google Cloud TTS
     * @param {Object} params - TTS parameters
     * @param {string} params.text - Text to synthesize
     * @param {string} params.language - Language code (ar, en)
     * @param {string} params.voiceType - Voice type (male/female)
     * @param {Object} params.options - Additional options
     * @returns {Promise<Object>} TTS result
     */
    async synthesizeText({ text, language = 'en', voiceType = 'female', options = {} }) {
        try {
            console.log(`🗣️ Google Cloud TTS synthesis: "${text.substring(0, 50)}..." (${language}, ${voiceType})`);
            
            if (!this.apiKey && !this.serviceAccount) {
                throw new Error('Google Cloud authentication not configured');
            }
            
            // Get voice configuration
            const voiceConfig = this.getVoiceConfig(language, voiceType);
            
            // Prepare SSML for better Arabic pronunciation
            const ssmlText = this.prepareSSML(text, language);
            
            const requestBody = {
                input: {
                    ssml: ssmlText
                },
                voice: {
                    languageCode: voiceConfig.languageCode,
                    name: voiceConfig.name,
                    ssmlGender: voiceConfig.ssmlGender
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: options.speed || 1.2, // Slightly faster default
                    pitch: options.pitch || 0.0,
                    volumeGainDb: options.volume || 0.0,
                    effectsProfileId: ['telephony-class-application'] // Optimized for speed
                }
            };
            
            console.log(`🔧 Google Cloud TTS request:`, JSON.stringify(requestBody, null, 2));
            
            // Use API key if available, otherwise use service account
            let headers = {
                'Content-Type': 'application/json'
            };
            
            let response;
            
            if (this.serviceAccount) {
                // Use service account authentication (preferred)
                const accessToken = await this.generateAccessToken();
                headers['Authorization'] = `Bearer ${accessToken}`;
                
                response = await axios.post(this.ttsUrl, requestBody, {
                    headers,
                    timeout: 30000
                });
            } else if (this.apiKey) {
                // Use API key authentication (fallback)
                const url = `${this.ttsUrl}?key=${this.apiKey}`;
                response = await axios.post(url, requestBody, {
                    headers,
                    timeout: 30000
                });
            } else {
                throw new Error('No authentication method available');
            }
            
            if (response.data && response.data.audioContent) {
                const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
                
                console.log(`✅ Google Cloud TTS success: ${audioBuffer.length} bytes generated`);
                
                return {
                    success: true,
                    audioBuffer: audioBuffer,
                    contentType: 'audio/mpeg',
                    duration: this.estimateDuration(text, options.speed || 1.0)
                };
            } else {
                throw new Error('Invalid response from Google Cloud TTS');
            }
            
        } catch (error) {
            console.error('❌ Google Cloud TTS error:', error.message);
            if (error.response) {
                console.error('📊 Google Cloud response:', error.response.data);
            }
            throw new Error(`Google Cloud TTS failed: ${error.message}`);
        }
    }
    
    /**
     * Gets voice configuration for language and type
     * @param {string} language - Language code
     * @param {string} voiceType - Voice type
     * @returns {Object} Voice configuration
     */
    getVoiceConfig(language, voiceType) {
        if (language === 'ar' || language === 'arabic') {
            return this.arabicVoices[voiceType] || this.arabicVoices.female;
        } else {
            return this.englishVoices[voiceType] || this.englishVoices.female;
        }
    }
    
    /**
     * Prepares SSML for better pronunciation
     * @param {string} text - Input text
     * @param {string} language - Language code
     * @returns {string} SSML formatted text
     */
    prepareSSML(text, language) {
        // Clean and prepare text
        let cleanText = text.trim();
        
        // For Arabic, add proper SSML tags
        if (language === 'ar' || language === 'arabic') {
            // Add Arabic-specific pronunciation improvements
            cleanText = this.enhanceArabicText(cleanText);
        }
        
        // Wrap in SSML
        return `<speak>${cleanText}</speak>`;
    }
    
    /**
     * Enhances Arabic text for better TTS pronunciation
     * @param {string} text - Arabic text
     * @returns {string} Enhanced text
     */
    enhanceArabicText(text) {
        // Add pauses for better flow
        let enhanced = text
            .replace(/،/g, '<break time="0.3s"/>') // Arabic comma
            .replace(/؛/g, '<break time="0.5s"/>') // Arabic semicolon
            .replace(/\./g, '<break time="0.5s"/>') // Period
            .replace(/\?/g, '<break time="0.5s"/>') // Question mark
            .replace(/!/g, '<break time="0.5s"/>'); // Exclamation mark
            
        return enhanced;
    }
    
    /**
     * Estimates audio duration based on text length and speed
     * @param {string} text - Text content
     * @param {number} speed - Speaking speed
     * @returns {number} Estimated duration in seconds
     */
    estimateDuration(text, speed = 1.0) {
        // Rough estimation: ~150 words per minute at normal speed
        const wordsPerMinute = 150 * speed;
        const wordCount = text.split(/\s+/).length;
        return Math.max(1, (wordCount / wordsPerMinute) * 60);
    }
    
    /**
     * Gets available voices for a language
     * @param {string} language - Language code
     * @returns {Array} Available voices
     */
    getAvailableVoices(language) {
        if (language === 'ar' || language === 'arabic') {
            return Object.keys(this.arabicVoices).map(type => ({
                type,
                name: this.arabicVoices[type].name,
                languageCode: this.arabicVoices[type].languageCode,
                gender: this.arabicVoices[type].ssmlGender
            }));
        } else {
            return Object.keys(this.englishVoices).map(type => ({
                type,
                name: this.englishVoices[type].name,
                languageCode: this.englishVoices[type].languageCode,
                gender: this.englishVoices[type].ssmlGender
            }));
        }
    }
    
    /**
     * Gets service status
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            configured: !!(this.apiKey || this.serviceAccount),
            apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null,
            serviceAccount: this.serviceAccount ? this.serviceAccount.client_email : null,
            ttsUrl: this.ttsUrl,
            supportedLanguages: ['en', 'ar'],
            arabicVoices: Object.keys(this.arabicVoices),
            englishVoices: Object.keys(this.englishVoices)
        };
    }
    
    /**
     * Checks if service is configured
     * @returns {boolean} Configuration status
     */
    isConfigured() {
        return !!(this.apiKey || this.serviceAccount);
    }
}

module.exports = GoogleCloudTtsService;
