/**
 * Simple Arabic TTS Service
 * Uses free TTS APIs for Arabic text-to-speech
 */

const axios = require('axios');

class SimpleArabicTtsService {
    constructor() {
        this.supportedLanguages = ['ar', 'en'];
        this.voices = {
            ar: {
                female: { name: 'Arabic Female', lang: 'ar' },
                male: { name: 'Arabic Male', lang: 'ar' }
            },
            en: {
                female: { name: 'English Female', lang: 'en' },
                male: { name: 'English Male', lang: 'en' }
            }
        };
    }
    
    /**
     * Synthesizes text to speech using free TTS services
     * @param {Object} params - TTS parameters
     * @param {string} params.text - Text to synthesize
     * @param {string} params.language - Language code (ar, en)
     * @param {string} params.voiceType - Voice type (male/female)
     * @param {Object} params.options - Additional options
     * @returns {Promise<Object>} TTS result
     */
    async synthesizeText({ text, language = 'ar', voiceType = 'female', options = {} }) {
        try {
            console.log(`🗣️ Simple Arabic TTS: "${text.substring(0, 50)}..." (${language}, ${voiceType})`);
            
            // For Arabic, we'll use a free TTS service
            if (language === 'ar' || language === 'arabic') {
                return await this.synthesizeArabic(text, voiceType, options);
            } else {
                return await this.synthesizeEnglish(text, voiceType, options);
            }
            
        } catch (error) {
            console.error('❌ Simple TTS error:', error.message);
            throw new Error(`Simple TTS failed: ${error.message}`);
        }
    }
    
    /**
     * Synthesize Arabic text using free TTS
     */
    async synthesizeArabic(text, voiceType, options) {
        try {
            // Use Google Translate TTS (free, no API key required)
            const voice = voiceType === 'male' ? 'ar-SA' : 'ar-SA';
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${voice}&client=tw-ob&q=${encodeURIComponent(text)}`;
            
            console.log('🌐 Using Google Translate TTS for Arabic...');
            
            const response = await axios.get(ttsUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });
            
            if (response.data) {
                const audioBuffer = Buffer.from(response.data);
                
                console.log(`✅ Arabic TTS success: ${audioBuffer.length} bytes generated`);
                
                return {
                    success: true,
                    audioBuffer: audioBuffer,
                    contentType: 'audio/mpeg',
                    duration: this.estimateDuration(text, options.speed || 1.0),
                    method: 'google-translate'
                };
            } else {
                throw new Error('No audio data received');
            }
            
        } catch (error) {
            console.error('❌ Arabic TTS error:', error.message);
            // Fallback to browser TTS
            return this.browserTTSFallback(text, 'ar', voiceType);
        }
    }
    
    /**
     * Synthesize English text using free TTS
     */
    async synthesizeEnglish(text, voiceType, options) {
        try {
            // Use Google Translate TTS for English
            const voice = voiceType === 'male' ? 'en-US' : 'en-US';
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${voice}&client=tw-ob&q=${encodeURIComponent(text)}`;
            
            console.log('🌐 Using Google Translate TTS for English...');
            
            const response = await axios.get(ttsUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });
            
            if (response.data) {
                const audioBuffer = Buffer.from(response.data);
                
                console.log(`✅ English TTS success: ${audioBuffer.length} bytes generated`);
                
                return {
                    success: true,
                    audioBuffer: audioBuffer,
                    contentType: 'audio/mpeg',
                    duration: this.estimateDuration(text, options.speed || 1.0),
                    method: 'google-translate'
                };
            } else {
                throw new Error('No audio data received');
            }
            
        } catch (error) {
            console.error('❌ English TTS error:', error.message);
            // Fallback to browser TTS
            return this.browserTTSFallback(text, 'en', voiceType);
        }
    }
    
    /**
     * Browser TTS fallback
     */
    browserTTSFallback(text, language, voiceType) {
        console.log('🔄 Using browser TTS fallback...');
        return {
            success: true,
            text: text,
            language: language,
            voiceType: voiceType,
            method: 'browser',
            instructions: 'Use browser speechSynthesis API to speak this text',
            duration: this.estimateDuration(text, 1.0)
        };
    }
    
    /**
     * Estimates audio duration based on text length and speed
     */
    estimateDuration(text, speed = 1.0) {
        const wordsPerMinute = 150 * speed;
        const wordCount = text.split(/\s+/).length;
        return Math.max(1, (wordCount / wordsPerMinute) * 60);
    }
    
    /**
     * Gets available voices for a language
     */
    getAvailableVoices(language) {
        if (language === 'ar' || language === 'arabic') {
            return Object.keys(this.voices.ar).map(type => ({
                type,
                name: this.voices.ar[type].name,
                languageCode: this.voices.ar[type].lang,
                gender: type
            }));
        } else {
            return Object.keys(this.voices.en).map(type => ({
                type,
                name: this.voices.en[type].name,
                languageCode: this.voices.en[type].lang,
                gender: type
            }));
        }
    }
    
    /**
     * Gets service status
     */
    getStatus() {
        return {
            configured: true,
            apiKey: 'Free service (no API key needed)',
            ttsUrl: 'Google Translate TTS',
            supportedLanguages: this.supportedLanguages,
            arabicVoices: Object.keys(this.voices.ar),
            englishVoices: Object.keys(this.voices.en)
        };
    }
    
    /**
     * Checks if service is configured
     */
    isConfigured() {
        return true; // Always available
    }
}

module.exports = SimpleArabicTtsService;
