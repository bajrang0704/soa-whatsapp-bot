/**
 * Google Cloud Speech-to-Text Service
 * 
 * External service integration for Google Cloud STT with Arabic support.
 * Uses the same Plexiform-Shine service account as TTS.
 */

const axios = require('axios');

class GoogleCloudSttService {
    constructor() {
        this.apiKey = process.env.GOOGLE_CLOUD_API_KEY;
        this.sttUrl = 'https://speech.googleapis.com/v1/speech:recognize';
        
        // Try to load service account for authentication
        this.serviceAccount = null;
        this.accessToken = null;
        this.tokenExpiry = null;
        this.loadServiceAccount();
        
        this.supportedLanguages = ['en', 'ar'];
        this.supportedEncodings = {
            'audio/wav': 'LINEAR16',
            'audio/mp3': 'MP3',
            'audio/mpeg': 'MP3',
            'audio/ogg': 'OGG_OPUS',
            'audio/webm': 'WEBM_OPUS',
            'audio/flac': 'FLAC'
        };
        
        if (!this.apiKey && !this.serviceAccount) {
            console.warn('⚠️ Neither GOOGLE_CLOUD_API_KEY nor service account found for STT');
        }
    }
    
    /**
     * Load service account from environment variables or file
     */
    loadServiceAccount() {
        try {
            // First try environment variables (production)
            if (this.loadFromEnvironment()) {
                console.log('✅ Google Cloud STT service account loaded from environment variables');
                return;
            }

            // Fallback to file (local development)
            if (this.loadFromFile()) {
                console.log('✅ Google Cloud STT service account loaded from file');
                return;
            }

            console.warn('⚠️ No Google Cloud STT credentials found - STT will not work');
            console.warn('⚠️ Please set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_PRIVATE_KEY, and GOOGLE_CLOUD_CLIENT_EMAIL environment variables');
        } catch (error) {
            console.warn('⚠️ Could not load service account for STT:', error.message);
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
            
            console.log('✅ Google Cloud STT access token generated');
            return this.accessToken;
            
        } catch (error) {
            console.error('❌ Failed to generate STT access token:', error.message);
            throw error;
        }
    }
    
    /**
     * Converts speech to text using Google Cloud STT
     * @param {Object} params - STT parameters
     * @param {Buffer} params.audioBuffer - Audio buffer
     * @param {string} params.contentType - Audio content type
     * @param {string} params.language - Language code
     * @returns {Promise<Object>} STT result
     */
    async speechToText({ audioBuffer, contentType, language }) {
        try {
            console.log(`🎤 Google Cloud STT: ${contentType}, ${language}, size: ${audioBuffer.length} bytes`);
            
            if (!this.apiKey && !this.serviceAccount) {
                throw new Error('Google Cloud STT authentication not configured');
            }
            
            // Validate audio buffer size (Google Cloud has limits)
            if (audioBuffer.length > 10485760) { // 10MB limit
                throw new Error(`Audio file too large: ${audioBuffer.length} bytes (max 10MB)`);
            }
            
            if (audioBuffer.length < 100) {
                throw new Error(`Audio file too small: ${audioBuffer.length} bytes`);
            }
            
            // Get encoding for the audio format
            let encoding = this.getEncoding(contentType);
            if (!encoding) {
                throw new Error(`Unsupported audio format: ${contentType}`);
            }
            
            // Get appropriate sample rate for the format
            let sampleRate = this.getSampleRate(contentType);
            
            // Special handling for WebM format - try to convert to WAV if needed
            if (contentType === 'audio/webm' && encoding === 'WEBM_OPUS') {
                console.log('🔄 WebM format detected, attempting conversion to WAV for better compatibility');
                console.log(`🔍 Original audio size: ${audioBuffer.length} bytes`);
                
                try {
                    const convertedAudio = await this.convertWebMToWav(audioBuffer);
                    if (convertedAudio) {
                        console.log(`🔍 Converted audio size: ${convertedAudio.length} bytes`);
                        audioBuffer = convertedAudio;
                        encoding = 'LINEAR16';
                        sampleRate = 16000;
                        console.log('✅ Successfully converted WebM to WAV format');
                    } else {
                        console.warn('⚠️ WebM to WAV conversion returned null, using original format');
                    }
                } catch (conversionError) {
                    console.warn('⚠️ WebM to WAV conversion failed, proceeding with original format:', conversionError.message);
                }
            }
            
            // Prepare request body with proper configuration (only valid Google Cloud STT fields)
            const requestBody = {
                config: {
                    encoding: encoding,
                    sampleRateHertz: sampleRate,
                    languageCode: this.getLanguageCode(language),
                    enableAutomaticPunctuation: true, // Enable for better results
                    enableWordTimeOffsets: false,
                    enableWordConfidence: true, // Enable confidence to get better results
                    model: 'latest_long', // Use long model for better accuracy
                    useEnhanced: true, // Enable enhanced model for better results
                    enableSeparateRecognitionPerChannel: false,
                    // Add alternative language codes for better recognition
                    alternativeLanguageCodes: language === 'ar' ? ['en-US'] : ['ar-SA'],
                    // Add audio channel count for better processing
                    audioChannelCount: 1,
                    // Enable profanity filter
                    profanityFilter: false
                },
                audio: {
                    content: audioBuffer.toString('base64')
                }
            };
            
            console.log(`🔧 Google Cloud STT request:`, JSON.stringify(requestBody.config, null, 2));
            
            // Use API key if available, otherwise use service account
            let headers = {
                'Content-Type': 'application/json'
            };
            
            let response;
            
            if (this.serviceAccount) {
                // Use service account authentication (preferred)
                const accessToken = await this.generateAccessToken();
                headers['Authorization'] = `Bearer ${accessToken}`;
                
                response = await axios.post(this.sttUrl, requestBody, {
                    headers,
                    timeout: 30000
                });
            } else if (this.apiKey) {
                // Use API key authentication (fallback)
                const url = `${this.sttUrl}?key=${this.apiKey}`;
                response = await axios.post(url, requestBody, {
                    headers,
                    timeout: 30000
                });
            } else {
                throw new Error('No authentication method available');
            }
            
            // Debug: Log the full response to understand the structure
            console.log('🔍 Google Cloud STT full response:', JSON.stringify(response.data, null, 2));
            
            if (response.data && response.data.results && response.data.results.length > 0) {
                const result = response.data.results[0];
                console.log('🔍 First result:', JSON.stringify(result, null, 2));
                
                if (result.alternatives && result.alternatives.length > 0) {
                    const alternative = result.alternatives[0];
                    console.log('🔍 First alternative:', JSON.stringify(alternative, null, 2));
                    
                    // Check if alternative has transcript property
                    if (alternative.transcript && alternative.transcript.trim()) {
                        console.log(`✅ Google Cloud STT success: "${alternative.transcript}"`);
                        
                        return {
                            success: true,
                            transcript: alternative.transcript,
                            confidence: alternative.confidence || 0,
                            language: this.getLanguageCode(language),
                            duration: 0, // Google Cloud doesn't provide duration in this response
                            provider: 'google-cloud'
                        };
                    } else {
                        console.log('⚠️ Alternative found but no transcript content');
                        console.log('🔍 Detected language:', result.languageCode);
                        console.log('🔍 Result end time:', result.resultEndTime);
                        
                        // Try to extract any text from the alternative object
                        const alternativeText = alternative.transcript || alternative.text || '';
                        if (alternativeText && alternativeText.trim()) {
                            console.log(`✅ Found transcript in alternative: "${alternativeText}"`);
                            return {
                                success: true,
                                transcript: alternativeText,
                                confidence: alternative.confidence || 0,
                                language: this.getLanguageCode(language),
                                duration: 0,
                                provider: 'google-cloud'
                            };
                        }
                        
                        return {
                            success: true,
                            transcript: '',
                            confidence: 0,
                            language: this.getLanguageCode(language),
                            duration: 0,
                            provider: 'google-cloud',
                            debug: {
                                detectedLanguage: result.languageCode,
                                resultEndTime: result.resultEndTime,
                                hasAlternatives: true,
                                alternativeEmpty: true,
                                alternativeKeys: Object.keys(alternative)
                            }
                        };
                    }
                } else {
                    console.log('⚠️ No alternatives found in result');
                    return {
                        success: true,
                        transcript: '',
                        confidence: 0,
                        language: this.getLanguageCode(language),
                        duration: 0,
                        provider: 'google-cloud',
                        debug: {
                            detectedLanguage: result.languageCode,
                            resultEndTime: result.resultEndTime,
                            hasAlternatives: false
                        }
                    };
                }
            } else {
                console.log('⚠️ No speech detected in audio');
                console.log('🔍 Response data structure:', JSON.stringify(response.data, null, 2));
                return {
                    success: true,
                    transcript: '',
                    confidence: 0,
                    language: this.getLanguageCode(language),
                    duration: 0,
                    provider: 'google-cloud'
                };
            }
            
        } catch (error) {
            console.error('❌ Google Cloud STT error:', error.message);
            if (error.response) {
                console.log('📊 Google Cloud STT response status:', error.response.status);
                console.log('📊 Google Cloud STT response data:', JSON.stringify(error.response.data, null, 2));
                console.log('📊 Google Cloud STT response headers:', error.response.headers);
            }
            
            // Provide more specific error messages
            if (error.response && error.response.status === 400) {
                const errorData = error.response.data;
                if (errorData.error && errorData.error.message) {
                    throw new Error(`Google Cloud STT Bad Request: ${errorData.error.message}`);
                } else {
                    throw new Error(`Google Cloud STT Bad Request: Invalid audio format or configuration`);
                }
            }
            
            throw error;
        }
    }
    
    /**
     * Get audio encoding for Google Cloud STT
     * @param {string} contentType - Audio content type
     * @returns {string} Google Cloud encoding
     */
    getEncoding(contentType) {
        return this.supportedEncodings[contentType] || 'LINEAR16';
    }
    
    /**
     * Get sample rate for audio format
     * @param {string} contentType - Audio content type
     * @returns {number} Sample rate in Hz
     */
    getSampleRate(contentType) {
        // WebM audio from browsers is typically 48kHz, but Google Cloud STT works best with 16kHz
        // However, we need to match the actual sample rate of the audio
        const sampleRates = {
            'audio/wav': 16000,
            'audio/webm': 48000, // WebM from browsers is usually 48kHz
            'audio/ogg': 48000,  // OGG Opus is usually 48kHz
            'audio/mp3': 44100,  // MP3 is usually 44.1kHz
            'audio/mpeg': 44100,
            'audio/flac': 44100
        };
        return sampleRates[contentType] || 16000;
    }
    
    /**
     * Get Google Cloud language code
     * @param {string} language - Input language code
     * @returns {string} Google Cloud language code
     */
    getLanguageCode(language) {
        const languageMap = {
            'ar': 'ar-SA',
            'en': 'en-US',
            'arabic': 'ar-SA',
            'english': 'en-US'
        };
        return languageMap[language] || 'en-US';
    }
    
    /**
     * Convert WebM audio to WAV format for better Google Cloud STT compatibility
     * @param {Buffer} webmBuffer - WebM audio buffer
     * @returns {Promise<Buffer|null>} WAV audio buffer or null if conversion fails
     */
    async convertWebMToWav(webmBuffer) {
        try {
            const { spawn } = require('child_process');
            const fs = require('fs');
            const path = require('path');
            const os = require('os');
            
            // Create temporary files
            const tempDir = os.tmpdir();
            const inputFile = path.join(tempDir, `input_${Date.now()}.webm`);
            const outputFile = path.join(tempDir, `output_${Date.now()}.wav`);
            
            // Write WebM buffer to temporary file
            fs.writeFileSync(inputFile, webmBuffer);
            
            return new Promise((resolve, reject) => {
                // Use ffmpeg to convert WebM to WAV
                const ffmpeg = spawn('ffmpeg', [
                    '-i', inputFile,
                    '-acodec', 'pcm_s16le',
                    '-ar', '16000',
                    '-ac', '1',
                    '-y', // Overwrite output file
                    outputFile
                ]);
                
                let errorOutput = '';
                
                ffmpeg.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                ffmpeg.on('close', (code) => {
                    // Clean up input file
                    try {
                        fs.unlinkSync(inputFile);
                    } catch (e) {
                        console.warn('Could not delete input file:', e.message);
                    }
                    
                    if (code === 0 && fs.existsSync(outputFile)) {
                        try {
                            const wavBuffer = fs.readFileSync(outputFile);
                            fs.unlinkSync(outputFile);
                            resolve(wavBuffer);
                        } catch (e) {
                            reject(new Error(`Failed to read converted WAV file: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`FFmpeg conversion failed with code ${code}: ${errorOutput}`));
                    }
                });
                
                ffmpeg.on('error', (error) => {
                    reject(new Error(`FFmpeg process error: ${error.message}`));
                });
            });
            
        } catch (error) {
            console.warn('WebM to WAV conversion failed:', error.message);
            return null;
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
            sttUrl: this.sttUrl,
            supportedLanguages: this.supportedLanguages,
            supportedEncodings: Object.keys(this.supportedEncodings)
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

module.exports = GoogleCloudSttService;
