/**
 * Voice Input Validation
 * 
 * Validates voice-related input including audio files and parameters.
 */

const { body, validationResult } = require('express-validator');

/**
 * Validates audio file upload
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
function validateAudioUpload(req, res, next) {
    // Check if file exists
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No audio file provided'
        });
    }
    
    // Check file size
    if (req.file.size === 0) {
        return res.status(400).json({
            success: false,
            error: 'Audio file is empty'
        });
    }
    
    // Check file size limit (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            error: 'Audio file too large. Maximum size is 10MB'
        });
    }
    
    // Check MIME type
    const allowedTypes = [
        'audio/wav',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg',
        'audio/opus'
    ];
    
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            error: `Unsupported audio format: ${req.file.mimetype}`
        });
    }
    
    next();
}

/**
 * Validates TTS request body
 */
const validateTTSRequest = [
    body('text')
        .notEmpty()
        .withMessage('Text is required for TTS')
        .isLength({ max: 1000 })
        .withMessage('Text too long. Maximum 1000 characters'),
    
    body('language')
        .optional()
        .isIn(['en', 'ar', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'zh', 'ja', 'hu', 'ko'])
        .withMessage('Invalid language code'),
    
    body('voiceType')
        .optional()
        .isIn(['male', 'female'])
        .withMessage('Voice type must be male or female'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        next();
    }
];

/**
 * Validates voice configuration
 */
const validateVoiceConfig = [
    body('stt.provider')
        .optional()
        .isIn(['whisper', 'deepgram', 'browser'])
        .withMessage('Invalid STT provider'),
    
    body('tts.provider')
        .optional()
        .isIn(['xtts', 'browser'])
        .withMessage('Invalid TTS provider'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateAudioUpload,
    validateTTSRequest,
    validateVoiceConfig
};
