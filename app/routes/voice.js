/**
 * Voice API Routes
 * 
 * Handles all voice-related API endpoints including STT, TTS, and voice streaming.
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateAudioUpload, validateTTSRequest } = require('../validators/voiceValidator');

const VoiceController = require('../controllers/voiceController');

/**
 * Sets up voice routes
 * @returns {express.Router} Configured voice router
 */
function setupVoiceRoutes() {
    const router = express.Router();
    const voiceController = new VoiceController();
    
    // Speech-to-Text endpoint
    router.post('/speech-to-text', 
        (req, res, next) => {
            // Use memory upload for voice processing
            const memoryUpload = req.app.locals.memoryUpload;
            memoryUpload.single('audio')(req, res, next);
        },
        validateAudioUpload,
        asyncHandler(voiceController.speechToText.bind(voiceController))
    );
    
    // Process voice endpoint for fallback service
    router.post('/process',
        (req, res, next) => {
            // Use memory upload for voice processing
            const memoryUpload = req.app.locals.memoryUpload;
            memoryUpload.single('audio')(req, res, next);
        },
        validateAudioUpload,
        asyncHandler(voiceController.processVoice.bind(voiceController))
    );
    
    // Text-to-Speech endpoint
    router.post('/text-to-speech',
        validateTTSRequest,
        asyncHandler(voiceController.textToSpeech.bind(voiceController))
    );
    
    // Voice configuration endpoints
    router.get('/config',
        asyncHandler(voiceController.getConfig.bind(voiceController))
    );
    
    router.post('/config',
        asyncHandler(voiceController.updateConfig.bind(voiceController))
    );
    
    // Voice system test endpoints
    router.get('/test-audio',
        asyncHandler(voiceController.testAudioSystem.bind(voiceController))
    );
    
    router.post('/test-stt-with-file',
        validateAudioUpload,
        asyncHandler(voiceController.testSTTWithFile.bind(voiceController))
    );
    
    // Voice test endpoint for debugging
    router.post('/test',
        (req, res, next) => {
            // Use memory upload for voice processing
            const memoryUpload = req.app.locals.memoryUpload;
            memoryUpload.single('audio')(req, res, next);
        },
        validateAudioUpload,
        asyncHandler(voiceController.testVoice.bind(voiceController))
    );
    
    // Voice streaming endpoints
    router.get('/memory-stats',
        asyncHandler(voiceController.getMemoryStats.bind(voiceController))
    );
    
    router.delete('/memory/:clientId',
        asyncHandler(voiceController.clearMemory.bind(voiceController))
    );
    
    // Health check endpoint for debugging ngrok issues
    router.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            protocol: req.protocol,
            host: req.get('host'),
            origin: req.get('origin'),
            userAgent: req.get('user-agent'),
            secure: req.secure,
            endpoints: {
                speechToText: '/api/voice/speech-to-text',
                textToSpeech: '/api/voice/text-to-speech',
                process: '/api/voice/process'
            }
        });
    });
    
    return router;
}

module.exports = { setupVoiceRoutes };
