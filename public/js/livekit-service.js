/**
 * LiveKit Frontend Service
 * 
 * Ultra-low latency real-time voice streaming with RAG integration
 * for natural voice conversations.
 */

class LiveKitService {
    constructor() {
        this.room = null;
        this.localParticipant = null;
        this.remoteParticipant = null;
        this.audioTrack = null;
        this.isConnected = false;
        this.isSpeaking = false;
        this.voiceActivityThreshold = 0.1;
        this.silenceTimeout = 2000;
        this.lastActivityTime = Date.now();
        
        // Audio processing
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.audioLevel = 0;
        
        // RAG integration
        this.conversationContext = [];
        this.currentLanguage = 'en';
        
        console.log('🎙️ LiveKit Frontend Service initialized');
    }

    /**
     * Initialize LiveKit connection
     * @param {string} roomName - Room name
     * @param {string} userId - User ID
     * @param {string} userName - User name
     * @returns {Promise<Object>} Connection result
     */
    async initialize(roomName, userId, userName) {
        try {
            console.log(`🚀 Initializing LiveKit connection for room: ${roomName}`);
            
            // Get access token from server
            const response = await fetch('/api/livekit/room/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomName,
                    userId,
                    userName,
                    language: this.currentLanguage
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to join room: ${response.statusText}`);
            }

            const joinInfo = await response.json();
            
            if (!joinInfo.success) {
                throw new Error(joinInfo.error || 'Failed to join room');
            }

            // Connect to LiveKit room
            await this.connectToRoom(joinInfo);
            
            console.log('✅ LiveKit connection established');
            return { success: true, room: this.room };

        } catch (error) {
            console.error('❌ LiveKit initialization failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Connect to LiveKit room
     * @param {Object} joinInfo - Join information from server
     */
    async connectToRoom(joinInfo) {
        try {
            // Import LiveKit client dynamically
            const { Room, RoomEvent, Track, createLocalAudioTrack } = await import('https://unpkg.com/livekit-client@latest/dist/livekit-client.esm.js');
            
            this.room = new Room();
            
            // Set up event listeners
            this.setupRoomEventListeners();
            
            // Connect to room
            await this.room.connect(joinInfo.url, joinInfo.token);
            
            // Enable microphone
            await this.enableMicrophone();
            
            // Set up voice activity detection
            this.setupVoiceActivityDetection();
            
            this.isConnected = true;
            console.log('🎙️ Connected to LiveKit room successfully');

        } catch (error) {
            console.error('❌ Failed to connect to LiveKit room:', error);
            throw error;
        }
    }

    /**
     * Set up room event listeners
     */
    setupRoomEventListeners() {
        if (!this.room) return;

        // Participant joined
        this.room.on('participantConnected', (participant) => {
            console.log(`👋 Participant joined: ${participant.identity}`);
            this.remoteParticipant = participant;
            this.setupRemoteParticipantEvents(participant);
        });

        // Participant left
        this.room.on('participantDisconnected', (participant) => {
            console.log(`👋 Participant left: ${participant.identity}`);
            if (participant === this.remoteParticipant) {
                this.remoteParticipant = null;
            }
        });

        // Track published
        this.room.on('trackPublished', (publication, participant) => {
            console.log(`📡 Track published by ${participant.identity}:`, publication.trackName);
        });

        // Track subscribed
        this.room.on('trackSubscribed', (track, publication, participant) => {
            console.log(`📡 Track subscribed from ${participant.identity}:`, track.kind);
            
            if (track.kind === 'audio') {
                this.handleRemoteAudioTrack(track, participant);
            }
        });

        // Connection state changes
        this.room.on('connectionStateChanged', (state) => {
            console.log(`🔗 Connection state changed: ${state}`);
            
            if (state === 'disconnected') {
                this.isConnected = false;
                this.cleanup();
            }
        });
    }

    /**
     * Set up remote participant events
     * @param {Object} participant - Remote participant
     */
    setupRemoteParticipantEvents(participant) {
        participant.on('trackSubscribed', (track, publication) => {
            if (track.kind === 'audio') {
                this.handleRemoteAudioTrack(track, participant);
            }
        });
    }

    /**
     * Handle remote audio track (AI assistant responses)
     * @param {Object} track - Audio track
     * @param {Object} participant - Participant
     */
    handleRemoteAudioTrack(track, participant) {
        console.log(`🔊 Playing audio from ${participant.identity}`);
        
        const audioElement = track.attach();
        audioElement.play();
        
        // Update UI to show AI is speaking
        this.updateSpeakingState('assistant', true);
        
        audioElement.onended = () => {
            console.log('🔇 AI finished speaking');
            this.updateSpeakingState('assistant', false);
            track.detach();
        };
    }

    /**
     * Enable microphone and set up audio processing
     */
    async enableMicrophone() {
        try {
            // Import LiveKit client functions
            const { createLocalAudioTrack } = await import('https://unpkg.com/livekit-client@latest/dist/livekit-client.esm.js');
            
            // Create local audio track
            this.audioTrack = await createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000
            });

            // Publish audio track
            await this.room.localParticipant.publishTrack(this.audioTrack);
            
            console.log('🎤 Microphone enabled and published');

        } catch (error) {
            console.error('❌ Failed to enable microphone:', error);
            throw error;
        }
    }

    /**
     * Set up voice activity detection
     */
    setupVoiceActivityDetection() {
        if (!this.audioTrack) return;

        try {
            // Get audio stream from track
            const stream = this.audioTrack.mediaStreamTrack;
            
            // Set up audio context for level monitoring
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            
            this.microphone.connect(this.analyser);
            
            // Start monitoring audio levels
            this.monitorAudioLevel();
            
            console.log('🎤 Voice activity detection enabled');

        } catch (error) {
            console.error('❌ Failed to set up voice activity detection:', error);
        }
    }

    /**
     * Monitor audio level for voice activity detection
     */
    monitorAudioLevel() {
        if (!this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkAudioLevel = () => {
            if (!this.analyser || !this.isConnected) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average audio level
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            this.audioLevel = sum / bufferLength / 255;
            
            // Detect voice activity
            const isSpeaking = this.audioLevel > this.voiceActivityThreshold;
            
            if (isSpeaking !== this.isSpeaking) {
                this.isSpeaking = isSpeaking;
                this.lastActivityTime = Date.now();
                
                // Update UI
                this.updateSpeakingState('user', isSpeaking);
                
                // Send voice activity to server
                this.reportVoiceActivity(isSpeaking);
                
                console.log(`🎤 Voice activity: ${isSpeaking ? 'Speaking' : 'Silent'} (level: ${this.audioLevel.toFixed(3)})`);
            }
            
            // Check for silence timeout
            if (!isSpeaking && this.isSpeaking) {
                const silenceDuration = Date.now() - this.lastActivityTime;
                if (silenceDuration > this.silenceTimeout) {
                    console.log('🔇 Silence timeout reached, processing audio');
                    this.processAudioForRAG();
                }
            }
            
            requestAnimationFrame(checkAudioLevel);
        };
        
        checkAudioLevel();
    }

    /**
     * Report voice activity to server
     * @param {boolean} isSpeaking - Whether user is speaking
     */
    async reportVoiceActivity(isSpeaking) {
        try {
            await fetch('/api/livekit/voice/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    participantId: this.room.localParticipant.identity,
                    isSpeaking: isSpeaking,
                    audioLevel: this.audioLevel,
                    roomName: this.room.name
                })
            });
        } catch (error) {
            console.error('❌ Failed to report voice activity:', error);
        }
    }

    /**
     * Process audio for RAG when user stops speaking
     */
    async processAudioForRAG() {
        try {
            console.log('🧠 Processing audio with RAG system...');
            
            // Get audio data from the track
            const audioData = await this.captureAudioData();
            
            if (!audioData) {
                console.warn('⚠️ No audio data captured');
                return;
            }

            // Send to server for RAG processing
            const response = await fetch('/api/livekit/audio/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomName: this.room.name,
                    participantId: this.room.localParticipant.identity,
                    audioData: audioData,
                    metadata: {
                        language: this.currentLanguage,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`RAG processing failed: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ RAG processing successful:', result.transcript);
                
                // Update conversation context
                this.conversationContext.push({
                    user: result.transcript,
                    assistant: result.response,
                    timestamp: new Date().toISOString()
                });

                // Play AI response if available
                if (result.audioResponse) {
                    this.playAudioResponse(result.audioResponse);
                } else {
                    // Fallback to text-to-speech
                    this.speakText(result.response);
                }
                
            } else {
                console.error('❌ RAG processing failed:', result.error);
            }

        } catch (error) {
            console.error('❌ Error processing audio for RAG:', error);
        }
    }

    /**
     * Capture audio data from the microphone
     * @returns {Promise<string>} Base64 encoded audio data
     */
    async captureAudioData() {
        try {
            if (!this.audioTrack) return null;

            // Create a MediaRecorder to capture audio
            const stream = this.audioTrack.mediaStreamTrack;
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            return new Promise((resolve) => {
                mediaRecorder.ondataavailable = (event) => {
                    chunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    
                    reader.onload = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    
                    reader.readAsDataURL(blob);
                };

                // Record for a short duration
                mediaRecorder.start();
                setTimeout(() => {
                    mediaRecorder.stop();
                }, 1000);
            });

        } catch (error) {
            console.error('❌ Failed to capture audio data:', error);
            return null;
        }
    }

    /**
     * Play audio response from server
     * @param {string} audioData - Base64 encoded audio data
     */
    playAudioResponse(audioData) {
        try {
            const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            this.updateSpeakingState('assistant', true);
            
            audio.onended = () => {
                this.updateSpeakingState('assistant', false);
                URL.revokeObjectURL(audioUrl);
            };
            
            audio.play();
            console.log('🔊 Playing AI audio response');

        } catch (error) {
            console.error('❌ Failed to play audio response:', error);
            // Fallback to text-to-speech
            this.speakText('Sorry, I had trouble playing the audio response.');
        }
    }

    /**
     * Speak text using browser TTS
     * @param {string} text - Text to speak
     */
    speakText(text) {
        if (!('speechSynthesis' in window)) {
            console.warn('⚠️ Speech synthesis not supported');
            return;
        }

        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        this.updateSpeakingState('assistant', true);
        
        utterance.onend = () => {
            this.updateSpeakingState('assistant', false);
            console.log('🔊 TTS completed');
        };
        
        window.speechSynthesis.speak(utterance);
        console.log('🔊 Speaking text:', text.substring(0, 50) + '...');
    }

    /**
     * Update speaking state in UI
     * @param {string} speaker - 'user' or 'assistant'
     * @param {boolean} isSpeaking - Whether speaker is speaking
     */
    updateSpeakingState(speaker, isSpeaking) {
        // Update voice button state
        const voiceBtn = document.getElementById('streamVoiceBtn');
        const voiceBtnIcon = document.getElementById('streamVoiceBtnIcon');
        const voiceBtnText = document.getElementById('voiceBtnText');
        
        if (voiceBtn && voiceBtnIcon && voiceBtnText) {
            if (speaker === 'user' && isSpeaking) {
                voiceBtn.classList.add('listening');
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtnText.textContent = 'Listening...';
            } else if (speaker === 'assistant' && isSpeaking) {
                voiceBtn.classList.add('speaking');
                voiceBtnIcon.className = 'fas fa-volume-up';
                voiceBtnText.textContent = 'AI Speaking...';
            } else {
                voiceBtn.classList.remove('listening', 'speaking');
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtnText.textContent = 'Start Voice Assistant';
            }
        }

        // Update voice status
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            if (speaker === 'user' && isSpeaking) {
                statusElement.textContent = 'Listening... Speak now!';
            } else if (speaker === 'assistant' && isSpeaking) {
                statusElement.textContent = 'AI is responding...';
            } else {
                statusElement.textContent = 'Ready for conversation';
            }
        }

        // Update voice waves
        const voiceWaves = document.getElementById('voiceWaves');
        if (voiceWaves) {
            if (isSpeaking) {
                voiceWaves.classList.add('active');
            } else {
                voiceWaves.classList.remove('active');
            }
        }
    }

    /**
     * Set language for conversation
     * @param {string} language - Language code ('en' or 'ar')
     */
    setLanguage(language) {
        this.currentLanguage = language;
        console.log(`🌐 Language set to: ${language}`);
    }

    /**
     * Get conversation history
     * @returns {Array} Conversation history
     */
    getConversationHistory() {
        return this.conversationContext;
    }

    /**
     * Clear conversation history
     */
    clearConversationHistory() {
        this.conversationContext = [];
        console.log('🗑️ Conversation history cleared');
    }

    /**
     * Disconnect from LiveKit room
     */
    async disconnect() {
        try {
            if (this.room) {
                await this.room.disconnect();
                console.log('🔌 Disconnected from LiveKit room');
            }
            
            this.cleanup();
            
        } catch (error) {
            console.error('❌ Error disconnecting from LiveKit:', error);
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.isConnected = false;
        this.isSpeaking = false;
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        this.analyser = null;
        this.audioTrack = null;
        this.room = null;
        
        console.log('🧹 LiveKit resources cleaned up');
    }

    /**
     * Get connection status
     * @returns {Object} Connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            isSpeaking: this.isSpeaking,
            audioLevel: this.audioLevel,
            language: this.currentLanguage,
            conversationLength: this.conversationContext.length,
            roomName: this.room?.name || null
        };
    }
}

// Export for global access
window.LiveKitService = LiveKitService;
