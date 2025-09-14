/**
 * Streaming Text-to-Speech Service
 * 
 * Provides ultra-low latency streaming TTS for real-time voice conversations
 * with LiveKit integration and multiple TTS providers.
 */

const axios = require('axios');
const { RoomServiceClient } = require('livekit-server-sdk');

class StreamingTtsService {
    constructor() {
        this.providers = {
            deepgram: {
                url: '/api/voice/text-to-speech',
                enabled: true,
                latency: 'low'
            },
            elevenlabs: {
                url: process.env.ELEVENLABS_API_URL,
                apiKey: process.env.ELEVENLABS_API_KEY,
                enabled: !!process.env.ELEVENLABS_API_KEY,
                latency: 'ultra-low'
            },
            openai: {
                url: process.env.OPENAI_TTS_URL,
                apiKey: process.env.OPENAI_API_KEY,
                enabled: !!process.env.OPENAI_API_KEY,
                latency: 'low'
            }
        };
        
        this.activeStreams = new Map();
        this.roomService = new RoomServiceClient(
            process.env.LIVEKIT_URL || 'ws://localhost:7880',
            process.env.LIVEKIT_API_KEY || 'devkey',
            process.env.LIVEKIT_API_SECRET || 'secret'
        );
        
        console.log('🔊 Streaming TTS Service initialized');
    }

    /**
     * Stream text-to-speech to LiveKit room
     * @param {string} text - Text to convert to speech
     * @param {string} roomName - LiveKit room name
     * @param {string} participantId - Participant ID
     * @param {Object} options - TTS options
     * @returns {Promise<Object>} Streaming result
     */
    async streamToRoom(text, roomName, participantId, options = {}) {
        try {
            console.log(`🔊 Streaming TTS to room ${roomName}: "${text.substring(0, 50)}..."`);
            
            const {
                language = 'en',
                voice = 'default',
                speed = 1.0,
                provider = 'deepgram'
            } = options;

            // Get the best available provider
            const selectedProvider = this.getBestProvider(provider, language);
            
            if (!selectedProvider) {
                throw new Error('No TTS provider available');
            }

            // Stream audio to LiveKit room
            const result = await this.streamWithProvider(
                text, 
                roomName, 
                participantId, 
                selectedProvider, 
                { language, voice, speed }
            );

            return {
                success: true,
                provider: selectedProvider.name,
                latency: selectedProvider.latency,
                duration: result.duration,
                audioSize: result.audioSize
            };

        } catch (error) {
            console.error('❌ Streaming TTS error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get the best available TTS provider
     * @param {string} preferred - Preferred provider
     * @param {string} language - Language code
     * @returns {Object|null} Best provider
     */
    getBestProvider(preferred, language) {
        // Check preferred provider first
        if (preferred && this.providers[preferred]?.enabled) {
            return { name: preferred, ...this.providers[preferred] };
        }

        // Find best available provider
        const available = Object.entries(this.providers)
            .filter(([name, config]) => config.enabled)
            .map(([name, config]) => ({ name, ...config }))
            .sort((a, b) => {
                // Prioritize by latency (ultra-low > low > medium)
                const latencyOrder = { 'ultra-low': 0, 'low': 1, 'medium': 2 };
                return latencyOrder[a.latency] - latencyOrder[b.latency];
            });

        return available[0] || null;
    }

    /**
     * Stream audio with specific provider
     * @param {string} text - Text to convert
     * @param {string} roomName - Room name
     * @param {string} participantId - Participant ID
     * @param {Object} provider - Provider configuration
     * @param {Object} options - TTS options
     * @returns {Promise<Object>} Streaming result
     */
    async streamWithProvider(text, roomName, participantId, provider, options) {
        const startTime = Date.now();
        
        switch (provider.name) {
            case 'deepgram':
                return await this.streamWithDeepgram(text, roomName, participantId, options);
            case 'elevenlabs':
                return await this.streamWithElevenLabs(text, roomName, participantId, options);
            case 'openai':
                return await this.streamWithOpenAI(text, roomName, participantId, options);
            default:
                throw new Error(`Unsupported TTS provider: ${provider.name}`);
        }
    }

    /**
     * Stream with Deepgram TTS
     * @param {string} text - Text to convert
     * @param {string} roomName - Room name
     * @param {string} participantId - Participant ID
     * @param {Object} options - TTS options
     * @returns {Promise<Object>} Streaming result
     */
    async streamWithDeepgram(text, roomName, participantId, options) {
        try {
            console.log('🔊 Using Deepgram TTS for streaming');
            
            const response = await axios.post('/api/voice/text-to-speech', {
                text: text,
                language: options.language,
                voice: options.voice,
                speed: options.speed,
                streaming: true
            }, {
                responseType: 'arraybuffer',
                timeout: 10000
            });

            const audioBuffer = Buffer.from(response.data);
            const duration = this.estimateAudioDuration(audioBuffer);
            
            // Send audio to LiveKit room
            await this.sendAudioToRoom(audioBuffer, roomName, participantId);
            
            return {
                duration: duration,
                audioSize: audioBuffer.length,
                provider: 'deepgram'
            };

        } catch (error) {
            console.error('❌ Deepgram TTS streaming error:', error);
            throw error;
        }
    }

    /**
     * Stream with ElevenLabs TTS
     * @param {string} text - Text to convert
     * @param {string} roomName - Room name
     * @param {string} participantId - Participant ID
     * @param {Object} options - TTS options
     * @returns {Promise<Object>} Streaming result
     */
    async streamWithElevenLabs(text, roomName, participantId, options) {
        try {
            console.log('🔊 Using ElevenLabs TTS for streaming');
            
            const response = await axios.post(`${this.providers.elevenlabs.url}/text-to-speech`, {
                text: text,
                voice_id: options.voice || 'default',
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                    style: 0.0,
                    use_speaker_boost: true
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.providers.elevenlabs.apiKey}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 15000
            });

            const audioBuffer = Buffer.from(response.data);
            const duration = this.estimateAudioDuration(audioBuffer);
            
            // Send audio to LiveKit room
            await this.sendAudioToRoom(audioBuffer, roomName, participantId);
            
            return {
                duration: duration,
                audioSize: audioBuffer.length,
                provider: 'elevenlabs'
            };

        } catch (error) {
            console.error('❌ ElevenLabs TTS streaming error:', error);
            throw error;
        }
    }

    /**
     * Stream with OpenAI TTS
     * @param {string} text - Text to convert
     * @param {string} roomName - Room name
     * @param {string} participantId - Participant ID
     * @param {Object} options - TTS options
     * @returns {Promise<Object>} Streaming result
     */
    async streamWithOpenAI(text, roomName, participantId, options) {
        try {
            console.log('🔊 Using OpenAI TTS for streaming');
            
            const response = await axios.post(`${this.providers.openai.url}/audio/speech`, {
                model: 'tts-1',
                input: text,
                voice: options.voice || 'alloy',
                response_format: 'mp3',
                speed: options.speed
            }, {
                headers: {
                    'Authorization': `Bearer ${this.providers.openai.apiKey}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 10000
            });

            const audioBuffer = Buffer.from(response.data);
            const duration = this.estimateAudioDuration(audioBuffer);
            
            // Send audio to LiveKit room
            await this.sendAudioToRoom(audioBuffer, roomName, participantId);
            
            return {
                duration: duration,
                audioSize: audioBuffer.length,
                provider: 'openai'
            };

        } catch (error) {
            console.error('❌ OpenAI TTS streaming error:', error);
            throw error;
        }
    }

    /**
     * Send audio buffer to LiveKit room
     * @param {Buffer} audioBuffer - Audio data
     * @param {string} roomName - Room name
     * @param {string} participantId - Participant ID
     */
    async sendAudioToRoom(audioBuffer, roomName, participantId) {
        try {
            // Convert audio to base64 for transmission
            const audioBase64 = audioBuffer.toString('base64');
            
            // Send audio data to room participants
            await this.roomService.sendData({
                room: roomName,
                data: JSON.stringify({
                    type: 'audio_response',
                    participantId: participantId,
                    audioData: audioBase64,
                    timestamp: new Date().toISOString()
                }),
                kind: 'reliable'
            });
            
            console.log(`📡 Audio sent to room ${roomName} for participant ${participantId}`);

        } catch (error) {
            console.error('❌ Error sending audio to room:', error);
            throw error;
        }
    }

    /**
     * Estimate audio duration from buffer
     * @param {Buffer} audioBuffer - Audio buffer
     * @returns {number} Duration in seconds
     */
    estimateAudioDuration(audioBuffer) {
        // Rough estimation based on file size and typical bitrates
        // This is a simplified calculation - in production, you'd use proper audio analysis
        const bytesPerSecond = 16000; // Typical for 16kHz audio
        return Math.max(1, audioBuffer.length / bytesPerSecond);
    }

    /**
     * Stream text in chunks for real-time experience
     * @param {string} text - Full text
     * @param {string} roomName - Room name
     * @param {string} participantId - Participant ID
     * @param {Object} options - TTS options
     * @returns {Promise<Object>} Streaming result
     */
    async streamTextChunks(text, roomName, participantId, options = {}) {
        try {
            console.log(`🔊 Streaming text in chunks: "${text.substring(0, 50)}..."`);
            
            // Split text into chunks for streaming
            const chunks = this.splitTextIntoChunks(text, options.chunkSize || 100);
            const results = [];
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`🔊 Streaming chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 30)}..."`);
                
                const result = await this.streamToRoom(chunk, roomName, participantId, options);
                results.push(result);
                
                // Small delay between chunks for natural flow
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            return {
                success: true,
                chunksProcessed: chunks.length,
                totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
                results: results
            };

        } catch (error) {
            console.error('❌ Error streaming text chunks:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Split text into chunks for streaming
     * @param {string} text - Text to split
     * @param {number} chunkSize - Maximum chunk size
     * @returns {Array<string>} Text chunks
     */
    splitTextIntoChunks(text, chunkSize = 100) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const chunks = [];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const trimmedSentence = sentence.trim();
            
            if (currentChunk.length + trimmedSentence.length <= chunkSize) {
                currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk + '.');
                    currentChunk = trimmedSentence;
                } else {
                    // Sentence is longer than chunk size, split by words
                    const words = trimmedSentence.split(' ');
                    let wordChunk = '';
                    
                    for (const word of words) {
                        if (wordChunk.length + word.length + 1 <= chunkSize) {
                            wordChunk += (wordChunk ? ' ' : '') + word;
                        } else {
                            if (wordChunk) {
                                chunks.push(wordChunk);
                                wordChunk = word;
                            } else {
                                chunks.push(word);
                            }
                        }
                    }
                    
                    if (wordChunk) {
                        currentChunk = wordChunk;
                    }
                }
            }
        }
        
        if (currentChunk) {
            chunks.push(currentChunk + '.');
        }
        
        return chunks.filter(chunk => chunk.trim().length > 0);
    }

    /**
     * Get available TTS providers
     * @returns {Object} Available providers
     */
    getAvailableProviders() {
        return Object.entries(this.providers)
            .filter(([name, config]) => config.enabled)
            .map(([name, config]) => ({
                name,
                latency: config.latency,
                features: ['streaming', 'real-time', 'multi-language']
            }));
    }

    /**
     * Get service status
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            status: 'active',
            providers: this.getAvailableProviders(),
            activeStreams: this.activeStreams.size,
            features: [
                'Real-time streaming',
                'Multiple TTS providers',
                'LiveKit integration',
                'Chunked streaming',
                'Ultra-low latency'
            ]
        };
    }
}

module.exports = StreamingTtsService;
