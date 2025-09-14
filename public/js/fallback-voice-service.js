/**
 * Fallback Voice Service
 * 
 * Uses existing voice infrastructure when LiveKit is not available
 * Provides voice recording, RAG integration, and TTS responses
 */

class FallbackVoiceService {
    constructor() {
        this.isConnected = false;
        this.isRecording = false;
        this.isProcessing = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        this.currentAudio = null;
        this.currentLanguage = 'en';
        this.conversationContext = [];
        this.recordingTimeout = null;
        this.maxRecordingTime = 20000; // 10 seconds max recording
        this.minRecordingTime = 1000; // 1 second minimum recording
        this.recordingStartTime = null;
        this.currentUtterance = null; // Track current speech synthesis
        this.isSpeaking = false; // Track speaking state
        
        // Check secure context and HTTPS
        this.checkSecureContext();
        
        console.log('🎙️ Fallback Voice Service initialized');
    }

    /**
     * Check if we're in a secure context (required for voice APIs)
     */
    checkSecureContext() {
        const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        const isHTTPS = window.location.protocol === 'https:';
        const isNgrok = window.location.hostname.includes('ngrok');
        
        console.log('🔒 Security Context Check:');
        console.log(`  - Secure Context: ${isSecure}`);
        console.log(`  - HTTPS: ${isHTTPS}`);
        console.log(`  - Ngrok: ${isNgrok}`);
        console.log(`  - Protocol: ${window.location.protocol}`);
        console.log(`  - Hostname: ${window.location.hostname}`);
        
        if (!isSecure) {
            console.warn('⚠️ WARNING: Not in secure context. Voice features may not work properly.');
            console.warn('💡 Solution: Use HTTPS or localhost for voice features to work.');
        }
        
        return isSecure;
    }

    /**
     * Start voice conversation
     * @param {string} language - Language code
     * @returns {Promise<Object>} Connection result
     */
    async startConversation(language = 'en') {
        try {
            console.log('🚀 Starting fallback voice conversation');
            
            this.currentLanguage = language;
            this.isConnected = true;
            
            // Start recording immediately when conversation starts
            await this.startRecording();
            
            return {
                success: true,
                message: 'Voice assistant ready',
                roomName: 'fallback-room',
                participantId: 'user-' + Date.now()
            };
            
        } catch (error) {
            console.error('❌ Error starting voice conversation:', error);
            this.updateUI('ready');
            throw error;
        }
    }

    /**
     * Stop voice conversation
     */
    async stopConversation() {
        try {
            console.log('🛑 Stopping voice conversation');
            
            // Stop any current speech
            this.stopCurrentSpeech();
            
            if (this.isRecording) {
                await this.stopRecording();
            }
            
            this.isConnected = false;
            this.updateUI('ready');
            
        } catch (error) {
            console.error('❌ Error stopping voice conversation:', error);
        }
    }

    /**
     * Handle modal close - stop all voice activities
     */
    handleModalClose() {
        try {
            console.log('🚪 Voice modal closed - stopping all voice activities');
            
            // Stop all voice activities immediately
            this.stopAllVoiceActivities();
            
            // Reset all states
            this.isConnected = false;
            this.isRecording = false;
            this.isSpeaking = false;
            this.isProcessing = false;
            this.currentUtterance = null;
            this.currentAudio = null;
            
            // Clear any timeouts
            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
                this.recordingTimeout = null;
            }
            
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            
            console.log('✅ Voice modal close cleanup completed');
            
        } catch (error) {
            console.error('❌ Error handling modal close:', error);
        }
    }

    /**
     * Stop any current speech synthesis
     */
    stopCurrentSpeech() {
        try {
            if (this.isSpeaking && window.speechSynthesis) {
                console.log('🔇 Stopping current speech synthesis');
                
                // Multiple methods to stop speech synthesis
                window.speechSynthesis.cancel();
                window.speechSynthesis.pause();
                
                // Force stop by setting speaking to false immediately
                this.isSpeaking = false;
                this.currentUtterance = null;
                
                // Additional aggressive cleanup
                setTimeout(() => {
                    if (window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                    }
                }, 100);
            }
        } catch (error) {
            console.error('❌ Error stopping speech:', error);
        }
    }

    /**
     * Force stop all voice activities
     */
    forceStopAll() {
        try {
            console.log('🛑 Force stopping all voice activities');
            
            // Aggressive speech synthesis stopping
            if (window.speechSynthesis) {
                console.log('🔇 Aggressively stopping speech synthesis');
                window.speechSynthesis.cancel();
                window.speechSynthesis.pause();
                
                // Try multiple times with delays
                setTimeout(() => {
                    if (window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                        window.speechSynthesis.pause();
                    }
                }, 50);
                
                setTimeout(() => {
                    if (window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                    }
                }, 200);
            }
            
            // Stop recording if active
            if (this.isRecording && this.mediaRecorder) {
                console.log('🛑 Stopping media recorder');
                this.mediaRecorder.stop();
            }
            
            // Stop all audio tracks
            if (this.audioStream) {
                console.log('🛑 Stopping audio tracks');
                this.audioStream.getTracks().forEach(track => track.stop());
            }
            
            // Reset all states immediately
            this.isConnected = false;
            this.isRecording = false;
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.audioChunks = [];
            
            // Clear global utterance reference
            if (window.currentVoiceUtterance) {
                window.currentVoiceUtterance = null;
            }
            
            // Clear timeouts
            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
                this.recordingTimeout = null;
            }
            
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            
            console.log('✅ All voice activities force stopped');
        } catch (error) {
            console.error('❌ Error force stopping voice activities:', error);
        }
    }

    /**
     * Handle interruption - stop speech and start recording
     */
    async handleInterruption() {
        try {
            console.log('🔄 Handling interruption - stopping AI speech and starting to listen');
            
            // Stop any current speech immediately
            this.stopCurrentSpeech();
            
            // Stop any current audio playback
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
                window.currentAudio = null;
            }
            
            // Reset speaking state
            this.isSpeaking = false;
            this.currentUtterance = null;
            
            // Start recording to listen to user
            if (!this.isRecording) {
                console.log('🎤 Starting to listen after interruption');
                await this.startRecording();
            }
            
        } catch (error) {
            console.error('❌ Error handling interruption:', error);
            this.updateUI('ready');
        }
    }

    /**
     * Start voice recording
     */
    async startRecording() {
        try {
            if (this.isRecording) return;
            
            // Check secure context first
            if (!this.checkSecureContext()) {
                throw new Error('Voice recording requires a secure context (HTTPS or localhost)');
            }
            
            // Stop any current speech before starting recording
            this.stopCurrentSpeech();
            
            console.log('🎤 Starting voice recording');
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 16000, // Optimized for Google Cloud STT
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true, // Enable auto gain control
                    latency: 0.01 // Low latency mode
                } 
            });
            
            console.log('✅ Microphone access granted');
            
            // Check if MediaRecorder is supported
            if (!window.MediaRecorder) {
                throw new Error('MediaRecorder is not supported in this browser');
            }
            
            // Try different MIME types
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                }
            }
            
            console.log('🎵 Using MIME type:', mimeType);
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType
            });
            
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                console.log('📊 Audio data available:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('🛑 Recording stopped, processing...');
                this.processRecording();
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('❌ MediaRecorder error:', event.error);
                this.updateUI('ready');
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            console.log('🎙️ Recording started');
            this.updateUI('listening');
            
            // Set automatic timeout to stop recording
            this.recordingTimeout = setTimeout(() => {
                console.log('⏰ Recording timeout reached, stopping automatically');
                this.stopRecording();
            }, this.maxRecordingTime);
            
            // Update UI with countdown
            this.startRecordingCountdown();
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
            this.updateUI('ready');
            throw error;
        }
    }

    /**
     * Stop voice recording
     */
    async stopRecording() {
        try {
            if (!this.isRecording || !this.mediaRecorder) return;
            
            console.log('🛑 Stopping voice recording');
            
            // Clear timeout
            if (this.recordingTimeout) {
                clearTimeout(this.recordingTimeout);
                this.recordingTimeout = null;
            }
            
            // Stop countdown
            this.stopRecordingCountdown();
            
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop all tracks
            if (this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            // Calculate recording duration
            const duration = Date.now() - this.recordingStartTime;
            console.log(`⏱️ Recording duration: ${duration}ms`);
            
            // Check if recording is too short
            if (duration < this.minRecordingTime) {
                console.log('⚠️ Recording too short, please try again');
                this.updateUI('ready');
                alert('Recording too short. Please speak for at least 1 second.');
                return;
            }
            
            this.updateUI('processing');
            
        } catch (error) {
            console.error('❌ Error stopping recording:', error);
        }
    }

    /**
     * Process recorded audio
     */
    async processRecording() {
        try {
            console.log('🔄 Processing recorded audio');
            
            if (this.audioChunks.length === 0) {
                console.log('⚠️ No audio chunks to process');
                this.updateUI('ready');
                return;
            }
            
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            console.log('📦 Audio blob created:', audioBlob.size, 'bytes');
            
            if (audioBlob.size === 0) {
                console.log('⚠️ Audio blob is empty');
                this.updateUI('ready');
                return;
            }
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', this.currentLanguage);
            
            console.log('📤 Sending audio to server...');
            
            // Send to server for processing
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                body: formData
            });
            
            console.log('📥 Server response:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Server error response:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('✅ Server processing result:', result);
            
            if (result.success && result.pipeline) {
                const { stt, rag, tts } = result.pipeline;
                
                if (stt && stt.transcript && stt.transcript.trim()) {
                    console.log('🗣️ Speech detected:', stt.transcript);
                    console.log('🌍 Detected language:', stt.language);
                    
                    if (rag && rag.response) {
                        console.log('🧠 RAG Response:', rag.response);
                        console.log('🌍 Response language:', rag.language);
                        
                        if (tts) {
                            console.log('🗣️ TTS generated:', tts.method);
                            
                            // Show AI speaking status before playing audio
                            this.updateUI('speaking');
                            
                            // Play the TTS audio if available
                            if (tts.audioBuffer) {
                                await this.playTTSAudio(tts.audioBuffer, tts.contentType);
                            } else {
                                // Use browser TTS as fallback
                                console.log('🔄 Using browser TTS fallback...');
                                await this.playBrowserTTS(rag.response, rag.language);
                            }
                        } else {
                            // No TTS available, use browser TTS
                            console.log('🔄 No TTS available, using browser TTS...');
                            this.updateUI('speaking');
                            await this.playBrowserTTS(rag.response, rag.language);
                        }
                    } else {
                        console.log('⚠️ No RAG response available');
                        this.updateUI('ready');
                    }
                } else {
                    console.log('⚠️ No speech detected or empty transcript');
                    this.updateUI('ready');
                }
            } else {
                console.log('⚠️ Processing failed or no pipeline result');
                console.log('📋 Result:', result);
                this.updateUI('ready');
            }
            
        } catch (error) {
            console.error('❌ Error processing recording:', error);
            this.updateUI('ready');
        }
    }

    /**
     * Play TTS audio from base64 buffer
     * @param {string} audioBuffer - Base64 encoded audio buffer
     * @param {string} contentType - Audio content type
     */
    async playTTSAudio(audioBuffer, contentType) {
        try {
            console.log('🔊 Playing TTS audio...');
            
            // Convert base64 to blob
            const binaryString = atob(audioBuffer);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: contentType || 'audio/mpeg' });
            
            // Create audio element and play
            const audio = new Audio();
            audio.src = URL.createObjectURL(audioBlob);
            
            // Store reference for cleanup
            this.currentAudio = audio;
            window.currentAudio = audio;
            
            return new Promise((resolve, reject) => {
                audio.onplay = () => {
                    console.log('🔊 TTS audio started playing');
                    this.updateUI('speaking');
                };
                
                audio.onended = () => {
                    URL.revokeObjectURL(audio.src);
                    this.currentAudio = null;
                    window.currentAudio = null;
                    console.log('✅ TTS audio playback completed');
                    this.updateUI('ready');
                    resolve();
                };
                
                audio.onerror = (error) => {
                    console.error('❌ TTS audio playback error:', error);
                    URL.revokeObjectURL(audio.src);
                    this.currentAudio = null;
                    window.currentAudio = null;
                    this.updateUI('ready');
                    reject(error);
                };
                
                audio.play().catch(error => {
                    console.error('❌ Failed to play TTS audio:', error);
                    this.currentAudio = null;
                    window.currentAudio = null;
                    this.updateUI('ready');
                    reject(error);
                });
            });
            
        } catch (error) {
            console.error('❌ TTS audio playback error:', error);
            throw error;
        }
    }
    
    /**
     * Stop all voice activities and cleanup resources
     */
    stopAllVoiceActivities() {
        console.log('🛑 Stopping all voice activities...');
        
        // Stop recording if active
        if (this.isRecording && this.mediaRecorder) {
            try {
                this.mediaRecorder.stop();
                console.log('🛑 Recording stopped');
            } catch (error) {
                console.log('⚠️ Error stopping recording:', error);
            }
        }
        
        // Force stop all media tracks
        if (this.audioStream) {
            try {
                console.log('🛑 Stopping audio stream tracks');
                this.audioStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('🛑 Media track stopped:', track.kind);
                });
                this.audioStream = null;
            } catch (error) {
                console.log('⚠️ Error stopping audio stream:', error);
            }
        }
        
        // Stop any ongoing speech synthesis
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            speechSynthesis.pause();
            console.log('🛑 Speech synthesis cancelled');
        }
        
        // Stop any current audio playback
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio = null;
                window.currentAudio = null;
                console.log('🛑 Audio playback stopped');
            } catch (error) {
                console.log('⚠️ Error stopping audio playback:', error);
            }
        }
        
        // Clear any timeouts
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
            console.log('🛑 Recording timeout cleared');
        }
        
        // Reset states
        this.isRecording = false;
        this.isProcessing = false;
        this.isConnected = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        // Update UI to ready state
        this.updateUI('ready');
        
        console.log('✅ All voice activities stopped and cleaned up');
    }

    /**
     * Force stop all voice activities (emergency cleanup)
     */
    forceStopAll() {
        console.log('🚨 FORCE STOPPING ALL VOICE ACTIVITIES');
        
        // Stop all media tracks immediately
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => {
                track.stop();
                console.log('🚨 Force stopped track:', track.kind);
            });
            this.audioStream = null;
        }
        
        // Stop media recorder
        if (this.mediaRecorder) {
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                // Ignore errors during force stop
            }
            this.mediaRecorder = null;
        }
        
        // Force stop speech synthesis
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            speechSynthesis.pause();
        }
        
        // Force stop audio playback
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        // Clear all timeouts
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }
        
        // Reset all states
        this.isConnected = false;
        this.isRecording = false;
        this.isProcessing = false;
        this.isSpeaking = false;
        this.audioChunks = [];
        this.currentUtterance = null;
        
        console.log('🚨 FORCE STOP COMPLETED');
    }

    /**
     * Play text using browser TTS
     * @param {string} text - Text to speak
     * @param {string} language - Language code
     */
    async playBrowserTTS(text, language) {
        try {
            console.log(`🗣️ Using browser TTS: "${text.substring(0, 50)}..." (${language})`);
            
            if (!('speechSynthesis' in window)) {
                throw new Error('Browser TTS not supported');
            }
            
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set language
            utterance.lang = language === 'ar' ? 'ar-SA' : 'en-US';
            
            // Set voice if available
            const voices = speechSynthesis.getVoices();
            const targetVoice = voices.find(voice => 
                (language === 'ar' && voice.lang.startsWith('ar')) ||
                (language === 'en' && voice.lang.startsWith('en'))
            );
            
            if (targetVoice) {
                utterance.voice = targetVoice;
                console.log(`🎭 Using voice: ${targetVoice.name} (${targetVoice.lang})`);
            } else {
                console.log('⚠️ No suitable voice found, using default');
            }
            
            // Set speech parameters
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            return new Promise((resolve, reject) => {
                utterance.onstart = () => {
                    console.log('🔊 Browser TTS started speaking');
                    this.updateUI('speaking');
                };
                
                utterance.onend = () => {
                    console.log('✅ Browser TTS completed');
                    this.updateUI('ready');
                    resolve();
                };
                
                utterance.onerror = (error) => {
                    console.error('❌ Browser TTS error:', error);
                    this.updateUI('ready');
                    reject(error);
                };
                
                speechSynthesis.speak(utterance);
            });
            
        } catch (error) {
            console.error('❌ Browser TTS error:', error);
            throw error;
        }
    }

    /**
     * Process text with RAG system
     * @param {string} text - User's speech text
     */
    async processWithRAG(text) {
        try {
            console.log('🧠 Processing with RAG:', text);
            
            // Add to conversation context
            this.conversationContext.push({
                role: 'user',
                content: text,
                timestamp: new Date().toISOString()
            });
            
            // Send to RAG server - use main app as proxy for ngrok compatibility
            const ragUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:3001/query'
                : `${window.location.protocol}//${window.location.host}/api/rag/query`;
            
            console.log('🔗 RAG URL:', ragUrl);
            const response = await fetch(ragUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: 'fallback-' + Date.now(),
                    context: this.conversationContext.slice(-5) // Last 5 messages
                })
            });
            
            if (!response.ok) {
                throw new Error(`RAG server error: ${response.status}`);
            }
            
            const ragResult = await response.json();
            console.log('📋 RAG Result:', ragResult);
            
            if (ragResult.success && ragResult.response) {
                console.log('✅ RAG response received, starting TTS...');
                // Add AI response to context
                this.conversationContext.push({
                    role: 'assistant',
                    content: ragResult.response,
                    timestamp: new Date().toISOString()
                });
                
                // Convert to speech
                await this.speakText(ragResult.response);
            } else {
                console.log('❌ No RAG response received');
                console.log('📋 RAG Result Details:', ragResult);
                this.updateUI('ready');
            }
            
        } catch (error) {
            console.error('❌ Error processing with RAG:', error);
            this.updateUI('ready');
        }
    }

    /**
     * Convert text to speech
     * @param {string} text - Text to speak
     */
    async speakText(text) {
        try {
            console.log('🔊 Speaking text:', text.substring(0, 50) + '...');
            console.log('🔊 Full text length:', text.length);
            console.log('🔊 Current language:', this.currentLanguage);
            
            // Check secure context first
            if (!this.checkSecureContext()) {
                console.warn('⚠️ Speech synthesis may not work properly without secure context');
            }
            
            // Stop any current speech before starting new speech
            this.stopCurrentSpeech();
            
            this.updateUI('speaking');
            
            // Check if speech synthesis is available
            if (!window.speechSynthesis) {
                throw new Error('Speech synthesis not supported in this browser');
            }
            
            // Use Web Speech API for TTS
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            // Store current utterance for tracking
            this.currentUtterance = utterance;
            
            console.log('🔊 TTS utterance created:', {
                lang: utterance.lang,
                rate: utterance.rate,
                pitch: utterance.pitch,
                volume: utterance.volume
            });
            
            utterance.onstart = () => {
                console.log('🔊 TTS started speaking');
                this.isSpeaking = true;
                this.updateUI('speaking');
                
                // Add a global reference for emergency cleanup
                window.currentVoiceUtterance = utterance;
            };
            
            utterance.onend = () => {
                console.log('🔊 TTS finished speaking');
                this.isSpeaking = false;
                this.currentUtterance = null;
                window.currentVoiceUtterance = null;
                this.updateUI('ready');
            };
            
            utterance.onerror = (error) => {
                console.error('❌ TTS Error:', error);
                this.isSpeaking = false;
                this.currentUtterance = null;
                window.currentVoiceUtterance = null;
                this.updateUI('ready');
            };
            
            console.log('🔊 Starting speech synthesis...');
            window.speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error('❌ Error speaking text:', error);
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.updateUI('ready');
        }
    }

    /**
     * Update UI state
     * @param {string} state - UI state
     */
    updateUI(state) {
        const voiceBtn = document.getElementById('streamVoiceBtn');
        const voiceBtnIcon = document.getElementById('streamVoiceBtnIcon');
        const voiceBtnText = document.getElementById('voiceBtnText');
        const voiceStatus = document.getElementById('voiceStatus');
        
        if (!voiceBtn || !voiceBtnIcon || !voiceBtnText || !voiceStatus) return;
        
        // Remove all state classes
        voiceBtn.classList.remove('connecting', 'active', 'listening', 'speaking');
        
        switch(state) {
            case 'ready':
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtnText.textContent = 'Start Voice Assistant';
                voiceStatus.textContent = 'Ready to start conversation';
                // Set click handler for starting voice assistant
                voiceBtn.onclick = () => this.startConversation(this.currentLanguage);
                break;
            case 'listening':
                voiceBtn.classList.add('listening');
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtnText.textContent = 'Click to Stop';
                voiceStatus.textContent = 'Listening... Speak now!';
                // Set click handler for stopping recording
                voiceBtn.onclick = () => this.stopRecording();
                break;
            case 'processing':
                voiceBtn.classList.add('connecting');
                voiceBtnIcon.className = 'fas fa-spinner fa-spin';
                voiceBtnText.textContent = 'Processing...';
                voiceStatus.textContent = 'Processing your request...';
                // Disable click during processing
                voiceBtn.onclick = null;
                break;
            case 'speaking':
                voiceBtn.classList.add('speaking');
                voiceBtnIcon.className = 'fas fa-volume-up';
                voiceBtnText.textContent = 'Click to Interrupt';
                voiceStatus.textContent = 'AI is responding... Click to interrupt';
                // Add interrupt functionality
                voiceBtn.onclick = () => {
                    console.log('🛑 Interrupt button clicked - stopping AI speech');
                    this.handleInterruption();
                };
                console.log('🔊 AI Speaking state - interrupt button ready');
                break;
        }
    }

    /**
     * Set language for conversation
     * @param {string} language - Language code
     */
    setLanguage(language) {
        this.currentLanguage = language;
        console.log('🌐 Language set to:', language);
    }

    /**
     * Start recording countdown
     */
    startRecordingCountdown() {
        this.countdownInterval = setInterval(() => {
            if (!this.isRecording) {
                this.stopRecordingCountdown();
                return;
            }
            
            const elapsed = Date.now() - this.recordingStartTime;
            const remaining = Math.max(0, this.maxRecordingTime - elapsed);
            const seconds = Math.ceil(remaining / 1000);
            
            // Update UI with countdown
            const voiceStatus = document.getElementById('voiceStatus');
            if (voiceStatus) {
                voiceStatus.textContent = `Listening... ${seconds}s remaining`;
            }
            
            // Auto-stop when time is up
            if (remaining <= 0) {
                this.stopRecording();
            }
        }, 100);
    }

    /**
     * Stop recording countdown
     */
    stopRecordingCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}

// Make it globally available
window.FallbackVoiceService = FallbackVoiceService;
