class VoiceStreamClient {
    constructor() {
        this.ws = null;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioContext = null;
        this.isConnected = false;
        this.isStreaming = false;
        this.clientId = null;
        
        // Audio playback queue for streaming TTS
        this.audioQueue = [];
        this.currentAudio = null;
        this.isPlaying = false;
        
        // Voice Activity Detection
        this.vadState = {
            enabled: false,
            threshold: 0.01,
            minSilenceDuration: 1000, // 1 second of silence to stop
            lastSpeechTime: 0,
            silenceTimer: null
        };

        // Callbacks
        this.onConnectionChange = null;
        this.onTranscript = null;
        this.onResponse = null;
        this.onError = null;
        this.onAudioData = null;
        
        console.log('🎙️ VoiceStreamClient initialized');
    }

    async connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/voice-stream`;
            
            console.log(`🔗 Connecting to voice stream server: ${wsUrl}`);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Voice stream connected');
                this.isConnected = true;
                this.onConnectionChange?.(true);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('❌ Failed to parse server message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 Voice stream disconnected');
                this.isConnected = false;
                this.isStreaming = false;
                this.onConnectionChange?.(false);
                this.cleanup();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.onError?.('Connection error');
            };
            
        } catch (error) {
            console.error('❌ Failed to connect to voice stream server:', error);
            this.onError?.('Failed to connect');
        }
    }

    handleServerMessage(message) {
        console.log('📨 Server message:', message);
        
        switch (message.type) {
            case 'connection':
                this.clientId = message.clientId;
                console.log(`🆔 Client ID: ${this.clientId}`);
                break;
                
            case 'streaming_started':
                console.log('🎤 Voice streaming started');
                break;
                
            case 'partial_transcript':
                console.log(`📝 Partial transcript: ${message.transcript}`);
                this.onTranscript?.(message.transcript, false, message.confidence);
                break;
                
            case 'final_transcript':
                console.log(`✅ Final transcript: ${message.transcript}`);
                this.onTranscript?.(message.transcript, true, message.confidence);
                break;
                
            case 'text_response':
                console.log(`🤖 Response: ${message.response.substring(0, 100)}...`);
                this.onResponse?.(message.response);
                break;
                
            case 'audio_chunk':
                this.handleAudioChunk(message.data, message.isLast);
                break;
                
            case 'error':
                console.error(`❌ Server error: ${message.message}`);
                this.onError?.(message.message);
                break;
                
            case 'pong':
                // Heartbeat response
                break;
                
            default:
                console.warn(`⚠️ Unknown message type: ${message.type}`);
        }
    }

    async startStreaming(language = 'en') {
        if (!this.isConnected) {
            throw new Error('Not connected to voice stream server');
        }
        
        if (this.isStreaming) {
            console.log('⚠️ Already streaming');
            return;
        }
        
        try {
            // Get microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                    channelCount: 1
                }
            });
            
            // Setup MediaRecorder for real-time streaming - use simpler format
            const options = {
                audioBitsPerSecond: 16000
            };
            
            // Try formats that work better with Deepgram
            const formats = [
                'audio/wav',
                'audio/webm;codecs=pcm',
                'audio/webm',
                'audio/mp4'
            ];
            
            let selectedFormat = null;
            for (const format of formats) {
                if (MediaRecorder.isTypeSupported(format)) {
                    selectedFormat = format;
                    options.mimeType = format;
                    break;
                }
            }
            
            console.log(`🎙️ Selected audio format: ${selectedFormat || 'default'}`);
            
            this.mediaRecorder = new MediaRecorder(this.audioStream, options);
            
            // Setup audio context for VAD
            this.setupVoiceActivityDetection();
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.isStreaming) {
                    // Send audio data directly to WebSocket
                    this.sendAudioData(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('⏹️ MediaRecorder stopped');
            };
            
            // Send start streaming message
            this.sendControlMessage({
                type: 'start_streaming',
                language: language
            });
            
            // Start recording with larger time slices for better audio quality
            this.mediaRecorder.start(500); // 500ms chunks for better quality
            this.isStreaming = true;
            
            console.log('🎤 Voice streaming started');
            
        } catch (error) {
            console.error('❌ Failed to start voice streaming:', error);
            this.onError?.('Failed to start streaming');
            throw error;
        }
    }

    stopStreaming() {
        if (!this.isStreaming) {
            return;
        }
        
        console.log('⏹️ Stopping voice streaming');
        
        this.isStreaming = false;
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        // Send stop streaming message
        this.sendControlMessage({
            type: 'stop_streaming'
        });
        
        this.cleanup();
    }

    sendAudioData(audioBlob) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Convert blob to array buffer and send as binary data
            audioBlob.arrayBuffer().then(buffer => {
                try {
                    this.ws.send(buffer);
                } catch (error) {
                    console.error('❌ Error sending audio data:', error);
                    this.onError?.('Failed to send audio data');
                }
            }).catch(error => {
                console.error('❌ Error converting audio blob:', error);
                this.onError?.('Failed to process audio data');
            });
        } else {
            console.warn('⚠️ WebSocket not ready, skipping audio data');
        }
    }

    sendControlMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    setupVoiceActivityDetection() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = this.audioContext.createAnalyser();
            const microphone = this.audioContext.createMediaStreamSource(this.audioStream);
            
            analyser.fftSize = 512;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            microphone.connect(analyser);
            
            this.vadState.enabled = true;
            
            // Voice activity detection loop
            const detectVoiceActivity = () => {
                if (!this.vadState.enabled) return;
                
                analyser.getByteFrequencyData(dataArray);
                
                // Calculate average amplitude
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                const normalizedLevel = average / 255;
                
                // Check if speaking
                if (normalizedLevel > this.vadState.threshold) {
                    this.vadState.lastSpeechTime = Date.now();
                    
                    // Clear silence timer if we were in silence
                    if (this.vadState.silenceTimer) {
                        clearTimeout(this.vadState.silenceTimer);
                        this.vadState.silenceTimer = null;
                    }
                } else {
                    // Check for silence duration
                    const silenceDuration = Date.now() - this.vadState.lastSpeechTime;
                    
                    if (silenceDuration > this.vadState.minSilenceDuration && !this.vadState.silenceTimer) {
                        // Start silence timer
                        this.vadState.silenceTimer = setTimeout(() => {
                            if (this.isStreaming) {
                                console.log('🤫 Silence detected, stopping stream');
                                this.stopStreaming();
                            }
                        }, 500);
                    }
                }
                
                // Continue monitoring
                requestAnimationFrame(detectVoiceActivity);
            };
            
            detectVoiceActivity();
            
        } catch (error) {
            console.error('❌ Failed to setup voice activity detection:', error);
        }
    }

    handleAudioChunk(base64Data, isLast) {
        try {
            // Convert base64 to audio blob
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
            
            // Add to playback queue
            this.audioQueue.push({
                blob: audioBlob,
                isLast: isLast
            });
            
            // Start playback if not already playing
            if (!this.isPlaying) {
                this.playNextAudioChunk();
            }
            
        } catch (error) {
            console.error('❌ Error handling audio chunk:', error);
        }
    }

    async playNextAudioChunk() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        
        this.isPlaying = true;
        const audioData = this.audioQueue.shift();
        
        try {
            const audioUrl = URL.createObjectURL(audioData.blob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                // Play next chunk
                this.playNextAudioChunk();
            };
            
            audio.onerror = (error) => {
                console.error('❌ Audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
                // Continue with next chunk
                this.playNextAudioChunk();
            };
            
            await audio.play();
            
        } catch (error) {
            console.error('❌ Failed to play audio chunk:', error);
            // Continue with next chunk
            this.playNextAudioChunk();
        }
    }

    cleanup() {
        // Stop voice activity detection
        this.vadState.enabled = false;
        if (this.vadState.silenceTimer) {
            clearTimeout(this.vadState.silenceTimer);
            this.vadState.silenceTimer = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Stop audio stream
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        
        // Clear audio queue
        this.audioQueue = [];
        this.isPlaying = false;
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }

    disconnect() {
        console.log('🔌 Disconnecting from voice stream server');
        
        if (this.isStreaming) {
            this.stopStreaming();
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.isConnected = false;
        this.clientId = null;
        
        this.cleanup();
    }

    // Utility methods
    isReady() {
        return this.isConnected && !this.isStreaming;
    }

    getStatus() {
        return {
            connected: this.isConnected,
            streaming: this.isStreaming,
            clientId: this.clientId,
            audioQueueLength: this.audioQueue.length,
            vadEnabled: this.vadState.enabled
        };
    }

    // Ping server for connection health
    ping() {
        this.sendControlMessage({ type: 'ping' });
    }
}

// Export for use in other scripts
window.VoiceStreamClient = VoiceStreamClient;