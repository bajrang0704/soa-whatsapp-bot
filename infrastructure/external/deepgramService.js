/**
 * Deepgram Service
 * 
 * External service integration for Deepgram STT and TTS.
 */

const axios = require('axios');

class DeepgramService {
    constructor() {
        this.apiKey = process.env.DEEPGRAM_API_KEY;
        this.sttUrl = 'https://api.deepgram.com/v1/listen';
        this.ttsUrl = 'https://api.deepgram.com/v1/speak';
        this.ttsVoice = process.env.DEEPGRAM_TTS_VOICE || 'aura-2-odysseus-en';
        
        if (!this.apiKey) {
            console.error('❌ DEEPGRAM_API_KEY not found in environment variables');
        }
    }
    
    /**
     * Converts speech to text using Deepgram Nova-2 model
     * @param {Object} params - STT parameters
     * @param {Buffer} params.audioBuffer - Audio data buffer
     * @param {string} params.contentType - Audio content type
     * @param {string} params.language - Language code
     * @returns {Promise<Object>} STT result
     */
    async speechToText({ audioBuffer, contentType, language }) {
        const models = ['nova-2', 'base'];
        
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            
            try {
                console.log(`🎤 Sending audio to Deepgram STT (model: ${model})...`);
                console.log(`📊 Audio buffer size: ${audioBuffer.length} bytes, Content-Type: ${contentType}`);
                
                // Configure parameters based on content type
                const params = new URLSearchParams({
                    model: model,
                    smart_format: 'true',
                    punctuate: 'true',
                    diarize: 'false',
                    profanity_filter: 'false',
                    redact: 'false'
                });
                
                // Add language parameter only if not 'auto' and supported
                if (language && language !== 'auto' && language !== 'ar') {
                    params.append('language', language);
                }
            
                // Add format-specific parameters
                if (contentType === 'audio/mp4' || contentType === 'audio/wav') {
                    params.append('encoding', 'linear16');
                    params.append('sample_rate', '16000');
                    console.log('🎯 Added MP4/WAV-specific parameters for Deepgram');
                } else if (contentType === 'audio/ogg' || contentType === 'audio/opus') {
                    params.append('encoding', 'linear16');
                    params.append('sample_rate', '16000');
                    console.log('🎯 Added OGG/Opus-specific parameters for Deepgram');
                } else if (contentType === 'audio/webm') {
                    // WebM/Opus format - let Deepgram auto-detect
                    console.log('🎯 WebM format detected - using auto-detection for Deepgram');
                }
                
                console.log(`🔧 Deepgram parameters: ${params.toString()}`);
                
                const response = await axios.post(`${this.sttUrl}?${params}`, audioBuffer, {
                    headers: {
                        'Authorization': `Token ${this.apiKey}`,
                        'Content-Type': contentType
                    },
                    timeout: 30000
                });
                
                const result = response.data;
                const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
                const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
                const duration = result.metadata?.duration || 0;
                
                console.log(`✅ Deepgram STT result: "${transcript}" (confidence: ${confidence})`);
                console.log(`🔍 Full Deepgram response:`, JSON.stringify(result, null, 2));
                
                return {
                    transcript,
                    confidence,
                    language: result.metadata?.language || language,
                    duration,
                    rawResponse: result
                };
                
            } catch (error) {
                console.error(`❌ Deepgram STT error with model ${model}:`, error.message);
                
                if (error.response) {
                    console.error('📊 Deepgram response status:', error.response.status);
                    console.error('📊 Deepgram response data:', error.response.data);
                }
                
                // If this is the last model, throw the error
                if (i === models.length - 1) {
                    throw new Error(`Deepgram STT failed with all models: ${error.message}`);
                } else {
                    console.log(`🔄 Trying next model...`);
                }
            }
        }
    }
    
    /**
     * Converts text to speech using Deepgram TTS
     * @param {Object} params - TTS parameters
     * @param {string} params.text - Text to synthesize
     * @param {string} params.voice - Voice to use
     * @returns {Promise<Object>} TTS result
     */
    async textToSpeech({ text, voice = this.ttsVoice }) {
        try {
            console.log(`🗣️ Sending text to Deepgram TTS: "${text.substring(0, 50)}..."`);
            
            const response = await axios.post(this.ttsUrl, {
                text: text,
                model: 'aura-2',
                voice: voice
            }, {
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            return {
                success: true,
                audioBuffer: Buffer.from(response.data),
                contentType: 'audio/mpeg'
            };
            
        } catch (error) {
            console.error('❌ Deepgram TTS error:', error.message);
            throw new Error(`Deepgram TTS failed: ${error.message}`);
        }
    }
    
    /**
     * Gets service status
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            configured: !!this.apiKey,
            apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : null,
            sttUrl: this.sttUrl,
            ttsUrl: this.ttsUrl,
            ttsVoice: this.ttsVoice
        };
    }
    
    /**
     * Checks if service is configured
     * @returns {boolean} Configuration status
     */
    isConfigured() {
        return !!this.apiKey;
    }
}

module.exports = DeepgramService;
