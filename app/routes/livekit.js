/**
 * LiveKit Routes
 * 
 * API endpoints for real-time voice assistant functionality
 * with LiveKit integration and RAG processing.
 */

const express = require('express');
const router = express.Router();
const LiveKitController = require('../controllers/livekitController');

// Initialize controller
const livekitController = new LiveKitController();

// Middleware for request logging
router.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - LiveKit API: ${req.method} ${req.path}`);
    next();
});

/**
 * @route POST /api/livekit/room/join
 * @desc Create or join a voice assistant room
 * @access Public
 */
router.post('/room/join', async (req, res) => {
    await livekitController.createOrJoinRoom(req, res);
});

/**
 * @route POST /api/livekit/audio/process
 * @desc Process real-time audio stream with RAG
 * @access Public
 */
router.post('/audio/process', async (req, res) => {
    await livekitController.processAudioStream(req, res);
});

/**
 * @route POST /api/livekit/voice/activity
 * @desc Handle voice activity detection
 * @access Public
 */
router.post('/voice/activity', async (req, res) => {
    await livekitController.handleVoiceActivity(req, res);
});

/**
 * @route GET /api/livekit/room/:roomName
 * @desc Get room information and participants
 * @access Public
 */
router.get('/room/:roomName', async (req, res) => {
    await livekitController.getRoomInfo(req, res);
});

/**
 * @route POST /api/livekit/room/leave
 * @desc Leave room and cleanup
 * @access Public
 */
router.post('/room/leave', async (req, res) => {
    await livekitController.leaveRoom(req, res);
});

/**
 * @route GET /api/livekit/conversation/:participantId
 * @desc Get conversation history for a user
 * @access Public
 */
router.get('/conversation/:participantId', async (req, res) => {
    await livekitController.getConversationHistory(req, res);
});

/**
 * @route DELETE /api/livekit/conversation/:participantId
 * @desc Clear conversation history for a user
 * @access Public
 */
router.delete('/conversation/:participantId', async (req, res) => {
    await livekitController.clearConversationHistory(req, res);
});

/**
 * @route GET /api/livekit/status
 * @desc Get LiveKit service status and statistics
 * @access Public
 */
router.get('/status', async (req, res) => {
    await livekitController.getServiceStatus(req, res);
});

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('LiveKit API Error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

module.exports = router;
