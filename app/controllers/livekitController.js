/**
 * LiveKit Controller
 * 
 * Handles LiveKit room management, real-time audio processing,
 * and integration with RAG system for natural voice conversations.
 */

const LiveKitService = require('../../infrastructure/external/livekitService');
const { RoomServiceClient } = require('livekit-server-sdk');

class LiveKitController {
    constructor() {
        this.livekitService = new LiveKitService();
        this.roomService = new RoomServiceClient(
            process.env.LIVEKIT_URL || 'ws://localhost:7880',
            process.env.LIVEKIT_API_KEY || 'devkey',
            process.env.LIVEKIT_API_SECRET || 'secret'
        );
        
        // Voice activity detection
        this.voiceActivityThreshold = 0.1;
        this.silenceTimeout = 2000; // 2 seconds
        this.userVoiceStates = new Map();
        
        console.log('🎙️ LiveKit Controller initialized');
    }

    /**
     * Create or join a voice assistant room
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async createOrJoinRoom(req, res) {
        try {
            const { roomName, userId, userName, language = 'en' } = req.body;

            if (!roomName || !userId || !userName) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: roomName, userId, userName'
                });
            }

            // Join room with LiveKit
            const joinInfo = await this.livekitService.joinRoom(roomName, userId, userName);
            
            // Initialize voice state for user
            this.userVoiceStates.set(userId, {
                isSpeaking: false,
                lastActivity: Date.now(),
                language: language,
                conversationContext: []
            });

            res.json({
                success: true,
                ...joinInfo,
                features: {
                    realTimeAudio: true,
                    voiceActivityDetection: true,
                    ragIntegration: true,
                    multiLanguage: true
                }
            });

        } catch (error) {
            console.error('❌ Error creating/joining room:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create or join room',
                message: error.message
            });
        }
    }

    /**
     * Process real-time audio stream
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async processAudioStream(req, res) {
        try {
            const { roomName, participantId, audioData, metadata = {} } = req.body;

            if (!roomName || !participantId || !audioData) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: roomName, participantId, audioData'
                });
            }

            // Get user voice state
            const voiceState = this.userVoiceStates.get(participantId);
            if (!voiceState) {
                return res.status(404).json({
                    success: false,
                    error: 'User session not found'
                });
            }

            // Process audio with RAG
            const result = await this.livekitService.processRealtimeAudio(
                roomName, 
                participantId, 
                Buffer.from(audioData, 'base64'), 
                { ...metadata, language: voiceState.language }
            );

            if (result.success) {
                // Update conversation context
                voiceState.conversationContext.push({
                    user: result.transcript,
                    assistant: result.response,
                    timestamp: new Date().toISOString()
                });

                // Keep only last 10 exchanges
                if (voiceState.conversationContext.length > 10) {
                    voiceState.conversationContext = voiceState.conversationContext.slice(-10);
                }

                // Update voice activity
                voiceState.lastActivity = Date.now();
                voiceState.isSpeaking = false;

                res.json({
                    success: true,
                    transcript: result.transcript,
                    response: result.response,
                    audioResponse: result.audioResponse ? result.audioResponse.toString('base64') : null,
                    confidence: result.confidence,
                    sources: result.sources,
                    conversationId: `conv_${participantId}_${Date.now()}`
                });
            } else {
                res.json({
                    success: false,
                    error: result.error || 'Audio processing failed'
                });
            }

        } catch (error) {
            console.error('❌ Error processing audio stream:', error);
            res.status(500).json({
                success: false,
                error: 'Audio processing failed',
                message: error.message
            });
        }
    }

    /**
     * Handle voice activity detection
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async handleVoiceActivity(req, res) {
        try {
            const { participantId, isSpeaking, audioLevel, roomName } = req.body;

            if (!participantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing participantId'
                });
            }

            const voiceState = this.userVoiceStates.get(participantId);
            if (!voiceState) {
                return res.status(404).json({
                    success: false,
                    error: 'User session not found'
                });
            }

            // Update voice state
            voiceState.isSpeaking = isSpeaking;
            voiceState.lastActivity = Date.now();
            voiceState.audioLevel = audioLevel;

            // Handle turn-taking logic
            if (isSpeaking && audioLevel > this.voiceActivityThreshold) {
                // User is speaking - prepare for response
                console.log(`🎤 User ${participantId} is speaking (level: ${audioLevel})`);
            } else if (!isSpeaking && voiceState.isSpeaking) {
                // User stopped speaking - process their input
                console.log(`🔇 User ${participantId} stopped speaking`);
                
                // Check if we should respond
                const silenceDuration = Date.now() - voiceState.lastActivity;
                if (silenceDuration > this.silenceTimeout) {
                    // Trigger response generation
                    console.log(`🤖 Triggering response for user ${participantId}`);
                }
            }

            res.json({
                success: true,
                voiceState: {
                    isSpeaking: voiceState.isSpeaking,
                    audioLevel: voiceState.audioLevel,
                    lastActivity: voiceState.lastActivity
                }
            });

        } catch (error) {
            console.error('❌ Error handling voice activity:', error);
            res.status(500).json({
                success: false,
                error: 'Voice activity handling failed',
                message: error.message
            });
        }
    }

    /**
     * Get room information and participants
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async getRoomInfo(req, res) {
        try {
            const { roomName } = req.params;

            if (!roomName) {
                return res.status(400).json({
                    success: false,
                    error: 'Room name is required'
                });
            }

            const roomStats = await this.livekitService.getRoomStats(roomName);
            
            if (!roomStats) {
                return res.status(404).json({
                    success: false,
                    error: 'Room not found'
                });
            }

            res.json({
                success: true,
                room: roomStats,
                voiceStates: Array.from(this.userVoiceStates.entries()).map(([userId, state]) => ({
                    userId,
                    isSpeaking: state.isSpeaking,
                    language: state.language,
                    lastActivity: state.lastActivity
                }))
            });

        } catch (error) {
            console.error('❌ Error getting room info:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get room information',
                message: error.message
            });
        }
    }

    /**
     * Leave room and cleanup
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async leaveRoom(req, res) {
        try {
            const { roomName, participantId } = req.body;

            if (!roomName || !participantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing roomName or participantId'
                });
            }

            // Clean up user voice state
            this.userVoiceStates.delete(participantId);

            console.log(`👋 User ${participantId} left room ${roomName}`);

            res.json({
                success: true,
                message: 'Successfully left room'
            });

        } catch (error) {
            console.error('❌ Error leaving room:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to leave room',
                message: error.message
            });
        }
    }

    /**
     * Get conversation history for a user
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async getConversationHistory(req, res) {
        try {
            const { participantId } = req.params;

            if (!participantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Participant ID is required'
                });
            }

            const voiceState = this.userVoiceStates.get(participantId);
            
            if (!voiceState) {
                return res.status(404).json({
                    success: false,
                    error: 'User session not found'
                });
            }

            res.json({
                success: true,
                conversationHistory: voiceState.conversationContext,
                language: voiceState.language,
                lastActivity: voiceState.lastActivity
            });

        } catch (error) {
            console.error('❌ Error getting conversation history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get conversation history',
                message: error.message
            });
        }
    }

    /**
     * Clear conversation history for a user
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async clearConversationHistory(req, res) {
        try {
            const { participantId } = req.params;

            if (!participantId) {
                return res.status(400).json({
                    success: false,
                    error: 'Participant ID is required'
                });
            }

            const voiceState = this.userVoiceStates.get(participantId);
            
            if (!voiceState) {
                return res.status(404).json({
                    success: false,
                    error: 'User session not found'
                });
            }

            voiceState.conversationContext = [];

            res.json({
                success: true,
                message: 'Conversation history cleared'
            });

        } catch (error) {
            console.error('❌ Error clearing conversation history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear conversation history',
                message: error.message
            });
        }
    }

    /**
     * Get service status and statistics
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async getServiceStatus(req, res) {
        try {
            const status = this.livekitService.getStatus();
            
            res.json({
                success: true,
                ...status,
                activeVoiceStates: this.userVoiceStates.size,
                voiceActivityThreshold: this.voiceActivityThreshold,
                silenceTimeout: this.silenceTimeout
            });

        } catch (error) {
            console.error('❌ Error getting service status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get service status',
                message: error.message
            });
        }
    }

    /**
     * Cleanup inactive sessions (called periodically)
     */
    async cleanupInactiveSessions() {
        try {
            const now = Date.now();
            const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

            for (const [participantId, voiceState] of this.userVoiceStates.entries()) {
                const inactiveTime = now - voiceState.lastActivity;
                
                if (inactiveTime > inactiveThreshold) {
                    this.userVoiceStates.delete(participantId);
                    console.log(`🗑️ Cleaned up inactive session for user: ${participantId}`);
                }
            }

            // Also cleanup LiveKit rooms
            await this.livekitService.cleanup();

        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

module.exports = LiveKitController;
