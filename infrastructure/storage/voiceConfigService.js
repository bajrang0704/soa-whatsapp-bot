/**
 * Voice Configuration Service
 * 
 * Manages voice configuration including STT, TTS, and voice settings.
 */

const fs = require('fs');
const path = require('path');

class VoiceConfigService {
    constructor() {
        this.configPath = path.join(__dirname, '../../../config/voice-config.json');
        this.config = this.loadConfig();
    }
    
    /**
     * Loads configuration from file
     * @returns {Object} Configuration object
     */
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('❌ Error loading voice config:', error);
        }
        
        return this.getDefaultConfig();
    }
    
    /**
     * Saves configuration to file
     * @param {Object} config - Configuration object
     */
    saveConfig(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            this.config = config;
            console.log('✅ Voice configuration saved');
        } catch (error) {
            console.error('❌ Error saving voice config:', error);
            throw error;
        }
    }
    
    /**
     * Gets current configuration
     * @returns {Object} Configuration object
     */
    getConfig() {
        return this.config;
    }
    
    /**
     * Updates STT configuration
     * @param {string} provider - STT provider
     * @param {Object} settings - STT settings
     */
    updateSTTConfig(provider, settings) {
        this.config.stt = {
            ...this.config.stt,
            provider,
            [provider]: settings
        };
        this.saveConfig(this.config);
    }
    
    /**
     * Updates TTS configuration
     * @param {string} provider - TTS provider
     * @param {Object} settings - TTS settings
     */
    updateTTSConfig(provider, settings) {
        this.config.tts = {
            ...this.config.tts,
            provider,
            [provider]: settings
        };
        this.saveConfig(this.config);
    }
    
    /**
     * Adds voice configuration
     * @param {string} language - Language code
     * @param {string} voiceType - Voice type (male/female)
     * @param {Object} voiceConfig - Voice configuration
     */
    addVoice(language, voiceType, voiceConfig) {
        if (!this.config.voices[language]) {
            this.config.voices[language] = {};
        }
        
        this.config.voices[language][voiceType] = voiceConfig;
        this.saveConfig(this.config);
    }
    
    /**
     * Gets available voices
     * @returns {Object} Voices configuration
     */
    getVoices() {
        return this.config.voices;
    }
    
    /**
     * Gets default configuration
     * @returns {Object} Default configuration
     */
    getDefaultConfig() {
        return {
            stt: {
                provider: 'deepgram',
                deepgram: {
                    model: 'nova-2',
                    language: 'auto',
                    smart_format: true
                }
            },
            tts: {
                provider: 'xtts',
                xtts: {
                    model: 'xtts_v2',
                    useServer: false
                }
            },
            voices: {
                en: {
                    female: {
                        name: 'English Female',
                        file: 'female_voice_en.wav',
                        provider: 'xtts',
                        settings: {
                            speed: 1,
                            emotion: 'neutral'
                        }
                    },
                    male: {
                        name: 'English Male',
                        file: 'male_voice_en.wav',
                        provider: 'xtts',
                        settings: {
                            speed: 1,
                            emotion: 'neutral'
                        }
                    }
                }
            },
            supported_languages: ['en', 'ar'],
            features: {
                voiceCloning: true,
                realTimeSTT: true,
                emotionalTTS: true,
                languageDetection: true
            },
            quality: {
                sttConfidenceThreshold: 0.7,
                maxAudioLength: 60,
                audioFormat: 'wav',
                sampleRate: 22050
            }
        };
    }
}

module.exports = VoiceConfigService;
