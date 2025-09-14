const WebSocket = require('ws');
const DeepgramService = require('../../infrastructure/external/deepgramService');
const ragService = require('../university/ragService');
const MemoryService = require('../memory/memoryService');

class VoiceStreamService {
    constructor(server) {
        // Use a different path for WebSocket to avoid conflicts with Socket.io
        this.wss = new WebSocket.Server({ 
            server,
            path: '/voice-stream'
        });
        this.deepgramService = new DeepgramService();
        this.memoryService = new MemoryService();
        this.clients = new Map();
        
        this.setupWebSocketHandlers();
        console.log('🎙️ Voice streaming service initialized on /voice-stream');
        console.log('🧠 Memory service initialized with local storage');
    }

    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId();
            console.log(`🔗 Client connected: ${clientId}`);
            
            // Initialize client session
            this.clients.set(clientId, {
                ws,
                isStreaming: false,
                audioBuffer: Buffer.alloc(0),
                language: 'en'
            });
            
            // Load conversation history from memory
            this.loadClientHistory(clientId);

            ws.on('message', async (data) => {
                await this.handleMessage(clientId, data);
            });

            ws.on('close', () => {
                console.log(`🔌 Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });

            ws.on('error', (error) => {
                console.error(`❌ WebSocket error for ${clientId}:`, error.message);
                
                // Send error message to client if possible
                if (ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'WebSocket connection error'
                        }));
                    } catch (sendError) {
                        console.error('Failed to send error message to client');
                    }
                }
                
                this.clients.delete(clientId);
            });

            // Send initial connection confirmation
            this.sendMessage(clientId, {
                type: 'connection',
                status: 'connected',
                clientId,
                message: 'Voice streaming ready'
            });
        });
    }

    async handleMessage(clientId, data) {
        try {
            const client = this.clients.get(clientId);
            if (!client) return;

            // Check if data is JSON (control message) or binary (audio)
            if (data instanceof Buffer && data.length > 0) {
                // Try to detect if it's JSON by checking first byte
                if (data[0] === 0x7B) { // JSON starts with '{'
                    try {
                        const message = JSON.parse(data.toString());
                        await this.handleControlMessage(clientId, message);
                        return;
                    } catch (parseError) {
                        console.warn(`⚠️ Failed to parse JSON message from ${clientId}`);
                    }
                }
                
                // Handle as binary audio data
                await this.handleAudioData(clientId, data);
            } else {
                console.warn(`⚠️ Received invalid data from ${clientId}`);
            }

        } catch (error) {
            console.error(`❌ Error handling message for ${clientId}:`, error);
            this.sendMessage(clientId, {
                type: 'error',
                message: 'Failed to process message'
            });
        }
    }

    async handleControlMessage(clientId, message) {
        const client = this.clients.get(clientId);
        
        switch (message.type) {
            case 'start_streaming':
                console.log(`🎤 Starting voice streaming for ${clientId}`);
                client.isStreaming = true;
                client.language = message.language || 'en';
                client.audioBuffer = Buffer.alloc(0);
                
                this.sendMessage(clientId, {
                    type: 'streaming_started',
                    message: 'Voice streaming active'
                });
                break;

            case 'stop_streaming':
                console.log(`⏹️ Stopping voice streaming for ${clientId}`);
                client.isStreaming = false;
                
                // Process accumulated audio
                if (client.audioBuffer.length > 0) {
                    await this.processAudioBuffer(clientId);
                }
                break;

            case 'ping':
                this.sendMessage(clientId, { type: 'pong' });
                break;

            default:
                console.warn(`⚠️ Unknown control message type: ${message.type}`);
        }
    }

    async handleAudioData(clientId, audioData) {
        const client = this.clients.get(clientId);
        if (!client || !client.isStreaming) return;

        // Accumulate audio data
        client.audioBuffer = Buffer.concat([client.audioBuffer, audioData]);
        
        // Accumulate audio for final processing instead of real-time chunks
        // This avoids the corrupt data issue with partial WebM chunks
        console.log(`📊 Audio buffer size: ${client.audioBuffer.length} bytes`);
        
        // Optional: Process chunks only if they're large enough and properly formatted
        // Disabled for now to focus on final processing
        // if (client.audioBuffer.length >= 16384) {
        //     await this.processAudioChunk(clientId, client.audioBuffer);
        //     client.audioBuffer = Buffer.alloc(0);
        // }
    }

    async processAudioChunk(clientId, audioBuffer) {
        try {
            console.log(`🔊 Processing audio chunk: ${audioBuffer.length} bytes`);
            
            // Skip processing very small chunks to avoid corrupt data errors
            if (audioBuffer.length < 1000) {
                console.log('⚠️ Skipping small audio chunk');
                return;
            }
            
            // Real-time STT with better format handling
            const sttResult = await this.deepgramService.speechToText(
                audioBuffer, 
                this.clients.get(clientId).language, 
                'audio/wav' // Force WAV format for better compatibility
            );

            if (sttResult.success && sttResult.transcript.trim()) {
                // Send partial transcript
                this.sendMessage(clientId, {
                    type: 'partial_transcript',
                    transcript: sttResult.transcript,
                    confidence: sttResult.confidence
                });

                console.log(`📝 Partial transcript: ${sttResult.transcript}`);
            }

        } catch (error) {
            console.error(`❌ Error processing audio chunk:`, error);
            // Don't spam errors for partial chunks - just log and continue
        }
    }

    async processAudioBuffer(clientId) {
        try {
            const client = this.clients.get(clientId);
            if (!client || client.audioBuffer.length === 0) return;

            console.log(`🎯 Processing final audio buffer: ${client.audioBuffer.length} bytes`);
            
            // Final STT with proper format
            const sttResult = await this.deepgramService.speechToText(
                client.audioBuffer, 
                client.language, 
                'audio/wav'
            );

            if (!sttResult.success || !sttResult.transcript.trim()) {
                this.sendMessage(clientId, {
                    type: 'error',
                    message: 'Could not transcribe audio'
                });
                return;
            }

            const transcript = sttResult.transcript.trim();
            console.log(`✅ Final transcript: ${transcript}`);

            // Send final transcript
            this.sendMessage(clientId, {
                type: 'final_transcript',
                transcript,
                confidence: sttResult.confidence
            });

            // Save user message to memory
            await this.memoryService.saveExchange(clientId, {
                userMessage: transcript,
                botResponse: '',
                timestamp: new Date().toISOString(),
                language: client.language,
                isVoiceMessage: true
            });

            // Get conversation context for RAG
            const history = await this.memoryService.getHistory(clientId, 10);
            const contextData = {
                context: history.map(exchange => 
                    `Human: ${exchange.userMessage}\nAssistant: ${exchange.botResponse}`
                ).join('\n'),
                messageCount: history.length,
                hasHistory: history.length > 0
            };
            
            // Process with RAG (including conversation context)
            let ragResponse;
            if (contextData.hasHistory) {
                // Include conversation context in the query
                const contextualQuery = `Previous conversation:\n${contextData.context}\n\nCurrent question: ${transcript}`;
                ragResponse = await ragService.processQuery(contextualQuery, client.language);
            } else {
                ragResponse = await ragService.processQuery(transcript, client.language);
            }
            
            // Update the last exchange with the assistant response
            const recentHistory = await this.memoryService.getHistory(clientId, 1);
            if (recentHistory.length > 0) {
                const lastExchange = recentHistory[recentHistory.length - 1];
                lastExchange.botResponse = ragResponse;
                // Re-save the updated exchange
                await this.memoryService.saveExchange(clientId, lastExchange);
            }

            // Send text response
            this.sendMessage(clientId, {
                type: 'text_response',
                response: ragResponse
            });

            // Generate and stream TTS
            await this.streamTTS(clientId, ragResponse, client.language);

        } catch (error) {
            console.error(`❌ Error processing audio buffer:`, error);
            this.sendMessage(clientId, {
                type: 'error',
                message: 'Failed to process voice message'
            });
        }
    }

    async streamTTS(clientId, text, language) {
        try {
            console.log(`🔊 Generating TTS for: ${text.substring(0, 50)}...`);
            
            const ttsResult = await this.deepgramService.textToSpeech(text, null, language);
            
            if (ttsResult.success) {
                // Send audio data in chunks for streaming playback
                const chunkSize = 8192; // 8KB chunks
                const audioBuffer = Buffer.from(ttsResult.audioBuffer);
                
                for (let i = 0; i < audioBuffer.length; i += chunkSize) {
                    const chunk = audioBuffer.slice(i, i + chunkSize);
                    
                    this.sendMessage(clientId, {
                        type: 'audio_chunk',
                        data: chunk.toString('base64'),
                        isLast: i + chunkSize >= audioBuffer.length
                    });
                }
                
                console.log(`✅ TTS streaming completed`);
            } else {
                throw new Error(ttsResult.error);
            }

        } catch (error) {
            console.error(`❌ Error streaming TTS:`, error);
            this.sendMessage(clientId, {
                type: 'error',
                message: 'Failed to generate voice response'
            });
        }
    }

    sendMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    async loadClientHistory(clientId) {
        try {
            const history = await this.memoryService.getHistory(clientId);
            if (history && history.length > 0) {
                console.log(`📚 Loaded ${history.length} previous exchanges for ${clientId}`);
                
                // Send conversation summary to client
                this.sendMessage(clientId, {
                    type: 'conversation_loaded',
                    messageCount: history.length,
                    lastUpdated: history[history.length - 1]?.timestamp || new Date().toISOString()
                });
            }
        } catch (error) {
            console.error(`❌ Error loading client history for ${clientId}:`, error);
        }
    }

    generateClientId() {
        return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    getConnectedClients() {
        return this.clients.size;
    }

    async getMemoryStats() {
        try {
            const stats = this.memoryService.getStats();
            return {
                connectedClients: this.clients.size,
                activeConversations: stats.totalSessions,
                memoryStatus: { connected: true, fallbackMode: false, localMemorySize: stats.totalSessions },
                conversationSummary: `Local memory: ${stats.totalSessions} sessions`
            };
        } catch (error) {
            console.error('❌ Error getting memory stats:', error);
            return {
                connectedClients: this.clients.size,
                error: error.message
            };
        }
    }

    async clearClientMemory(clientId) {
        try {
            await this.memoryService.clearHistory(clientId);
            console.log(`🗑️ Cleared memory for client: ${clientId}`);
            return true;
        } catch (error) {
            console.error(`❌ Error clearing client memory:`, error);
            return false;
        }
    }
}

module.exports = VoiceStreamService;