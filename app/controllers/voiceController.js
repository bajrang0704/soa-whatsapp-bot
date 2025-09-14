/**
 * Voice Controller
 * 
 * Handles voice-related operations including STT, TTS, and voice streaming.
 */

const VoiceService = require('../../core/ai/voiceService');
const { asyncHandler } = require('../middleware/errorHandler');
const enhancedRagService = require('../../core/university/enhancedRagService');

class VoiceController {
    constructor() {
        this.voiceService = new VoiceService();
        // Simple response cache for common queries
        this.responseCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    /**
     * Handles speech-to-text conversion
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async speechToText(req, res) {
        try {
            const { language = 'en' } = req.body;
            const audioBuffer = req.file.buffer;
            const contentType = req.file.mimetype;
            
            const result = await this.voiceService.speechToText({
                audioBuffer,
                contentType,
                language
            });
            
            res.json({
                success: true,
                ...result
            });
            
        } catch (error) {
            console.error('❌ STT error:', error);
            res.status(500).json({
                success: false,
                error: 'Speech-to-text conversion failed',
                message: error.message
            });
        }
    }
    
    /**
     * Handles text-to-speech conversion
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async textToSpeech(req, res) {
        try {
            const { text, language = 'en', voiceType = 'female', options = {} } = req.body;
            
            if (!text || text.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: 'Text is required for TTS'
                });
            }
            
            const result = await this.voiceService.textToSpeech({
                text,
                language,
                voiceType,
                options
            });
            
            if (result.success) {
                res.setHeader('Content-Type', 'audio/wav');
                res.setHeader('Content-Disposition', 'attachment; filename="synthesized_audio.wav"');
                res.send(result.audioBuffer);
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Text-to-speech conversion failed'
                });
            }
            
        } catch (error) {
            console.error('❌ TTS error:', error);
            res.status(500).json({
                success: false,
                error: 'Text-to-speech conversion failed',
                message: error.message
            });
        }
    }
    
    /**
     * Test voice processing with debug information
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async testVoice(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No audio file provided'
                });
            }

            const { language = 'en' } = req.body;
            
            // Handle audio buffer
            let audioBuffer;
            if (req.file.buffer) {
                audioBuffer = req.file.buffer;
            } else if (req.file.path) {
                const fs = require('fs');
                audioBuffer = fs.readFileSync(req.file.path);
                fs.unlinkSync(req.file.path);
            } else {
                throw new Error('No audio data found in uploaded file');
            }

            const contentType = req.file.mimetype;
            
            console.log('🧪 Voice Test - Audio Info:', {
                size: audioBuffer.length,
                type: contentType,
                language,
                originalName: req.file.originalname
            });

            // Test STT directly
            const sttResult = await this.voiceService.speechToText({
                audioBuffer,
                contentType,
                language
            });

            res.json({
                success: true,
                test: 'voice-processing',
                audioInfo: {
                    size: audioBuffer.length,
                    type: contentType,
                    language
                },
                sttResult,
                message: 'Voice test completed - check console for detailed logs'
            });

        } catch (error) {
            console.error('❌ Voice test error:', error);
            res.status(500).json({
                success: false,
                error: 'Voice test failed',
                message: error.message
            });
        }
    }

    /**
     * Gets voice configuration
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async getConfig(req, res) {
        try {
            const config = await this.voiceService.getConfig();
            
            res.json({
                success: true,
                config
            });
            
        } catch (error) {
            console.error('❌ Get config error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get voice configuration',
                message: error.message
            });
        }
    }
    
    /**
     * Updates voice configuration
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async updateConfig(req, res) {
        try {
            const { stt, tts, voices } = req.body;
            
            const result = await this.voiceService.updateConfig({
                stt,
                tts,
                voices
            });
            
            res.json({
                success: true,
                message: 'Voice configuration updated successfully',
                ...result
            });
            
        } catch (error) {
            console.error('❌ Update config error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update voice configuration',
                message: error.message
            });
        }
    }
    
    /**
     * Tests the audio system
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async testAudioSystem(req, res) {
        try {
            const result = await this.voiceService.testAudioSystem();
            
            res.json({
                success: true,
                ...result
            });
            
        } catch (error) {
            console.error('❌ Test audio system error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to test audio system',
                message: error.message
            });
        }
    }
    
    /**
     * Tests STT with uploaded file
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async testSTTWithFile(req, res) {
        try {
            const { language = 'en' } = req.body;
            const audioBuffer = req.file.buffer;
            const contentType = req.file.mimetype;
            
            const result = await this.voiceService.testSTTWithFile({
                audioBuffer,
                contentType,
                language
            });
            
            res.json({
                success: true,
                ...result
            });
            
        } catch (error) {
            console.error('❌ Test STT error:', error);
            res.status(500).json({
                success: false,
                error: 'STT test failed',
                message: error.message
            });
        }
    }
    
    /**
     * Gets memory statistics
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async getMemoryStats(req, res) {
        try {
            const stats = await this.voiceService.getMemoryStats();
            
            res.json({
                success: true,
                timestamp: new Date().toISOString(),
                ...stats
            });
            
        } catch (error) {
            console.error('❌ Get memory stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get memory statistics',
                message: error.message
            });
        }
    }
    
    /**
     * Clears memory for a client
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async clearMemory(req, res) {
        try {
            const { clientId } = req.params;
            
            const success = await this.voiceService.clearMemory(clientId);
            
            res.json({
                success,
                message: success ? 'Memory cleared successfully' : 'Failed to clear memory',
                clientId
            });
            
        } catch (error) {
            console.error('❌ Clear memory error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear memory',
                message: error.message
            });
        }
    }
    
    /**
     * Processes voice audio using Google Cloud STT and TTS
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async processVoice(req, res) {
        try {
            console.log('🎤 Process voice request received:', {
                hasFile: !!req.file,
                fileKeys: req.file ? Object.keys(req.file) : 'no file',
                bodyKeys: Object.keys(req.body)
            });
            
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No audio file provided'
                });
            }
            
            const { language = 'en' } = req.body;
            
            // Handle both memory and disk storage
            let audioBuffer;
            if (req.file.buffer) {
                // Memory storage
                audioBuffer = req.file.buffer;
            } else if (req.file.path) {
                // Disk storage - read file from disk
                const fs = require('fs');
                audioBuffer = fs.readFileSync(req.file.path);
                // Clean up temporary file
                fs.unlinkSync(req.file.path);
            } else {
                throw new Error('No audio data found in uploaded file');
            }
            
            const contentType = req.file.mimetype;
            
            console.log('🎤 Processing voice audio with Google Cloud:', {
                size: audioBuffer ? audioBuffer.length : 'undefined',
                type: contentType,
                language,
                filePath: req.file.path,
                originalName: req.file.originalname,
                fieldname: req.file.fieldname,
                mimetype: req.file.mimetype
            });
            
            // Step 1: Google Cloud Speech-to-Text (optimized for speed)
            const sttResult = await this.voiceService.speechToText({
                audioBuffer,
                contentType,
                language
            });
            
            console.log(`✅ Google Cloud STT result: "${sttResult.transcript}" (confidence: ${sttResult.confidence})`);
            
            // Step 2: Process with RAG (if transcript exists) - with caching and timeout optimization
            let ragResult = null;
            if (sttResult.transcript && sttResult.transcript.trim()) {
                try {
                    // Determine response language based on detected language and user preference
                    const responseLanguage = this.determineResponseLanguage(sttResult.language, sttResult.transcript, language);
                    
                    // Check cache first for faster response
                    const cacheKey = `${sttResult.transcript.toLowerCase()}_${responseLanguage}`;
                    const cachedResponse = this.responseCache.get(cacheKey);
                    
                    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < this.cacheTimeout) {
                        console.log(`🚀 Using cached RAG response for: "${sttResult.transcript}"`);
                        ragResult = cachedResponse.data;
                    } else {
                        console.log(`🧠 Processing RAG query: "${sttResult.transcript}" (${responseLanguage})`);
                        
                        // Call Enhanced RAG service directly (no HTTP call needed)
                        const ragResponse = await enhancedRagService.processQuery(
                            sttResult.transcript,
                            'voice-pipeline-' + Date.now(),
                            responseLanguage,
                            'hybrid',
                            true // This is a voice interaction
                        );
                        
                        if (!ragResponse.success) {
                            throw new Error('RAG processing failed: ' + ragResponse.error);
                        }
                        
                        ragResult = {
                            response: ragResponse.response,
                            confidence: ragResponse.confidence,
                            language: responseLanguage
                        };
                        
                        // Cache the response
                        this.responseCache.set(cacheKey, {
                            data: ragResult,
                            timestamp: Date.now()
                        });
                        
                        console.log(`✅ RAG Response (${responseLanguage}): "${ragResult.response}"`);
                    }
                    
                } catch (ragError) {
                    console.error('❌ RAG processing error:', ragError.message);
                    // Continue without RAG response
                }
            }
            
            // Step 3: Generate Google Cloud TTS response (if RAG result exists)
            let ttsResult = null;
            if (ragResult && ragResult.response) {
                try {
                    const responseLanguage = ragResult.language;
                    const voiceType = 'female'; // Default voice type
                    
                    console.log(`🗣️ Generating Google Cloud TTS response (${responseLanguage}): "${ragResult.response.substring(0, 50)}..."`);
                    
                    ttsResult = await this.voiceService.textToSpeech({
                        text: ragResult.response,
                        language: responseLanguage,
                        voiceType: voiceType,
                        options: {
                            speed: 1.2, // Faster speech rate
                            pitch: 0.0,
                            volume: 0.0
                        }
                    });
                    
                    console.log(`✅ Google Cloud TTS generated (${responseLanguage}): ${ttsResult.method || 'google-cloud'}`);
                    
                } catch (ttsError) {
                    console.error('❌ Google Cloud TTS generation error:', ttsError.message);
                    // Continue without TTS
                }
            }
            
            // Return complete pipeline result
            res.json({
                success: true,
                pipeline: {
                    stt: {
                        transcript: sttResult.transcript,
                        confidence: sttResult.confidence,
                        language: sttResult.language,
                        duration: sttResult.duration,
                        provider: 'google-cloud'
                    },
                    rag: ragResult ? {
                        response: ragResult.response,
                        confidence: ragResult.confidence,
                        language: ragResult.language
                    } : null,
                    tts: ttsResult ? {
                        method: ttsResult.method || 'google-cloud',
                        audioBuffer: ttsResult.audioBuffer ? ttsResult.audioBuffer.toString('base64') : null,
                        contentType: ttsResult.contentType,
                        duration: ttsResult.duration,
                        instructions: ttsResult.instructions
                    } : null
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Process voice error:', error);
            res.status(500).json({
                success: false,
                error: 'Voice processing failed',
                message: error.message
            });
        }
    }
    
    /**
     * Determines the response language based on detected language and transcript
     * @param {string} detectedLanguage - Language detected by STT
     * @param {string} transcript - The transcript text
     * @param {string} userPreferredLanguage - User's preferred language from frontend
     * @returns {string} Response language code
     */
    determineResponseLanguage(detectedLanguage, transcript, userPreferredLanguage = null) {
        console.log(`🔍 Language detection: STT detected "${detectedLanguage}", transcript: "${transcript}", user preferred: "${userPreferredLanguage}"`);
        
        // PRIORITY 1: If user has explicitly set a language preference, respect it
        if (userPreferredLanguage && userPreferredLanguage !== 'auto') {
            console.log(`✅ Using user preferred language: ${userPreferredLanguage}`);
            return userPreferredLanguage;
        }
        
        // Check if transcript contains Arabic characters (most reliable)
        const arabicRegex = /[\u0600-\u06FF]/;
        const hasArabicChars = arabicRegex.test(transcript);
        
        // Check for common Arabic words/phrases (even if transliterated)
        const arabicWords = [
            'mahia', 'sharud', 'qubul', 'marhaba', 'ahlan', 'shukran', 'afwan',
            'naam', 'la', 'ma', 'kayf', 'hal', 'ana', 'anta', 'anti', 'huwa', 'hiya',
            'nahnu', 'antum', 'hum', 'hunna', 'min', 'ila', 'fi', 'ala', 'ma3a',
            'qulub', 'aqsam', 'kulliya', 'jamia', 'talib', 'taliba', 'ustadh', 'ustadha'
        ];
        
        const transcriptLower = transcript.toLowerCase();
        const hasArabicWords = arabicWords.some(word => transcriptLower.includes(word));
        
        // PRIORITY 2: If transcript has actual Arabic characters, it's definitely Arabic
        if (hasArabicChars) {
            console.log(`✅ Detected Arabic: Arabic characters found`);
            return 'ar';
        }
        
        // PRIORITY 3: If STT detected Arabic language, trust it
        if (detectedLanguage === 'ar' || detectedLanguage === 'arabic') {
            console.log(`✅ Detected Arabic: STT detected Arabic language`);
            return 'ar';
        }
        
        // PRIORITY 4: If STT detected English, trust it (even if some Arabic words are present)
        if (detectedLanguage === 'en' || detectedLanguage === 'en_us' || detectedLanguage === 'en-US') {
            console.log(`✅ Detected English: STT detected English language`);
            return 'en';
        }
        
        // PRIORITY 5: Check for Arabic words only if STT language is unclear
        if (hasArabicWords && !detectedLanguage) {
            console.log(`✅ Detected Arabic: Arabic words found and no clear STT language`);
            return 'ar';
        }
        
        // PRIORITY 6: Check if transcript contains English words
        const englishRegex = /[a-zA-Z]/;
        if (englishRegex.test(transcript)) {
            console.log(`✅ Detected English: contains English characters`);
            return 'en';
        }
        
        // Default to English
        console.log(`⚠️ Defaulting to English`);
        return 'en';
    }
}

module.exports = VoiceController;
