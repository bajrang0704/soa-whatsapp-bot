/**
 * Voice Service
 * 
 * Core voice processing service that handles STT, TTS, and voice configuration.
 * This service acts as a facade for different voice providers.
 */

const GoogleCloudSttService = require('../../infrastructure/external/googleCloudSttService');
const GoogleCloudTtsService = require('../../infrastructure/external/googleCloudTtsService');
const SimpleArabicTtsService = require('../../infrastructure/external/simpleArabicTtsService');
const VoiceConfigService = require('../../infrastructure/storage/voiceConfigService');
const VoiceSummarizationService = require('./voiceSummarizationService');
const MemoryService = require('../memory/memoryService');

class VoiceService {
    constructor() {
        this.googleCloudSttService = new GoogleCloudSttService();
        this.googleCloudTtsService = new GoogleCloudTtsService();
        this.simpleArabicTtsService = new SimpleArabicTtsService();
        this.configService = new VoiceConfigService();
        this.summarizationService = VoiceSummarizationService;
        this.memoryService = new MemoryService();
    }
    
    /**
     * Converts speech to text
     * @param {Object} params - STT parameters
     * @param {Buffer} params.audioBuffer - Audio buffer
     * @param {string} params.contentType - Audio content type
     * @param {string} params.language - Language code
     * @returns {Promise<Object>} STT result
     */
    async speechToText({ audioBuffer, contentType, language }) {
        try {
            console.log(`🎤 Processing STT request: ${contentType}, ${language}`);
            
            // Validate audio buffer
            if (!audioBuffer || audioBuffer.length === 0) {
                throw new Error('Audio buffer is empty');
            }
            
            if (audioBuffer.length < 100) {
                throw new Error('Audio buffer too small');
            }
            
            // Detect audio format
            const detectedFormat = this.detectAudioFormat(audioBuffer);
            console.log(`🔍 Detected format: ${detectedFormat}`);
            
            // Use Google Cloud STT
            const result = await this.googleCloudSttService.speechToText({
                audioBuffer,
                contentType: detectedFormat || contentType,
                language
            });
            
            return {
                transcript: result.transcript,
                confidence: result.confidence,
                language: result.language,
                duration: result.duration
            };
            
        } catch (error) {
            console.error('❌ Voice STT error:', error);
            throw error;
        }
    }
    
    /**
     * Converts text to speech
     * @param {Object} params - TTS parameters
     * @param {string} params.text - Text to synthesize
     * @param {string} params.language - Language code
     * @param {string} params.voiceType - Voice type (male/female)
     * @param {Object} params.options - Additional options
     * @returns {Promise<Object>} TTS result
     */
    async textToSpeech({ text, language, voiceType, options }) {
        try {
            console.log(`🗣️ Processing TTS request: "${text.substring(0, 50)}...", ${language}, ${voiceType}`);
            
            // Preprocess text
            const cleanText = this.preprocessText(text, language);
            
            // Try Google Cloud TTS first, fallback to Simple Arabic TTS
            try {
                const result = await this.googleCloudTtsService.synthesizeText({
                    text: cleanText,
                    language,
                    voiceType,
                    options
                });
                return {
                    success: true,
                    audioBuffer: result.audioBuffer,
                    contentType: result.contentType,
                    duration: result.duration,
                    method: 'google-cloud'
                };
            } catch (googleError) {
                console.log('⚠️ Google Cloud TTS failed, using Simple Arabic TTS...');
                const result = await this.simpleArabicTtsService.synthesizeText({
                    text: cleanText,
                    language,
                    voiceType,
                    options
                });
                return {
                    success: true,
                    audioBuffer: result.audioBuffer,
                    contentType: result.contentType,
                    duration: result.duration,
                    method: result.method || 'simple-arabic'
                };
            }
            
        } catch (error) {
            console.error('❌ Voice TTS error:', error);
            throw error;
        }
    }
    
    /**
     * Gets voice configuration
     * @returns {Promise<Object>} Voice configuration
     */
    async getConfig() {
        try {
            const config = await this.configService.getConfig();
            const googleCloudSttStatus = this.googleCloudSttService.getStatus();
            const googleCloudTtsStatus = this.googleCloudTtsService.getStatus();
            const simpleArabicTtsStatus = this.simpleArabicTtsService.getStatus();
            
            return {
                config,
                services: {
                    stt: {
                        provider: 'google-cloud',
                        status: googleCloudSttStatus
                    },
                    tts: {
                        primary: {
                            provider: 'google-cloud',
                            status: googleCloudTtsStatus
                        },
                        fallback: {
                            provider: 'simple-arabic',
                            status: simpleArabicTtsStatus
                        }
                    }
                },
                voices: this.configService.getVoices()
            };
            
        } catch (error) {
            console.error('❌ Get voice config error:', error);
            throw error;
        }
    }
    
    /**
     * Updates voice configuration
     * @param {Object} params - Configuration parameters
     * @returns {Promise<Object>} Update result
     */
    async updateConfig({ stt, tts, voices }) {
        try {
            let updated = false;
            
            if (stt) {
                await this.configService.updateSTTConfig(stt.provider, stt.settings);
                updated = true;
            }
            
            if (tts) {
                await this.configService.updateTTSConfig(tts.provider, tts.settings);
                updated = true;
            }
            
            if (voices) {
                for (const [language, languageVoices] of Object.entries(voices)) {
                    for (const [voiceType, voiceConfig] of Object.entries(languageVoices)) {
                        await this.configService.addVoice(language, voiceType, voiceConfig);
                        updated = true;
                    }
                }
            }
            
            if (!updated) {
                throw new Error('No valid configuration provided');
            }
            
            return {
                message: 'Voice configuration updated successfully'
            };
            
        } catch (error) {
            console.error('❌ Update voice config error:', error);
            throw error;
        }
    }
    
    /**
     * Tests the audio system
     * @returns {Promise<Object>} Test result
     */
    async testAudioSystem() {
        try {
            const deepgramStatus = this.deepgramService.getStatus();
            const xttsStatus = this.xttsService.getStatus();
            
            return {
                deepgram: deepgramStatus,
                xtts: xttsStatus,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Test audio system error:', error);
            throw error;
        }
    }
    
    /**
     * Tests STT with uploaded file
     * @param {Object} params - Test parameters
     * @returns {Promise<Object>} Test result
     */
    async testSTTWithFile({ audioBuffer, contentType, language }) {
        try {
            console.log(`🧪 Testing STT with file: ${contentType}, ${language}`);
            
            const result = await this.speechToText({
                audioBuffer,
                contentType,
                language
            });
            
            return {
                deepgramResult: result,
                testPassed: result.transcript.length > 0
            };
            
        } catch (error) {
            console.error('❌ Test STT error:', error);
            throw error;
        }
    }
    
    /**
     * Gets memory statistics
     * @returns {Promise<Object>} Memory stats
     */
    async getMemoryStats() {
        try {
            // Use the memory service for stats
            return await this.memoryService.getStats();
            
        } catch (error) {
            console.error('❌ Get memory stats error:', error);
            return {
                totalSessions: 0,
                activeSessions: 0,
                memoryUsage: '0 MB'
            };
        }
    }
    
    /**
     * Clears memory for a client
     * @param {string} clientId - Client ID
     * @returns {Promise<boolean>} Success status
     */
    async clearMemory(clientId) {
        try {
            console.log(`🧹 Clearing memory for client: ${clientId}`);
            return await this.memoryService.clearHistory(clientId);
            
        } catch (error) {
            console.error('❌ Clear memory error:', error);
            return false;
        }
    }
    
    /**
     * Detects audio format from buffer
     * @param {Buffer} buffer - Audio buffer
     * @returns {string|null} Detected format
     */
    detectAudioFormat(buffer) {
        if (buffer.length < 4) return null;
        
        const signatures = {
            'RIFF': 'audio/wav',
            'OggS': 'audio/ogg',
            'fLaC': 'audio/flac',
            'ID3': 'audio/mp3',
            '\x1aE\xdf\xa3': 'audio/webm' // WebM signature
        };
        
        // Check for WebM format (starts with 0x1A 0x45 0xDF 0xA3)
        if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
            return 'audio/webm';
        }
        
        const header = buffer.slice(0, 4).toString('ascii');
        return signatures[header] || null;
    }
    
    /**
     * Preprocesses text for TTS
     * @param {string} text - Input text
     * @param {string} language - Language code
     * @returns {string} Preprocessed text
     */
    preprocessText(text, language) {
        // Basic text preprocessing
        let cleanText = text.trim();
        
        // Remove excessive whitespace
        cleanText = cleanText.replace(/\s+/g, ' ');
        
        // Language-specific preprocessing
        if (language === 'ar') {
            // Arabic text preprocessing
            cleanText = cleanText.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, '');
        } else {
            // English text preprocessing
            cleanText = cleanText.replace(/[^\w\s.,!?;:'"-]/g, '');
        }
        
        return cleanText;
    }
}

module.exports = VoiceService;
