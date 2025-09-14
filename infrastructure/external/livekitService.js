/**
 * LiveKit Service
 * 
 * Ultra-low latency real-time audio streaming service for natural voice conversations
 * with RAG integration for intelligent responses.
 */

const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');
const axios = require('axios');
const StreamingTtsService = require('./streamingTtsService');

class LiveKitService {
    constructor() {
        // LiveKit server configuration
        this.livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
        this.apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
        this.apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
        
        // Room management
        this.roomService = new RoomServiceClient(this.livekitUrl, this.apiKey, this.apiSecret);
        this.activeRooms = new Map();
        this.userSessions = new Map();
        
        // RAG integration
        this.ragServerUrl = 'http://localhost:3001';
        
        // Streaming TTS service
        this.streamingTts = new StreamingTtsService();
        
        console.log('🎙️ LiveKit Service initialized for ultra-low latency voice streaming');
    }

    /**
     * Generate access token for user to join room
     * @param {string} roomName - Room name
     * @param {string} participantName - Participant name
     * @param {string} participantIdentity - Unique participant identity
     * @returns {string} JWT access token
     */
    generateAccessToken(roomName, participantName, participantIdentity) {
        const at = new AccessToken(this.apiKey, this.apiSecret, {
            identity: participantIdentity,
            name: participantName,
        });

        at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        return at.toJwt();
    }

    /**
     * Create or get existing room
     * @param {string} roomName - Room name
     * @param {Object} options - Room options
     * @returns {Promise<Object>} Room information
     */
    async createOrGetRoom(roomName, options = {}) {
        try {
            // Check if room exists
            const existingRooms = await this.roomService.listRooms([roomName]);
            
            if (existingRooms.length > 0) {
                console.log(`📺 Using existing room: ${roomName}`);
                return existingRooms[0];
            }

            // Create new room
            const room = await this.roomService.createRoom({
                name: roomName,
                maxParticipants: options.maxParticipants || 10,
                emptyTimeout: options.emptyTimeout || 300, // 5 minutes
                metadata: JSON.stringify({
                    type: 'voice-assistant',
                    created: new Date().toISOString(),
                    ragEnabled: true
                })
            });

            console.log(`🆕 Created new room: ${roomName}`);
            return room;

        } catch (error) {
            console.error('❌ Error creating/getting room:', error);
            throw error;
        }
    }

    /**
     * Join user to room with voice assistant capabilities
     * @param {string} roomName - Room name
     * @param {string} userId - User ID
     * @param {string} userName - User name
     * @returns {Promise<Object>} Join information
     */
    async joinRoom(roomName, userId, userName) {
        try {
            // Create or get room
            const room = await this.createOrGetRoom(roomName);
            
            // Generate access token
            const token = this.generateAccessToken(roomName, userName, userId);
            
            // Store user session
            this.userSessions.set(userId, {
                roomName,
                userName,
                joinedAt: new Date().toISOString(),
                isActive: true
            });

            console.log(`👤 User ${userName} (${userId}) joined room ${roomName}`);

            return {
                roomName,
                token,
                url: this.livekitUrl,
                participant: {
                    identity: userId,
                    name: userName
                }
            };

        } catch (error) {
            console.error('❌ Error joining room:', error);
            throw error;
        }
    }

    /**
     * Process real-time audio with RAG integration
     * @param {string} roomName - Room name
     * @param {string} participantId - Participant ID
     * @param {Buffer} audioData - Audio data
     * @param {Object} metadata - Audio metadata
     * @returns {Promise<Object>} RAG response
     */
    async processRealtimeAudio(roomName, participantId, audioData, metadata = {}) {
        try {
            console.log(`🎤 Processing real-time audio from ${participantId} in room ${roomName}`);
            
            // Convert audio to text using Deepgram (or your preferred STT)
            const transcript = await this.speechToText(audioData, metadata.language || 'en');
            
            if (!transcript || transcript.trim().length === 0) {
                return { success: false, message: 'No speech detected' };
            }

            console.log(`📝 Transcript: "${transcript}"`);

            // Process with RAG system
            const ragResponse = await this.processWithRAG(transcript, metadata.language || 'en', participantId);
            
            // Convert response to speech using streaming TTS
            const audioResponse = await this.streamingTts.streamToRoom(
                ragResponse.response, 
                roomName, 
                participantId, 
                { 
                    language: metadata.language || 'en',
                    provider: 'deepgram'
                }
            );
            
            return {
                success: true,
                transcript,
                response: ragResponse.response,
                audioResponse: audioResponse.success ? 'streamed' : null,
                confidence: ragResponse.confidence,
                sources: ragResponse.sources
            };

        } catch (error) {
            console.error('❌ Error processing real-time audio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process text with RAG system
     * @param {string} text - Input text
     * @param {string} language - Language code
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} RAG response
     */
    async processWithRAG(text, language, sessionId) {
        try {
            const response = await axios.post(`${this.ragServerUrl}/query`, {
                message: text,
                sessionId: `livekit_${sessionId}_${Date.now()}`,
                searchType: 'hybrid',
                language: language
            }, {
                timeout: 3000, // 3 second timeout for real-time
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                return {
                    response: response.data.response,
                    confidence: response.data.confidence,
                    sources: response.data.sources,
                    performance: response.data.performance
                };
            } else {
                throw new Error('RAG processing failed');
            }

        } catch (error) {
            console.error('❌ RAG processing error:', error);
            // Fallback response
            return {
                response: language === 'ar' 
                    ? 'عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.'
                    : 'Sorry, I couldn\'t process your request. Please try again.',
                confidence: 0.3,
                sources: [],
                performance: { responseTime: '0ms' }
            };
        }
    }

    /**
     * Convert speech to text using Deepgram
     * @param {Buffer} audioData - Audio data
     * @param {string} language - Language code
     * @returns {Promise<string>} Transcript
     */
    async speechToText(audioData, language = 'en') {
        try {
            const formData = new FormData();
            const audioBlob = new Blob([audioData], { type: 'audio/webm' });
            formData.append('audio', audioBlob, 'realtime.webm');
            formData.append('language', language);

            const response = await axios.post('/api/voice/speech-to-text', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 2000 // 2 second timeout for real-time
            });

            if (response.data.success && response.data.transcript) {
                return response.data.transcript;
            }

            return '';

        } catch (error) {
            console.error('❌ Speech-to-text error:', error);
            return '';
        }
    }

    /**
     * Convert text to speech using Deepgram TTS
     * @param {string} text - Text to convert
     * @param {string} language - Language code
     * @returns {Promise<Buffer>} Audio data
     */
    async textToSpeech(text, language = 'en') {
        try {
            const response = await axios.post('/api/voice/text-to-speech', {
                text: text,
                language: language
            }, {
                responseType: 'arraybuffer',
                timeout: 3000 // 3 second timeout for real-time
            });

            return Buffer.from(response.data);

        } catch (error) {
            console.error('❌ Text-to-speech error:', error);
            return null;
        }
    }

    /**
     * Handle room events and participant management
     * @param {string} roomName - Room name
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    async handleRoomEvent(roomName, event, data) {
        switch (event) {
            case 'participant_joined':
                console.log(`👋 Participant joined room ${roomName}:`, data.participant.identity);
                break;
                
            case 'participant_left':
                console.log(`👋 Participant left room ${roomName}:`, data.participant.identity);
                break;
                
            case 'track_published':
                if (data.track.kind === 'audio') {
                    console.log(`🎤 Audio track published in room ${roomName} by ${data.participant.identity}`);
                }
                break;
                
            case 'track_unpublished':
                if (data.track.kind === 'audio') {
                    console.log(`🔇 Audio track unpublished in room ${roomName} by ${data.participant.identity}`);
                }
                break;
                
            default:
                console.log(`📡 Room event ${event} in ${roomName}:`, data);
        }
    }

    /**
     * Get room statistics
     * @param {string} roomName - Room name
     * @returns {Promise<Object>} Room statistics
     */
    async getRoomStats(roomName) {
        try {
            const rooms = await this.roomService.listRooms([roomName]);
            if (rooms.length === 0) {
                return null;
            }

            const room = rooms[0];
            const participants = await this.roomService.listParticipants(roomName);

            return {
                roomName,
                numParticipants: participants.length,
                maxParticipants: room.maxParticipants,
                creationTime: room.creationTime,
                metadata: JSON.parse(room.metadata || '{}'),
                participants: participants.map(p => ({
                    identity: p.identity,
                    name: p.name,
                    joinedAt: p.joinedAt
                }))
            };

        } catch (error) {
            console.error('❌ Error getting room stats:', error);
            return null;
        }
    }

    /**
     * Clean up inactive rooms and sessions
     */
    async cleanup() {
        try {
            const rooms = await this.roomService.listRooms();
            const now = Date.now();
            
            for (const room of rooms) {
                const participants = await this.roomService.listParticipants(room.name);
                
                // Delete empty rooms older than 1 hour
                if (participants.length === 0) {
                    const roomAge = now - new Date(room.creationTime).getTime();
                    if (roomAge > 3600000) { // 1 hour
                        await this.roomService.deleteRoom(room.name);
                        console.log(`🗑️ Deleted inactive room: ${room.name}`);
                    }
                }
            }

            // Clean up user sessions
            for (const [userId, session] of this.userSessions.entries()) {
                const sessionAge = now - new Date(session.joinedAt).getTime();
                if (sessionAge > 7200000) { // 2 hours
                    this.userSessions.delete(userId);
                    console.log(`🗑️ Cleaned up session for user: ${userId}`);
                }
            }

        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }

    /**
     * Get service status
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            status: 'active',
            livekitUrl: this.livekitUrl,
            activeRooms: this.activeRooms.size,
            activeSessions: this.userSessions.size,
            ragServerUrl: this.ragServerUrl,
            features: [
                'Real-time audio streaming',
                'RAG integration',
                'Voice activity detection',
                'Multi-language support',
                'Ultra-low latency'
            ]
        };
    }
}

module.exports = LiveKitService;
