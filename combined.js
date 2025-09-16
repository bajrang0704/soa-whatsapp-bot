// Voice Module
/*
import { socketService } from './socket-service.js';
import { t } from './translations.js';
import { iosCompatibility } from './ios-compatibility.js';

export class VoiceModule {
    constructor() {
        this.currentLanguage = 'en';
        this.isConversationActive = false;
        this.isProcessingVoice = false;
        this.isSpeaking = false;
        this.conversationTimeout = null;
        this.conversationContext = [];
        this.lastInteractionTime = Date.now();
        this.wasInterrupted = false;
        
        // Audio recording variables
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.audioStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.recordingTimeout = null;
        
        // Constants
        this.CONVERSATION_TIMEOUT = 600000; // 10 minutes
        this.RESPONSE_DELAY = 500;
        this.MAX_RECORDING_TIME = 30000; // 30 seconds
        this.SILENCE_DURATION = 5000; // 5 seconds
        
        this.setupEventListeners();
        this.setupWindowCloseListeners();
    }

    // Set current language
    setLanguage(language) {
        this.currentLanguage = language;
    }

    // Test backend connectivity
    async testBackendConnectivity() {
        try {
            console.log('🔍 Testing backend connectivity...');
            const response = await fetch('/api/voice/config', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const config = await response.json();
                console.log('✅ Backend is accessible:', config);
            } else {
                console.warn('⚠️ Backend responded with status:', response.status);
            }
        } catch (error) {
            console.error('❌ Backend connectivity test failed:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Voice button - using dynamic onclick instead of event listener to avoid conflicts
        // This will be set up in the main app initialization
    }

    // Setup window close listeners for complete audio cleanup
    setupWindowCloseListeners() {
        console.log('🔧 Setting up window close listeners for audio cleanup');
        
        // Handle window close/refresh
        window.addEventListener('beforeunload', () => {
            console.log('🚪 Window closing - performing complete audio cleanup');
            this.performCompleteAudioCleanup();
        });
        
        // Handle page unload
        window.addEventListener('unload', () => {
            console.log('🚪 Page unloading - performing complete audio cleanup');
            this.performCompleteAudioCleanup();
        });
        
        // Handle page hide (mobile browsers)
        document.addEventListener('pagehide', () => {
            console.log('📱 Page hiding - performing complete audio cleanup');
            this.performCompleteAudioCleanup();
        });
        
        // Handle visibility change to hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('👁️ Page hidden - performing complete audio cleanup');
                this.performCompleteAudioCleanup();
            }
        });
    }

    // Perform complete audio cleanup
    performCompleteAudioCleanup() {
        console.log('🧹 Performing complete audio cleanup');
        
        // Stop all voice activities
        this.stopVoiceConversation();
        
        // Emergency cleanup for any remaining audio
        this.emergencyAudioCleanup();
        
        console.log('✅ Complete audio cleanup finished');
    }

    // Emergency audio cleanup for any remaining audio
    emergencyAudioCleanup() {
        console.log('🚨 Emergency audio cleanup');
        
        // Stop ALL speech synthesis activities
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.pause();
                console.log('🔇 Emergency: Speech synthesis stopped');
            } catch (e) {
                console.log('⚠️ Emergency: Speech synthesis cleanup failed');
            }
        }
        
        // Stop ALL audio playback
        if (window.currentAudio) {
            try {
                window.currentAudio.pause();
                window.currentAudio.currentTime = 0;
                window.currentAudio = null;
                console.log('🔇 Emergency: Global audio stopped');
            } catch (e) {
                console.log('⚠️ Emergency: Global audio cleanup failed');
            }
        }
        
        // Stop ALL audio elements on the page
        const allAudioElements = document.querySelectorAll('audio');
        allAudioElements.forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {
                console.log('⚠️ Emergency: Audio element cleanup failed');
            }
        });
        
        // Close audio contexts
        if (window.audioContext) {
            try {
                window.audioContext.close();
                window.audioContext = null;
                console.log('🔇 Emergency: Audio context closed');
            } catch (e) {
                console.log('⚠️ Emergency: Audio context cleanup failed');
            }
        }
        
        // Clear global references
        if (window.currentVoiceUtterance) {
            window.currentVoiceUtterance = null;
        }
        
        console.log('🚨 Emergency audio cleanup completed');
    }

    // Start voice conversation
  /*  startVoiceConversation() {
        console.log('🚀 Starting human-like voice conversation');
        
        // Test backend connectivity
        this.testBackendConnectivity();
        
        // Check security context
        const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (!isSecureContext) {
            console.warn('⚠️ Cannot start voice conversation: HTTPS required');
            this.handleRecordingError('https-required');
            return;
        }
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('⚠️ Cannot start voice conversation: getUserMedia not supported');
            this.handleRecordingError('recording-failed');
            return;
        }
        
        this.isConversationActive = true;
        console.log('✅ Conversation marked as ACTIVE');
        this.isProcessingVoice = false;
        this.isSpeaking = false;
        this.lastInteractionTime = Date.now();
        
        // Update UI
        this.updateVoiceButtonState('active');
        this.updateVoiceStatus(t('listening', this.currentLanguage));
        this.updateVoiceAvatar('listening');
        this.showVoiceWaves(true);
        
        // Start the conversation with greeting
        this.playInitialGreeting(() => {
            if (this.isConversationActive) {
                this.startListening();
                this.resetConversationTimeout();
            }
        });
    }

    // Stop voice conversation
    stopVoiceConversation() {
        console.log('🛑 Stopping voice conversation');
        
        // Set all flags to false
        this.isConversationActive = false;
        console.log('❌ Conversation marked as INACTIVE');
        this.isProcessingVoice = false;
        this.isSpeaking = false;
        this.isRecording = false;
        
        // Stop microphone recording
        this.stopMicrophone();
        
        // Stop speech synthesis
        this.stopAllSpeechSynthesis();
        
        // Stop any ongoing audio playback
        this.stopAllAudioPlayback();
        
        // Clear all timeouts
        clearTimeout(this.conversationTimeout);
        clearTimeout(this.recordingTimeout);
        
        // Update UI
        this.updateVoiceButtonState('ready');
        this.updateVoiceAvatar('ready');
        this.showVoiceWaves(false);
        
        // Show end message
        const endMessage = this.currentLanguage === 'ar' ? 'المحادثة الصوتية متوقفة' : 'Voice conversation stopped';
        this.updateVoiceStatus(endMessage);
        
        // Quick transition back to ready state
        setTimeout(() => {
            this.updateVoiceStatus(t('voice-ready', this.currentLanguage));
        }, 1500);
    }

    // Stop microphone recording and release resources
    stopMicrophone() {
        console.log('🎤 Stopping microphone recording');
        
        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            try {
                this.mediaRecorder.stop();
                console.log('✅ MediaRecorder stopped');
            } catch (e) {
                console.log('⚠️ MediaRecorder already stopped');
            }
        }
        
        // Stop audio stream tracks
        if (this.audioStream) {
            try {
                this.audioStream.getTracks().forEach(track => {
                    track.stop();
                    console.log('✅ Audio track stopped');
                });
                this.audioStream = null;
            } catch (e) {
                console.log('⚠️ Audio stream already stopped');
            }
        }
        
        // Stop audio level monitoring
        this.stopAudioLevelMonitoring();
        
        // Clear audio chunks
        this.audioChunks = [];
        this.mediaRecorder = null;
        this.isRecording = false;
    }

    // Stop all speech synthesis
    stopAllSpeechSynthesis() {
        console.log('🔇 Stopping all speech synthesis');
        
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.pause();
                console.log('✅ Speech synthesis stopped');
            } catch (e) {
                console.log('⚠️ Speech synthesis already stopped');
            }
        }
        
        // Clear any global utterance references
        if (window.currentVoiceUtterance) {
            window.currentVoiceUtterance = null;
        }
    }

    // Stop all audio playback
    stopAllAudioPlayback() {
        console.log('🔇 Stopping all audio playback');
        
        // Stop current audio
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
                console.log('✅ Current audio stopped');
            } catch (e) {
                console.log('⚠️ Current audio already stopped');
            }
        }
        
        // Stop all audio elements on the page
        const allAudioElements = document.querySelectorAll('audio');
        allAudioElements.forEach(audio => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {
                console.log('⚠️ Audio element already stopped');
            }
        });
        
        // Stop any global audio
        if (window.currentAudio) {
            try {
                window.currentAudio.pause();
                window.currentAudio.currentTime = 0;
                window.currentAudio = null;
            } catch (e) {
                console.log('⚠️ Global audio already stopped');
            }
        }
    }

    // Start listening
    startListening() {
        console.log('🎤 startListening() called - checking conditions:', {
            isConversationActive: this.isConversationActive,
            isRecording: this.isRecording,
            isProcessingVoice: this.isProcessingVoice,
            isSpeaking: this.isSpeaking
        });
        
        if (this.isConversationActive && !this.isRecording && !this.isProcessingVoice && !this.isSpeaking) {
            console.log('✅ All conditions met - starting to listen...');
            
            // Update UI for listening state
            this.updateVoiceAvatar('listening');
            this.showVoiceWaves(true);
            this.updateVoiceStatus(t('listening', this.currentLanguage));
            
            // Start audio recording
            this.startAudioRecording();
        } else {
            console.log('❌ Cannot start listening - conditions not met');
        }
    }

    // Start audio recording
    async startAudioRecording() {
        try {
            console.log('🎤 Requesting microphone access for Google Cloud...');
            
            // Check iOS compatibility first
            if (iosCompatibility.isIOS) {
                const hasPermission = await iosCompatibility.requestMicrophonePermission();
                if (!hasPermission) {
                    throw new Error('iOS microphone permission denied');
                }
            }
            
            // Use iOS-compatible audio constraints
            const constraints = iosCompatibility.isIOS ? 
                iosCompatibility.getAudioConstraints() : 
                { 
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: true
                } 
                };
            
            this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            console.log('✅ Microphone access granted successfully');
            
            // Set up audio level monitoring
            this.setupAudioLevelMonitoring(this.audioStream);
            
            // Create MediaRecorder with Google Cloud-compatible formats
            const options = { 
                audioBitsPerSecond: 16000
            };
            
            // Try formats in order of Google Cloud compatibility
            const supportedFormats = [
                'audio/wav',
                'audio/mp4',
                'audio/webm',
                'audio/ogg'
            ];
            
            let selectedFormat = null;
            for (const mimeType of supportedFormats) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedFormat = mimeType;
                    break;
                }
            }
            
            if (selectedFormat) {
                options.mimeType = selectedFormat;
                console.log(`✅ Using audio format: ${selectedFormat}`);
            }
            
            // Use iOS-compatible MediaRecorder if needed
            if (iosCompatibility.isIOS) {
                this.mediaRecorder = await iosCompatibility.createMediaRecorder();
            } else {
            this.mediaRecorder = new MediaRecorder(this.audioStream, options);
            }
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log(`📦 Audio chunk collected: ${event.data.size} bytes`);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('🛑 Recording stopped, processing with Google Cloud...');
                this.processRecordedAudioWithGoogleCloud();
            };
            
            this.mediaRecorder.onerror = (error) => {
                console.error('❌ MediaRecorder error:', error);
                this.handleRecordingError('recording-failed');
            };
            
            // Start recording
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            
            console.log('🔴 Recording started for Google Cloud');
            
            // Set maximum recording time
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    console.log('⏰ Maximum recording time reached');
                    this.stopAudioRecording();
                }
            }, this.MAX_RECORDING_TIME);
            
            // Auto-stop after reasonable time
            setTimeout(() => {
                if (this.isRecording && !this.isSpeaking) {
                    console.log('🔇 Auto-stopping after recording period (15 seconds)');
                    this.stopAudioRecording();
                }
            }, 15000);
            
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            this.handleRecordingError('recording-failed');
        }
    }

    // Stop audio recording
    stopAudioRecording() {
        if (this.mediaRecorder && this.isRecording) {
            console.log('⏹️ Stopping audio recording...');
            
            clearTimeout(this.recordingTimeout);
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop microphone stream
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            
            // Stop audio level monitoring
            this.stopAudioLevelMonitoring();
            
            this.updateVoiceStatus(t('processing', this.currentLanguage));
            this.updateVoiceButtonState('processing');
        }
    }

    // Process recorded audio with Google Cloud
    async processRecordedAudioWithGoogleCloud() {
        try {
            if (this.audioChunks.length === 0) {
                console.warn('⚠️ No audio data collected');
                if (this.isConversationActive) {
                    setTimeout(() => this.startListening(), 1000);
                }
                return;
            }
            
            console.log('🔄 Creating audio blob for Deepgram...');
            
            let mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
            if (mimeType.includes('opus')) {
                mimeType = 'audio/ogg; codecs=opus';
            }
            
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            console.log(`🎵 Audio blob created: ${audioBlob.size} bytes, type: ${mimeType}`);
            
            // Send to Google Cloud
            await this.sendAudioToGoogleCloud(audioBlob, mimeType);
            
        } catch (error) {
            console.error('❌ Failed to process recorded audio:', error);
            this.handleRecordingError('processing-failed');
        }
    }

    // Send audio to Google Cloud Voice Pipeline (STT + RAG + TTS)
    async sendAudioToGoogleCloud(audioBlob, mimeType = 'audio/webm') {
        try {
            console.log('📤 Sending audio to Google Cloud Voice Pipeline...');
            
            const formData = new FormData();
            const fileName = mimeType.includes('webm') ? 'recording.webm' : 
                            mimeType.includes('mp4') ? 'recording.mp4' : 'recording.wav';
            formData.append('audio', audioBlob, fileName);
            formData.append('language', this.currentLanguage === 'ar' ? 'ar' : 'en');
            
            // Call the complete voice pipeline endpoint (STT + RAG + TTS)
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('🎯 Google Cloud Voice Pipeline response:', result);
            console.log('🔍 Full pipeline response details:', JSON.stringify(result, null, 2));
            
            if (result.success) {
                // Check if we have a complete pipeline response
                if (result.pipeline && result.pipeline.stt && result.pipeline.stt.transcript && result.pipeline.stt.transcript.trim().length > 0) {
                    console.log('✅ Complete voice pipeline successful:', result.pipeline.stt.transcript);
                    console.log('🧠 RAG result:', result.pipeline.rag);
                    console.log('🔊 TTS result:', result.pipeline.tts);
                    
                    // Use the complete pipeline response (STT + RAG + TTS)
                    this.handleCompleteVoiceResponse(result.pipeline);
                } else {
                    console.warn('⚠️ No speech detected in pipeline response');
                    console.log('🔍 Pipeline structure:', result.pipeline);
                    const noSpeechMessage = this.currentLanguage === 'ar' 
                        ? 'لم أتمكن من سماع أي كلام. يرجى التحدث بوضوح وأقرب إلى الميكروفون.'
                        : 'I couldn\'t hear any speech. Please speak clearly and closer to the microphone.';
                    
                    this.updateVoiceStatus(noSpeechMessage);
                    setTimeout(() => {
                        if (this.isConversationActive) {
                            this.updateVoiceStatus(t('listening', this.currentLanguage));
                            this.startListening();
                        }
                    }, 3000);
                }
            } else {
                console.error('❌ Pipeline failed:', result.error);
                throw new Error(`Google Cloud voice pipeline failed: ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('❌ Google Cloud voice pipeline error:', error);
            console.error('❌ Error details:', error.message);
            this.handleRecordingError('google-cloud-service-failed');
        }
    }
    // Handle complete voice pipeline response (STT + RAG + TTS)
    handleCompleteVoiceResponse(pipeline) {
        console.log('🎯 Processing complete voice pipeline response:', pipeline);
        
        const transcript = pipeline.stt?.transcript;
        const ragResponse = pipeline.rag?.response;
        const ttsAudio = pipeline.tts?.audioBuffer;
        
        if (transcript && transcript.trim().length > 0) {
            console.log('🗣️ User said:', transcript);
            
            // Add user message to conversation context
            this.conversationContext.push({
                role: 'user',
                message: transcript,
                timestamp: new Date().toISOString()
            });
            
            // Keep only last 8 messages
            if (this.conversationContext.length > 8) {
                this.conversationContext = this.conversationContext.slice(-8);
            }
            
            this.lastInteractionTime = Date.now();
            this.resetConversationTimeout();
            
            this.isProcessingVoice = true;
            this.updateVoiceStatus(t('processing', this.currentLanguage));
            this.updateVoiceButtonState('processing');
            this.updateVoiceAvatar('processing');
            this.showVoiceWaves(false);
            
            // Use RAG response only (no fallback)
            console.log('🧠 RAG Response received:', ragResponse);
            console.log('🔍 RAG Response type:', typeof ragResponse);
            console.log('🔍 RAG Response length:', ragResponse ? ragResponse.length : 'null');
            
            if (!ragResponse) {
                console.error('❌ No RAG response received - this should not happen');
                const errorMessage = this.currentLanguage === 'ar' 
                    ? 'عذراً، حدث خطأ في معالجة استفسارك. يرجى المحاولة مرة أخرى.'
                    : 'Sorry, there was an error processing your query. Please try again.';
                this.updateVoiceStatus(errorMessage);
                setTimeout(() => {
                    if (this.isConversationActive) {
                        this.startListening();
                    }
                }, 3000);
                return;
            }
            
            const responseText = ragResponse;
            console.log('🎯 Final response text:', responseText);
            
            // Add AI response to conversation context
            this.conversationContext.push({
                role: 'assistant',
                message: responseText,
                timestamp: new Date().toISOString()
            });
            
            // Play TTS audio if available, otherwise use browser TTS
            if (ttsAudio) {
                this.playTTSAudio(ttsAudio, responseText);
            } else {
                this.speakTextContinuous(responseText, () => {
                    console.log('🔄 TTS callback triggered - checking conversation state:', this.isConversationActive);
                    if (this.isConversationActive) {
                        console.log('🔄 Restarting listening after response');
                        this.resetConversationTimeout(); // Reset timeout after AI response
                        setTimeout(() => {
                            this.startListening();
                        }, 300);
                    } else {
                        console.log('❌ Conversation not active - not restarting listening');
                    }
                });
            }
        } else {
            console.warn('⚠️ No transcript in pipeline response');
            // Don't end conversation, just restart listening
            if (this.isConversationActive) {
                this.updateVoiceStatus(t('listening', this.currentLanguage));
                this.updateVoiceButtonState('listening');
                this.updateVoiceAvatar('listening');
                this.showVoiceWaves(true);
                setTimeout(() => {
                    this.startListening();
                }, 1000);
            }
        }
    }

    // Play TTS audio from backend
    async playTTSAudio(base64Audio, responseText) {
        try {
            console.log('🔊 Playing TTS audio from backend...');
            
            // Convert base64 to audio buffer
            const audioData = atob(base64Audio);
            const audioBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(audioBuffer);
            
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
            }
            
            // Play audio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioSource = audioContext.createBufferSource();
            const audioBufferData = await audioContext.decodeAudioData(audioBuffer);
            
            audioSource.buffer = audioBufferData;
            audioSource.connect(audioContext.destination);
            
            this.isSpeaking = true;
            this.updateVoiceStatus(t('speaking', this.currentLanguage));
            this.updateVoiceButtonState('speaking');
            this.updateVoiceAvatar('speaking');
            this.showVoiceWaves(false);
            
            audioSource.start();
            
            // When audio finishes, restart listening
            audioSource.onended = () => {
                console.log('✅ Backend TTS audio playback completed');
                this.isSpeaking = false;
                if (this.isConversationActive) {
                    console.log('🔄 Restarting listening after backend TTS audio');
                    this.resetConversationTimeout(); // Reset timeout after AI response
                    this.updateVoiceStatus(t('listening', this.currentLanguage));
                    this.updateVoiceButtonState('listening');
                    this.updateVoiceAvatar('listening');
                    this.showVoiceWaves(true);
                    setTimeout(() => {
                        this.startListening();
                    }, 300);
                } else {
                    console.log('❌ Conversation not active - not restarting listening after TTS');
                }
            };
            
        } catch (error) {
            console.error('❌ Error playing TTS audio:', error);
            // Fallback to browser TTS
            this.speakTextContinuous(responseText, () => {
                if (this.isConversationActive) {
                    setTimeout(() => {
                        this.startListening();
                    }, 300);
                }
            });
        }
    }

    // Handle transcription result (legacy method - kept for compatibility)
    handleTranscriptionResult(transcript) {
        console.log('🗣️ User said:', transcript);
        
        if (transcript.length > 0) {
            this.lastInteractionTime = Date.now();
            this.resetConversationTimeout();
            
            this.isProcessingVoice = true;
            this.updateVoiceStatus(t('processing', this.currentLanguage));
            
            // Add user message to conversation context
            this.conversationContext.push({
                role: 'user',
                message: transcript,
                timestamp: new Date().toISOString(),
                wasInterruption: this.wasInterrupted
            });
            
            // Reset interruption flag
            this.wasInterrupted = false;
            
            // Process the voice input
            this.processVoiceInputContinuous(transcript);
        } else {
            console.log('⚠️ Empty transcription, restarting listening...');
            if (this.isConversationActive) {
                setTimeout(() => this.startListening(), this.RESPONSE_DELAY);
            }
        }
    }

    // Process voice input continuously
    processVoiceInputContinuous(transcript) {
        console.log('🧠 Processing voice input:', transcript);
        
        // Send to backend for processing via Socket.IO
        if (socketService.getConnectionStatus()) {
            console.log('📤 Sending voice message via Socket.IO');
            
            const sent = socketService.sendVoiceMessage(
                transcript, 
                this.currentLanguage, 
                this.conversationContext
            );
            
            if (sent) {
                // Set up response handler
                const responseHandler = (response) => {
                    console.log('📨 Received RAG response from server:', response);
                    this.isProcessingVoice = false;
                    this.handleVoiceResponse(response.message || response);
                    
                    // Clean up listener
                    socketService.off('message-response', responseHandler);
                };
                
                socketService.onMessageResponse(responseHandler);
                
                // Timeout fallback
                setTimeout(() => {
                    if (this.isProcessingVoice) {
                        console.warn('⏰ Server response timeout - using fallback');
                        this.isProcessingVoice = false;
                        const localResponse = this.generateVoiceResponse(transcript);
                        this.handleVoiceResponse(localResponse);
                        socketService.off('message-response', responseHandler);
                    }
                }, 20000);
                
            } else {
                this.handleSendError(transcript);
            }
            
        } else {
            // Fallback to local processing
            console.log('🔌 No socket connection, using local voice processing');
            setTimeout(() => {
                this.isProcessingVoice = false;
                const response = this.generateVoiceResponse(transcript);
                this.handleVoiceResponse(response);
            }, 1500);
        }
    }

    // Handle voice response
    handleVoiceResponse(responseText) {
        console.log('🤖 Bot responding:', responseText);
        
        // Add AI response to conversation context
        this.conversationContext.push({
            role: 'assistant',
            message: responseText,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 8 messages
        if (this.conversationContext.length > 8) {
            this.conversationContext = this.conversationContext.slice(-8);
        }
        
        // Update UI for processing
        this.updateVoiceAvatar('processing');
        this.showVoiceWaves(false);
        this.updateVoiceStatus(t('processing', this.currentLanguage));
        
        // Speak the response
        this.speakTextContinuous(responseText, () => {
            if (this.isConversationActive) {
                console.log('🔄 Restarting listening after response');
                setTimeout(() => {
                    this.startListening();
                }, 300);
            }
        });
    }

    // Generate voice response (fallback)
    generateVoiceResponse(transcript) {
        const input = transcript.toLowerCase();
        let response = '';
        
        if (input.includes('hello') || input.includes('hi') || input.includes('مرحبا') || input.includes('السلام عليكم')) {
            response = this.currentLanguage === 'ar' 
                ? 'مرحباً! أنا هنا لمساعدتك. تحدث معي بحرية، ما الذي تريد معرفته عن الكلية؟'
                : 'Hi there! I\'m here to help you. Feel free to talk to me - what would you like to know about the college?';
        }
        else if (input.includes('department') || input.includes('قسم') || input.includes('أقسام')) {
            response = this.currentLanguage === 'ar'
                ? 'لدينا 16 قسماً رائعاً. أي قسم يهمك؟ يمكنني إخبارك عن الطب، الهندسة، اللغات، أو أي قسم آخر.'
                : 'We have 16 amazing departments! Which one interests you? I can tell you about medicine, engineering, languages, or any other department.';
        }
        else if (input.includes('fee') || input.includes('cost') || input.includes('price') || input.includes('رسوم') || input.includes('تكلفة')) {
            response = this.currentLanguage === 'ar'
                ? 'الرسوم تختلف حسب القسم. الأقسام الطبية أغلى قليلاً، لكنها تستحق الاستثمار. أي قسم تريد معرفة رسومه؟'
                : 'Fees vary by department. Medical departments are a bit more expensive, but they\'re worth the investment. Which department\'s fees are you curious about?';
        }
        else {
            const genericResponses = this.currentLanguage === 'ar' ? [
                'أهلاً! سؤالك مثير للاهتمام. دعني أساعدك في ذلك.',
                'نعم، هذا موضوع مهم. إليك ما أعرفه عنه.',
                'فهمت، تريد معرفة المزيد. هذا رائع!',
                'ممتاز! أنا هنا لمساعدتك في أي استفسار.',
                'رائع! يمكنني إعطاؤك معلومات مفيدة عن الكلية.'
            ] : [
                'That\'s interesting! Let me help you with that.',
                'Yes, that\'s an important topic. Here\'s what I can tell you.',
                'I understand you want to know more. That\'s great!',
                'Excellent! I\'m here to help with any questions.',
                'Great! I can provide you with useful information about the college.'
            ];
            
            response = genericResponses[Math.floor(Math.random() * genericResponses.length)];
        }
        
        return response;
    }

    // Speak text continuously
    speakTextContinuous(text, callback) {
        console.log('🗣️ Speaking with Google Cloud TTS:', text.substring(0, 50) + '...');
        
        this.isSpeaking = true;
        this.updateVoiceStatus(t('speaking', this.currentLanguage));
        this.updateVoiceButtonState('speaking');
        this.updateVoiceAvatar('speaking');
        this.showVoiceWaves(false);
        
        // Use Google Cloud TTS
        this.speakWithGoogleCloud(text, callback);
    }

    // Speak with Google Cloud TTS
    async speakWithGoogleCloud(text, callback) {
        try {
            console.log('🔊 Converting text to speech with Google Cloud...');
            
            const response = await fetch('/api/voice/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    language: this.currentLanguage === 'ar' ? 'ar' : 'en',
                    voiceType: 'female'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Google Cloud TTS API error: ${response.status}`);
            }
            
            const audioBuffer = await response.arrayBuffer();
            console.log(`✅ Google Cloud TTS completed (${audioBuffer.byteLength} bytes)`);
            
            // Play audio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioSource = audioContext.createBufferSource();
            const audioBufferData = await audioContext.decodeAudioData(audioBuffer);
            
            audioSource.buffer = audioBufferData;
            audioSource.connect(audioContext.destination);
            
            audioSource.onended = () => {
                console.log('✅ Google Cloud TTS playback completed');
                this.isSpeaking = false;
                
                if (this.isConversationActive) {
                    this.updateVoiceStatus(t('listening', this.currentLanguage));
                    this.updateVoiceButtonState('listening');
                    this.updateVoiceAvatar('listening');
                    this.showVoiceWaves(true);
                }
                
                if (callback) {
                    console.log('🔄 Calling TTS callback to restart listening...');
                    this.resetConversationTimeout(); // Reset timeout after AI response
                    setTimeout(callback, 200);
                }
            };
            
            audioSource.start();
            
        } catch (error) {
            console.error('❌ Google Cloud TTS error:', error);
            // Fallback to browser TTS
            this.speakWithBrowserTTS(text, callback);
        }
    }

    // Speak with browser TTS (fallback)
    speakWithBrowserTTS(text, callback) {
        if (!window.speechSynthesis) {
            if (callback) callback();
            return;
        }
        
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onend = () => {
            console.log('✅ Browser TTS completed');
            this.isSpeaking = false;
            
            if (this.isConversationActive) {
                this.updateVoiceStatus(t('listening', this.currentLanguage));
                this.updateVoiceButtonState('listening');
                this.updateVoiceAvatar('listening');
                this.showVoiceWaves(true);
            }
            
            if (callback) {
                console.log('🔄 Calling browser TTS callback to restart listening...');
                this.resetConversationTimeout(); // Reset timeout after AI response
                setTimeout(callback, 200);
            }
        };
        
        window.speechSynthesis.speak(utterance);
    }

    // Play initial greeting
    async playInitialGreeting(callback) {
        try {
            console.log('🎯 Playing initial greeting...');
            
            const response = await fetch('/api/voice/initial-greeting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language: this.currentLanguage
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('✅ Initial greeting received:', data.message);
                    // Play the audio or use TTS
                    this.speakTextContinuous(data.message, callback);
                    return;
                }
            }
            
            // Fallback greeting
            const fallbackGreeting = this.currentLanguage === 'ar' 
                ? 'مرحباً، هذا مكتب الإدارة في كلية سلطان للفنون. كيف يمكنني مساعدتك؟'
                : 'Hi, this is the administration desk of SOA college. How can I help you?';
            this.speakTextContinuous(fallbackGreeting, callback);
            
        } catch (error) {
            console.error('❌ Error playing initial greeting:', error);
            const fallbackGreeting = this.currentLanguage === 'ar' 
                ? 'مرحباً، هذا مكتب الإدارة في كلية سلطان للفنون. كيف يمكنني مساعدتك؟'
                : 'Hi, this is the administration desk of SOA college. How can I help you?';
            this.speakTextContinuous(fallbackGreeting, callback);
        }
    }

    // Audio level monitoring
    setupAudioLevelMonitoring(stream) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            this.microphone.connect(this.analyser);
            
            const checkAudioLevel = () => {
                if (this.analyser && this.isRecording) {
                    this.analyser.getByteFrequencyData(dataArray);
                    
                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / bufferLength;
                    const volume = average > 0 ? 20 * Math.log10(average / 255) : -Infinity;
                    
                    if (Math.random() < 0.1) { // 10% chance to log
                        console.log(`🎤 Audio level: ${volume.toFixed(1)} dB`);
                    }
                    
                    requestAnimationFrame(checkAudioLevel);
                }
            };
            
            checkAudioLevel();
            console.log('✅ Audio level monitoring started');
            
        } catch (error) {
            console.warn('⚠️ Audio level monitoring failed:', error);
        }
    }

    stopAudioLevelMonitoring() {
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.analyser = null;
        console.log('🔇 Audio level monitoring stopped');
    }

    // UI Update Methods
   /* updateVoiceButtonState(state) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceBtnIcon = document.getElementById('voiceBtnIcon');
        
        if (!voiceBtn || !voiceBtnIcon) return;
        
        // Remove all state classes
        voiceBtn.classList.remove('ready', 'active', 'listening', 'speaking', 'processing');
        
        switch(state) {
            case 'ready':
                voiceBtn.classList.add('ready');
                voiceBtnIcon.className = 'fas fa-play';
                voiceBtn.onclick = () => this.startVoiceConversation();
                break;
            case 'active':
                voiceBtn.classList.add('active');
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtn.onclick = () => this.stopVoiceConversation(); // Allow stopping conversation
                break;
            case 'listening':
                voiceBtn.classList.add('listening');
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtn.onclick = () => this.startListening();
                break;
            case 'speaking':
                voiceBtn.classList.add('speaking');
                voiceBtnIcon.className = 'fas fa-volume-up';
                voiceBtn.onclick = () => this.interruptSpeaking(); // Allow interruption
                break;
            case 'processing':
                voiceBtn.classList.add('processing');
                voiceBtnIcon.className = 'fas fa-cog fa-spin';
                break;
        }
    }

    updateVoiceAvatar(state) {
        const voiceAvatar = document.getElementById('voiceAvatar');
        const voiceAvatarIcon = document.getElementById('voiceAvatarIcon');
        
        if (!voiceAvatar || !voiceAvatarIcon) return;
        
        voiceAvatar.classList.remove('listening', 'speaking', 'processing');
        
        switch(state) {
            case 'listening':
                voiceAvatar.classList.add('listening');
                voiceAvatarIcon.className = 'fas fa-microphone';
                break;
            case 'speaking':
                voiceAvatar.classList.add('speaking');
                voiceAvatarIcon.className = 'fas fa-volume-up';
                break;
            case 'processing':
                voiceAvatar.classList.add('processing');
                voiceAvatarIcon.className = 'fas fa-cog fa-spin';
                break;
            default:
                voiceAvatarIcon.className = 'fas fa-robot';
        }
    }

    showVoiceWaves(show) {
        const voiceWaves = document.getElementById('voiceWaves');
        if (voiceWaves) {
            if (show) {
                voiceWaves.classList.add('active');
            } else {
                voiceWaves.classList.remove('active');
            }
        }
    }

    updateVoiceStatus(status) {
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    // Interrupt speaking
    interruptSpeaking() {
        console.log('🖐️ User interrupted speaking');
        
        // Stop all speech synthesis
        this.stopAllSpeechSynthesis();
        
        // Stop all audio playback
        this.stopAllAudioPlayback();
        
        this.isSpeaking = false;
        this.wasInterrupted = true;
        
        if (this.isConversationActive) {
            this.updateVoiceStatus(this.currentLanguage === 'ar' ? 'تم المقاطعة - انقر للتحدث' : 'Interrupted - click to speak');
            this.updateVoiceButtonState('listening');
            this.updateVoiceAvatar('listening');
            this.showVoiceWaves(true);
            
            // Don't automatically start listening - wait for user to click
            // User can click the button to start speaking again
        }
    }

    // Reset conversation timeout
    resetConversationTimeout() {
        clearTimeout(this.conversationTimeout);
        console.log('⏰ Resetting conversation timeout (10 minutes)');
        this.conversationTimeout = setTimeout(() => {
            console.log('⏰ Conversation timeout - ending conversation');
            console.log('⏰ Timeout triggered - conversation was active for 10 minutes');
            this.stopVoiceConversation();
        }, this.CONVERSATION_TIMEOUT);
    }

    // Handle recording errors
    handleRecordingError(errorType) {
        this.isRecording = false;
        this.isProcessingVoice = false;
        
        let errorMessage;
        let shouldEndConversation = false;
        
        switch(errorType) {
            case 'mic-access-denied':
                errorMessage = this.currentLanguage === 'ar' ? 'يرجى السماح بالوصول للميكروفون' : 'Please allow microphone access';
                shouldEndConversation = true; // Critical error
                break;
            case 'recording-failed':
                errorMessage = this.currentLanguage === 'ar' ? 'فشل في التسجيل' : 'Recording failed';
                shouldEndConversation = false; // Non-critical, can retry
                break;
            case 'processing-failed':
                errorMessage = this.currentLanguage === 'ar' ? 'فشل في معالجة الصوت' : 'Audio processing failed';
                shouldEndConversation = false; // Non-critical, can retry
                break;
            case 'google-cloud-service-failed':
                errorMessage = this.currentLanguage === 'ar' ? 'خدمة التعرف على الصوت غير متاحة' : 'Voice recognition service unavailable';
                shouldEndConversation = false; // Non-critical, can retry
                break;
            case 'https-required':
                errorMessage = this.currentLanguage === 'ar' ? 'الميكروفون يتطلب HTTPS أو localhost للعمل' : 'Microphone requires HTTPS or localhost to work';
                shouldEndConversation = true; // Critical error
                break;
            case 'no-transcript':
                errorMessage = this.currentLanguage === 'ar' ? 'لم يتم التعرف على الكلام' : 'No speech detected';
                shouldEndConversation = false; // Non-critical, can retry
                break;
            default:
                errorMessage = t('error-occurred', this.currentLanguage);
                shouldEndConversation = false; // Non-critical by default
        }
        
        this.updateVoiceStatus(errorMessage);
        
        if (shouldEndConversation) {
            // End conversation for critical errors
        this.isConversationActive = false;
        this.updateVoiceButtonState('ready');
        this.updateVoiceAvatar('ready');
        this.showVoiceWaves(false);
        
        setTimeout(() => {
            this.updateVoiceStatus(t('voice-ready', this.currentLanguage));
        }, 5000);
        } else {
            // For non-critical errors, just restart listening after a delay
            if (this.isConversationActive) {
                setTimeout(() => {
                    this.updateVoiceStatus(t('listening', this.currentLanguage));
                    this.updateVoiceButtonState('listening');
                    this.updateVoiceAvatar('listening');
                    this.showVoiceWaves(true);
                    this.startListening();
                }, 2000);
            }
        }
    }

    // Handle send error
    handleSendError(transcript) {
        this.isProcessingVoice = false;
        const localResponse = this.generateVoiceResponse(transcript);
        this.handleVoiceResponse(localResponse);
    }
}

// Export singleton instance
export const voiceModule = new VoiceModule();





// another file bundle.js


// Bundled JavaScript for SOA University College App - Updated for Complete Voice Pipeline
console.log('🚀 Loading SOA University College App Bundle (Voice Pipeline v2.0)...');

// University Data
const universityData = {
    "academic_year": "2025-2026",
    "university": "SOA University College",
    "departments": {
        "Dentistry": {
            "name_ar": "طب الأسنان",
            "admission_channels": ["Scientific – Biology"],
            "admission_channels_ar": ["علمي - أحيائي"],
            "minimum_grade": { "morning": "79.5%" },
            "tuition_fee": { "morning": "10,000,000 IQD" },
            "shift": ["Morning"],
            "category": "medical"
        },
        "Pharmacy": {
            "name_ar": "الصيدلة",
            "admission_channels": ["Scientific – Biology"],
            "admission_channels_ar": ["علمي - أحيائي"],
            "minimum_grade": { "morning": "79.5%" },
            "tuition_fee": { "morning": "10,000,000 IQD" },
            "shift": ["Morning"],
            "category": "medical"
        }
        // ... (truncated for brevity, but includes all departments)
    }
};

// Translations
const translations = {
    en: {
        'soa-university-college': 'SOA University College',
        'home': 'Home',
        'departments': 'Departments',
        'chat-assistant': 'Chat Assistant',
        'voice-agent': 'Voice Agent',
        'contact': 'Contact',
        'english': 'English',
        'welcome-title': 'Welcome to SOA University College',
        'welcome-subtitle': 'Your AI-powered academic companion for admissions, course information, and college guidance',
        'start-chatting': 'Start Chatting',
        'voice-assistant': 'Voice Assistant',
        'ai-assistant': 'AI Assistant',
        'chat-assistant-title': 'Chat Assistant',
        'chat-welcome': 'Hello! I\'m your SOA University College assistant. How can I help you today?',
        'type-message': 'Type your message...',
        'just-now': 'Just now',
        'listening': 'Listening...',
        'processing': 'Processing...',
        'speaking': 'Speaking...',
        'voice-ready': 'Ready to start conversation'
    },
    ar: {
        'soa-university-college': 'كلية سلطان للفنون',
        'home': 'الرئيسية',
        'departments': 'الأقسام',
        'chat-assistant': 'المساعد الذكي',
        'voice-agent': 'المساعد الصوتي',
        'contact': 'تواصل معنا',
        'english': 'العربية',
        'welcome-title': 'مرحباً بكم في كلية سلطان للفنون',
        'welcome-subtitle': 'مساعدكم الذكي المدعوم بالذكاء الاصطناعي للقبول ومعلومات الكورسات والإرشاد الأكاديمي',
        'start-chatting': 'ابدأ المحادثة',
        'voice-assistant': 'المساعد الصوتي',
        'ai-assistant': 'المساعد الذكي',
        'chat-assistant-title': 'المساعد الذكي',
        'chat-welcome': 'مرحباً! أنا مساعدك في كلية سلطان للفنون. كيف يمكنني مساعدتك اليوم؟',
        'type-message': 'اكتب رسالتك...',
        'just-now': 'الآن',
        'listening': 'أستمع...',
        'processing': 'أعالج...',
        'speaking': 'أتحدث...',
        'voice-ready': 'جاهز لبدء المحادثة'
    }
};

// Global variables
let currentLanguage = 'en';
let currentTheme = 'light';
let socket = null;
let isSocketConnected = false;

// Translation function
function t(key) {
    return translations[currentLanguage][key] || translations.en[key] || key;
}

// Socket.IO Service
class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
    }

    initialize() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔗 Connected to server via Socket.IO');
                this.isConnected = true;
                isSocketConnected = true;
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from server');
                this.isConnected = false;
                isSocketConnected = false;
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection error:', error);
                this.isConnected = false;
                isSocketConnected = false;
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize Socket.IO:', error);
            this.isConnected = false;
            isSocketConnected = false;
        }
    }

    sendMessage(message, language = 'en', sessionId = null) {
        if (this.socket && this.isConnected) {
            const messageData = {
                message,
                language,
                timestamp: new Date().toISOString(),
                isVoiceMessage: false,
                sessionId: sessionId || `chat_${Date.now()}`
            };
            
            console.log('💬 Sending message via Socket.IO:', messageData);
            this.socket.emit('message', messageData);
            return true;
        }
        return false;
    }

    onMessageResponse(handler) {
        if (this.socket) {
            this.socket.on('message-response', handler);
        }
    }

    onError(handler) {
        if (this.socket) {
            this.socket.on('error', handler);
        }
    }

    off(event, handler) {
        if (this.socket) {
            this.socket.off(event, handler);
        }
    }

    getConnectionStatus() {
        return this.isConnected;
    }
}

// Chat Module
class ChatModule {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const sendBtn = document.getElementById('sendBtn');
        const chatInput = document.getElementById('chatInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
    }

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            console.log(`🗣️ Sending message: "${message}"`);
            
            this.addChatMessage(message, 'user');
            input.value = '';
            
            if (socketService.getConnectionStatus()) {
                console.log('💬 Sending message via Socket.IO:', message);
                
                const sent = socketService.sendMessage(message, currentLanguage);
                
                if (sent) {
                    const responseHandler = (response) => {
                        console.log('📨 Received response from server:', response);
                        
                        if (response.response) {
                            this.addChatMessage(response.response, 'bot');
                        }
                        
                        socketService.off('message-response', responseHandler);
                    };
                    
                    socketService.onMessageResponse(responseHandler);
                    
                    const errorHandler = (error) => {
                        console.error('❌ Server error, using fallback response');
                        const fallbackResponse = this.generateChatResponse(message);
                        this.addChatMessage(fallbackResponse, 'bot');
                        socketService.off('error', errorHandler);
                    };
                    
                    socketService.onError(errorHandler);
                }
            } else {
                console.log('🔌 No socket connection, using local response');
                setTimeout(() => {
                    const response = this.generateChatResponse(message);
                    this.addChatMessage(response, 'bot');
                }, 1000);
            }
        }
    }

    addChatMessage(message, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message force-ltr-message`;
        
        messageDiv.style.cssText = `
            direction: ltr !important;
            text-align: left !important;
            justify-content: flex-start !important;
        `;
        
        const avatar = sender === 'bot' ? 'fas fa-robot' : 'fas fa-user';
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const formattedMessage = this.formatMessageContent(message);
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="${avatar}"></i>
            </div>
            <div class="message-content" style="text-align: left !important; direction: ltr !important; unicode-bidi: embed;">
                <div class="message-text" style="text-align: left !important; direction: ltr !important; unicode-bidi: normal !important; word-wrap: break-word; font-family: Arial, sans-serif;">${formattedMessage}</div>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } 

    formatMessageContent(message) {
        let formattedMessage = message.replace(/\n/g, '<br>');
*/
      //  formattedMessage = formattedMessage.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
       // formattedMessage = formattedMessage.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
 /*       if (/[\u0600-\u06FF]/.test(message)) {
            formattedMessage = `<div class="arabic-text">${formattedMessage}</div>`;
        }
        
        return formattedMessage;
    }

    generateChatResponse(message) {
        const responses = currentLanguage === 'ar' ? [
            "سأكون سعيداً لمساعدتك بمعلومات حول كلية سلطان للفنون!",
            "هذا سؤال رائع حول برامجنا الأكاديمية.",
            "دعني أقدم لك أحدث المعلومات حول القبول.",
            "يمكنني مساعدتك في العثور على تفاصيل الرسوم والمتطلبات."
        ] : [
            "I'd be happy to help you with information about SOA University College!",
            "That's a great question about our academic programs.",
            "Let me provide you with the most current information about admissions.",
            "I can help you find details about tuition fees and requirements."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Voice Module (simplified)
class VoiceModule {
    constructor() {
        this.isConversationActive = false;
        this.isProcessingVoice = false;
        this.isSpeaking = false;
        this.conversationTimeout = null;
        this.CONVERSATION_TIMEOUT = 600000; // 10 minutes
    }

    startVoiceConversation() {
        console.log('🚀 Starting voice conversation');
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('⚠️ Voice not supported in this browser');
            alert('Voice recording is not supported in this browser. Please use a modern browser with microphone access.');
            return;
        }
        
        this.isConversationActive = true;
        console.log('✅ Conversation marked as ACTIVE');
        this.updateVoiceButtonState('active');
        this.updateVoiceStatus(t('listening'));
        
        // Start conversation timeout
        this.resetConversationTimeout();
        
        // Simple voice recording test
        this.testVoiceRecording();
    }

    stopVoiceConversation() {
        console.log('🛑 Stopping voice conversation');
        this.isConversationActive = false;
        console.log('❌ Conversation marked as INACTIVE');
        this.clearConversationTimeout();
        this.updateVoiceButtonState('ready');
        this.updateVoiceStatus(t('voice-ready'));
    }

    // Reset conversation timeout
    resetConversationTimeout() {
        this.clearConversationTimeout();
        console.log('⏰ Resetting conversation timeout (10 minutes)');
        this.conversationTimeout = setTimeout(() => {
            console.log('⏰ Conversation timeout - ending conversation');
            console.log('⏰ Timeout triggered - conversation was active for 10 minutes');
            this.stopVoiceConversation();
        }, this.CONVERSATION_TIMEOUT);
    }

    // Clear conversation timeout
    clearConversationTimeout() {
        if (this.conversationTimeout) {
            clearTimeout(this.conversationTimeout);
            this.conversationTimeout = null;
        }
    }

    async testVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Microphone access granted');
            
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                chunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                console.log(`🎵 Audio recorded: ${blob.size} bytes`);
                
                // Send to STT
                this.sendAudioToSTT(blob);
                
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            this.updateVoiceStatus('Recording... Speak now!');
            
            // Stop after 5 seconds
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 5000);
            
        } catch (error) {
            console.error('❌ Voice recording failed:', error);
            this.updateVoiceStatus('Voice recording failed. Please check microphone permissions.');
        }
    }

      async sendAudioToSTT(audioBlob) {
        try {
            console.log('🔄 Using complete voice pipeline: STT → RAG → LLM → TTS');
            this.updateVoiceStatus(t('processing'));
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('language', currentLanguage === 'ar' ? 'ar' : 'en');
            
            // Use the complete voice pipeline (STT + RAG + LLM + TTS)
            console.log('📤 Sending to /api/voice/process (complete pipeline)');
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success && result.pipeline) {
                console.log('✅ Complete voice pipeline successful:', result.pipeline.stt.transcript);
                console.log('🧠 RAG + LLM Response:', result.pipeline.rag?.response);
                console.log('🔊 TTS Audio available:', !!result.pipeline.tts?.audioBuffer);
                
                // Use the intelligent RAG + LLM response instead of just repeating
                const responseText = result.pipeline.rag?.response || 'I understand, but I need more information to help you better.';
                if (result.pipeline.tts?.audioBuffer) {
                   this.playTTSAudio(result.pipeline.tts.audioBuffer, responseText);
                 } else {
                    this.handleVoiceResponse(responseText);
                 }
            } else {
                console.warn('⚠️ No speech detected or pipeline failed');
                this.handleVoiceResponse('I didn\'t hear any speech clearly. Please try again.');
            }
            
        } catch (error) {
            console.error('❌ Voice pipeline error:', error);
            this.handleVoiceResponse('Sorry, I had trouble processing your speech. Please try again.');
        }
    } 

    // Play TTS audio from backend
    async playTTSAudio(base64Audio, responseText) {
        try {
            console.log('🔊 Playing TTS audio from backend...');
            console.log('📊 Audio data length:', base64Audio.length);
            
            // Convert base64 to audio buffer
            const audioData = atob(base64Audio);
            const audioBuffer = new ArrayBuffer(audioData.length);
            const view = new Uint8Array(audioBuffer);
            
            for (let i = 0; i < audioData.length; i++) {
                view[i] = audioData.charCodeAt(i);
            }
            
            console.log('📊 Audio buffer size:', audioBuffer.byteLength, 'bytes');
            
            // Check audio file headers to identify format
            const header = new Uint8Array(audioBuffer.slice(0, 12));
            console.log('🔍 Audio file header:', Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '));
            
            // Detect audio format from header
            let detectedFormat = 'unknown';
            if (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) {
                detectedFormat = 'MP3';
            } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
                detectedFormat = 'WAV';
            } else if (header[0] === 0x4F && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
                detectedFormat = 'OGG';
            }
            console.log('🎵 Detected audio format:', detectedFormat);
            
            // Save audio file for debugging (temporary)
            try {
                const debugBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
                const debugUrl = URL.createObjectURL(debugBlob);
                const debugLink = document.createElement('a');
                debugLink.href = debugUrl;
                debugLink.download = `tts-debug-${Date.now()}.mp3`;
                debugLink.style.display = 'none';
                document.body.appendChild(debugLink);
                debugLink.click();
                document.body.removeChild(debugLink);
                URL.revokeObjectURL(debugUrl);
                console.log('💾 Debug audio file saved for inspection');
            } catch (debugError) {
                console.warn('⚠️ Could not save debug audio file:', debugError);
            }
            
            // Try Web Audio API first
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Resume audio context if suspended (required for iOS)
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                
                const audioBufferData = await audioContext.decodeAudioData(audioBuffer);
                console.log('🎵 Audio decoded successfully:', {
                    duration: audioBufferData.duration,
                    sampleRate: audioBufferData.sampleRate,
                    channels: audioBufferData.numberOfChannels
                });
                
                const audioSource = audioContext.createBufferSource();
                audioSource.buffer = audioBufferData;
                audioSource.connect(audioContext.destination);
                
                this.isSpeaking = true;
                this.updateVoiceStatus('Speaking...');
                this.updateVoiceButtonState('speaking');
                
                audioSource.onended = () => {
                    console.log('✅ TTS audio playback completed');
                    this.isSpeaking = false;
                    if (this.isConversationActive) {
                        console.log('🔄 Restarting listening after TTS audio');
                        this.resetConversationTimeout();
                        this.updateVoiceStatus('Listening...');
                        this.updateVoiceButtonState('listening');
                        setTimeout(() => this.testVoiceRecording(), 1000);
                    }
                };
                
                audioSource.start();
                console.log('🎵 TTS audio started playing via Web Audio API');
                
            } catch (webAudioError) {
                console.warn('⚠️ Web Audio API failed, trying HTML5 Audio:', webAudioError);
                
                // Fallback to HTML5 Audio - use detected format first
                const formatMap = {
                    'MP3': 'audio/mp3',
                    'WAV': 'audio/wav',
                    'OGG': 'audio/ogg'
                };
                
                const primaryFormat = formatMap[detectedFormat] || 'audio/mp3';
                const audioFormats = [primaryFormat, 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
                let audioBlob, audioUrl, audio;
                
                for (const format of audioFormats) {
                    try {
                        audioBlob = new Blob([audioBuffer], { type: format });
                        audioUrl = URL.createObjectURL(audioBlob);
                        audio = new Audio(audioUrl);
                        
                        console.log(`🔍 Trying audio format: ${format} (detected: ${detectedFormat})`, {
                            size: audioBlob.size,
                            type: audioBlob.type
                        });
                        break;
                    } catch (formatError) {
                        console.warn(`⚠️ Format ${format} failed:`, formatError);
                        continue;
                    }
                }
                
                audio.onloadeddata = () => {
                    console.log('🎵 HTML5 Audio loaded, duration:', audio.duration);
                };
                
                audio.onplay = () => {
                    console.log('🎵 HTML5 Audio started playing');
                    this.isSpeaking = true;
                    this.updateVoiceStatus('Speaking...');
                    this.updateVoiceButtonState('speaking');
                };
                
                audio.onerror = (error) => {
                    console.error('❌ HTML5 Audio error:', error);
                    URL.revokeObjectURL(audioUrl);
                    // Final fallback to browser TTS
                    console.log('🔄 Falling back to browser TTS for Arabic response');
                    this.handleVoiceResponse(responseText);
                };
                
                // Add timeout fallback
                const audioTimeout = setTimeout(() => {
                    console.warn('⏰ Audio playback timeout, falling back to browser TTS');
                    audio.pause();
                    URL.revokeObjectURL(audioUrl);
                    this.handleVoiceResponse(responseText);
                }, 10000); // 10 second timeout
                
                audio.onended = () => {
                    clearTimeout(audioTimeout);
                    console.log('✅ HTML5 Audio playback completed');
                    this.isSpeaking = false;
                    URL.revokeObjectURL(audioUrl);
                    if (this.isConversationActive) {
                        console.log('🔄 Restarting listening after TTS audio');
                        this.resetConversationTimeout();
                        this.updateVoiceStatus('Listening...');
                        this.updateVoiceButtonState('listening');
                        setTimeout(() => this.testVoiceRecording(), 1000);
                    }
                };
                
                await audio.play();
            }
            
        } catch (error) {
            console.error('❌ Error playing TTS audio:', error);
            // Fallback to browser TTS
            this.handleVoiceResponse(responseText);
        }
    }

  /*  handleVoiceResponse(responseText) {
        console.log('🤖 Voice response:', responseText);
        this.updateVoiceStatus(responseText);
        
        // Use browser TTS
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(responseText);
            utterance.lang = currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
            utterance.rate = 0.9;
            
            utterance.onend = () => {
                if (this.isConversationActive) {
                    console.log('✅ TTS completed - resetting conversation timeout');
                    this.resetConversationTimeout(); // Reset timeout after AI response
                    this.updateVoiceStatus(t('listening'));
                    setTimeout(() => this.testVoiceRecording(), 1000);
                }
            };
            
            window.speechSynthesis.speak(utterance);
        }
    } 

 updateVoiceButtonState(state) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceBtnIcon = document.getElementById('voiceBtnIcon');
        
        if (!voiceBtn || !voiceBtnIcon) return;
        
        voiceBtn.classList.remove('ready', 'active', 'listening', 'speaking', 'processing');
        
        switch(state) {
            case 'ready':
                voiceBtn.classList.add('ready');
                voiceBtnIcon.className = 'fas fa-play';
                voiceBtn.onclick = () => this.startVoiceConversation();
                break;
            case 'active':
                voiceBtn.classList.add('active');
                voiceBtnIcon.className = 'fas fa-stop';
                voiceBtn.onclick = () => this.stopVoiceConversation();
                break;
            case 'listening':
                voiceBtn.classList.add('listening');
                voiceBtnIcon.className = 'fas fa-microphone';
                break;
            case 'processing':
                voiceBtn.classList.add('processing');
                voiceBtnIcon.className = 'fas fa-cog fa-spin';
                break;
        }
    }

    updateVoiceStatus(status) {
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }
} 



class App {
    constructor() {
        this.socketService = new SocketService();
        this.chatModule = new ChatModule();
        this.voiceModule = new VoiceModule();
        this.initialize();
    }

    initialize() {
        console.log('🚀 Initializing SOA University College App...');
        
        // Load saved preferences
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage) {
            currentLanguage = savedLanguage;
        }
        
        // Initialize Socket.IO
        this.socketService.initialize();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.initializeUI();
        
        console.log('✅ App initialization complete');
    }

    setupEventListeners() {
        // Language toggle
        const languageBtn = document.getElementById('languageBtn');
        if (languageBtn) {
            languageBtn.addEventListener('click', () => this.toggleLanguage());
        }
        
        // Theme toggle
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        // Mobile menu
        const hamburger = document.getElementById('hamburger');
        if (hamburger) {
            hamburger.addEventListener('click', () => this.toggleMobileMenu());
        }
    }

    initializeUI() {
        this.updateUILanguage();
        this.updateVoiceButtonState('ready');
    }

    toggleLanguage() {
        currentLanguage = currentLanguage === 'en' ? 'ar' : 'en';
        document.documentElement.lang = currentLanguage;
        this.updateUILanguage();
        localStorage.setItem('preferredLanguage', currentLanguage);
    }

    toggleTheme() {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        const themeBtn = document.getElementById('themeBtn');
        const themeIcon = themeBtn?.querySelector('i');
        
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (themeIcon) themeIcon.className = 'fas fa-sun';
        } else {
            document.body.classList.remove('dark-theme');
            if (themeIcon) themeIcon.className = 'fas fa-moon';
        }
        
        localStorage.setItem('preferredTheme', currentTheme);
    }

    toggleMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.classList.toggle('active');
        }
    }

    updateUILanguage() {
        const elementsWithTranslate = document.querySelectorAll('[data-translate]');
        
        elementsWithTranslate.forEach((element) => {
            const key = element.getAttribute('data-translate');
            const translation = t(key);
            element.textContent = translation;
        });
        
        const elementsWithPlaceholder = document.querySelectorAll('[data-translate-placeholder]');
        elementsWithPlaceholder.forEach((element) => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = t(key);
            element.placeholder = translation;
        });
    }

    updateVoiceButtonState(state) {
        this.voiceModule.updateVoiceButtonState(state);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('✅ App loaded and ready!');
});

// Make socketService globally available
let socketService;
document.addEventListener('DOMContentLoaded', () => {
    socketService = window.app.socketService;
});

// Global functions for HTML onclick handlers
function openChatbot() {
    console.log('🔓 Opening chatbot modal');
    const chatbotModal = document.getElementById('chatbotModal');
    if (chatbotModal) {
        chatbotModal.classList.add('show');
        // Focus on input
        setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.focus();
            }
        }, 100);
    }
}

function closeChatbot() {
    console.log('🔒 Closing chatbot modal');
    const chatbotModal = document.getElementById('chatbotModal');
    if (chatbotModal) {
        chatbotModal.classList.remove('show');
    }
}
function openVoiceAgent() {
    console.log('🔓 Opening voice agent modal');
    const voiceModal = document.getElementById('voiceModal');
    if (voiceModal) {
        voiceModal.classList.add('show');
    }
}

function closeVoiceAgent() {
    console.log('🔒 Closing voice agent modal');
    const voiceModal = document.getElementById('voiceModal');
    if (voiceModal) {
        voiceModal.classList.remove('show');
        
        // Stop voice service and cleanup
        if (livekitService) {
            console.log('🛑 Stopping voice service on modal close');
            // Call the voice service's modal close handler
            if (typeof livekitService.handleModalClose === 'function') {
                livekitService.handleModalClose();
            } else {
                // Fallback to other cleanup methods
                if (typeof livekitService.stopAllVoiceActivities === 'function') {
                    livekitService.stopAllVoiceActivities();
                }
                if (typeof livekitService.forceStopAll === 'function') {
                    livekitService.forceStopAll();
                }
                // Reset the service state
                livekitService.isConnected = false;
                livekitService.isRecording = false;
                livekitService.isSpeaking = false;
                livekitService.currentUtterance = null;
            }
        }
        
        // Aggressive cleanup
        cleanupVoiceServices();
    }
} 

// Additional voice functions for the modal buttons
function toggleVoiceRecognition() {
    if (window.app && window.app.voiceModule) {
        if (window.app.voiceModule.isConversationActive) {
            window.app.voiceModule.stopVoiceConversation();
        } else {
            window.app.voiceModule.startVoiceConversation();
        }
    }
}

// Global LiveKit service instance
let livekitService = null;

// Auto-initialize voice service when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the voice service immediately (using fallback with Google Cloud)
    if (!livekitService) {
        livekitService = new FallbackVoiceService();
        console.log('🎙️ Voice service auto-initialized with Google Cloud');
    }
});

function toggleStreamingVoice() {
    console.log('🔄 Voice assistant toggle clicked');

    if (!livekitService) {
        // Initialize voice service with Google Cloud
        livekitService = new FallbackVoiceService();
        console.log('🎙️ Voice service initialized with Google Cloud');
    }

    if (!livekitService.isConnected) {
        // Start voice conversation
        startStreamingVoice();
    } else {
        // Stop voice conversation
        stopStreamingVoice();
    }
}

async function startStreamingVoice() {
    try {
        console.log('🚀 Starting voice conversation');
        console.log('🔍 LiveKit service:', livekitService);
        
        // Update UI
        updateStreamingVoiceButton('connecting');
        
        // Set language based on current language setting
        const currentLang = document.documentElement.lang || 'en';
        console.log('🌐 Language set to:', currentLang);
        
        // Initialize voice service with Google Cloud
        const result = await livekitService.startConversation(currentLang);
        console.log('📋 Start conversation result:', result);
        
        if (result.success) {
            console.log('✅ Voice conversation started');
            updateStreamingVoiceButton('active');
            
            // Show connection status
            const connectionStatus = document.getElementById('connectionStatus');
            if (connectionStatus) {
                connectionStatus.style.display = 'block';
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = 'Voice assistant ready';
                }
            }
            
        } else {
            console.error('❌ Failed to start voice conversation:', result.error);
            updateStreamingVoiceButton('ready');
            alert('Failed to start voice conversation: ' + result.error);
        }
        
    } catch (error) {
        console.error('❌ Error starting voice conversation:', error);
        updateStreamingVoiceButton('ready');
        alert('Error starting voice conversation: ' + error.message);
    }
}

async function stopStreamingVoice() {
    try {
        console.log('🛑 Stopping voice conversation');
        
        if (livekitService) {
            await livekitService.stopConversation();
        }
        
        updateStreamingVoiceButton('ready');
        console.log('✅ Voice conversation stopped');
        
        // Hide connection status
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus) {
            connectionStatus.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Error stopping voice conversation:', error);
    }
}

function updateStreamingVoiceButton(state) {
    const streamVoiceBtn = document.getElementById('streamVoiceBtn');
    const streamVoiceBtnIcon = document.getElementById('streamVoiceBtnIcon');
    const voiceBtnText = document.getElementById('voiceBtnText');
    
    if (!streamVoiceBtn || !streamVoiceBtnIcon || !voiceBtnText) return;
    
    // Remove all state classes
    streamVoiceBtn.classList.remove('connecting', 'active', 'listening', 'speaking');
    
    switch(state) {
        case 'ready':
            streamVoiceBtnIcon.className = 'fas fa-microphone';
            voiceBtnText.textContent = 'Start Voice Assistant';
            streamVoiceBtn.onclick = () => toggleStreamingVoice();
            break;
        case 'connecting':
            streamVoiceBtn.classList.add('connecting');
            streamVoiceBtnIcon.className = 'fas fa-spinner fa-spin';
            voiceBtnText.textContent = 'Connecting...';
            break;
        case 'active':
            streamVoiceBtn.classList.add('active');
            streamVoiceBtnIcon.className = 'fas fa-microphone';
            voiceBtnText.textContent = 'Voice Active - Click to Stop';
            streamVoiceBtn.onclick = () => stopStreamingVoice();
            break;
        case 'listening':
            streamVoiceBtn.classList.add('listening');
            streamVoiceBtnIcon.className = 'fas fa-microphone';
            voiceBtnText.textContent = 'Listening...';
            break;
        case 'speaking':
            streamVoiceBtn.classList.add('speaking');
            streamVoiceBtnIcon.className = 'fas fa-volume-up';
            voiceBtnText.textContent = 'AI Speaking...';
            break;
    }
}

// Voice recording functionality
async function toggleVoiceRecording() {
    try {
        console.log('🎤 Toggle voice recording clicked');
        console.log('🔍 Voice service state:', {
            exists: !!livekitService,
            connected: livekitService?.isConnected,
            recording: livekitService?.isRecording,
            speaking: livekitService?.isSpeaking
        });
        
        if (!livekitService) {
            // Initialize voice service with Google Cloud
            livekitService = new FallbackVoiceService();
        }
        
        if (!livekitService.isConnected) {
            console.log('🔄 Auto-connecting voice service...');
            
            // Show connecting status
            const voiceStatus = document.getElementById('voiceStatus');
            if (voiceStatus) {
                voiceStatus.textContent = 'Connecting voice service...';
            }
            
            // Auto-start the voice conversation with Google Cloud
            const currentLang = document.documentElement.lang || 'en';
            await livekitService.startConversation(currentLang);
            updateStreamingVoiceButton('active');
            
            // Update status
            if (voiceStatus) {
                voiceStatus.textContent = 'Voice service connected. Ready to start conversation.';
            }
        }
        
        // If currently speaking, handle interruption
        if (livekitService.isSpeaking) {
            console.log('🔄 Interrupting current speech...');
            await livekitService.handleInterruption();
            return;
        }
        
        if (livekitService.isRecording) {
            console.log('🛑 Stopping recording...');
            // Stop recording
            await livekitService.stopRecording();
        } else {
            console.log('🎙️ Starting recording...');
            // Start recording
            await livekitService.startRecording();
        }
        
    } catch (error) {
        console.error('❌ Error toggling voice recording:', error);
        alert('Error with voice recording: ' + error.message);
    }
}

// Add click-outside handler for voice modal
document.addEventListener('DOMContentLoaded', function() {
    const voiceModal = document.getElementById('voiceModal');
    if (voiceModal) {
        voiceModal.addEventListener('click', function(event) {
            // If clicking on the modal backdrop (not the modal content)
            if (event.target === voiceModal) {
                console.log('🖱️ Clicked outside voice modal - closing');
                closeVoiceAgent();
            }
        });
    }
    
    // Add Escape key handler to close voice modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const voiceModal = document.getElementById('voiceModal');
            if (voiceModal && voiceModal.classList.contains('show')) {
                console.log('⌨️ Escape key pressed - closing voice modal');
                closeVoiceAgent();
            }
        }
    });
});

// Add multiple cleanup handlers for page unload
function cleanupVoiceServices() {
    console.log('🔄 Cleaning up ALL voice services and activities');
    
    // Stop all microphone activities
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('🎤 Stopping all microphone streams');
        // Force stop all media tracks
        if (window.currentMediaStream) {
            window.currentMediaStream.getTracks().forEach(track => {
                track.stop();
                console.log('🛑 Media track stopped:', track.kind);
            });
            window.currentMediaStream = null;
        }
    }
    
    // Use the force stop method if available
    if (livekitService && typeof livekitService.forceStopAll === 'function') {
        console.log('🛑 Using force stop all method');
        livekitService.forceStopAll();
    } else if (livekitService && typeof livekitService.stopAllVoiceActivities === 'function') {
        console.log('🛑 Using fallback voice service cleanup');
        livekitService.stopAllVoiceActivities();
    } else if (livekitService && livekitService.isConnected) {
        console.log('🛑 Stopping voice conversation');
        livekitService.stopConversation();
    }
    
    // Stop ALL speech synthesis activities
    if (window.speechSynthesis) {
        console.log('🔇 Stopping ALL speech synthesis');
        window.speechSynthesis.cancel();
        window.speechSynthesis.pause();
        
        // Clear any ongoing utterances
        if (window.currentVoiceUtterance) {
            window.currentVoiceUtterance = null;
        }
        
        // Force stop any pending speech
        try {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
            window.speechSynthesis.cancel();
        } catch (e) {
            console.log('⚠️ Error force-stopping speech synthesis:', e);
        }
    }
    
    // Stop ALL audio playback
    if (window.currentAudio) {
        console.log('🔇 Stopping audio playback');
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
        window.currentAudio = null;
    }
    
    // Stop ALL audio elements on the page
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach(audio => {
        if (!audio.paused) {
            console.log('🔇 Stopping audio element');
            audio.pause();
            audio.currentTime = 0;
        }
    });
    
    // Force stop all audio contexts
    if (window.AudioContext || window.webkitAudioContext) {
        console.log('🔇 Stopping audio contexts');
        // Close any active audio contexts
        if (window.audioContext) {
            window.audioContext.close();
            window.audioContext = null;
        }
    }
    
    // Clear ALL timeouts and intervals
    if (window.recordingTimeout) {
        clearTimeout(window.recordingTimeout);
        window.recordingTimeout = null;
    }
    
    if (window.voiceTimeout) {
        clearTimeout(window.voiceTimeout);
        window.voiceTimeout = null;
    }
    
    if (window.speechTimeout) {
        clearTimeout(window.speechTimeout);
        window.speechTimeout = null;
    }
    
    // Reset ALL global voice states
    window.isVoiceActive = false;
    window.isRecording = false;
    window.isSpeaking = false;
    window.isProcessing = false;
    
    // Reset service states
    if (livekitService) {
        livekitService.isConnected = false;
        livekitService.isRecording = false;
        livekitService.isSpeaking = false;
        livekitService.isProcessing = false;
        livekitService.currentAudio = null;
        livekitService.currentUtterance = null;
    }
    
    console.log('✅ ALL voice activities stopped and cleaned up');
}

// Multiple event listeners for cleanup
window.addEventListener('beforeunload', cleanupVoiceServices);
window.addEventListener('unload', cleanupVoiceServices);
window.addEventListener('pagehide', cleanupVoiceServices);

// Also add visibility change handler (when tab becomes hidden)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('👁️ Page hidden - cleaning up voice services');
        // Stop voice service when tab becomes hidden
        if (livekitService) {
            if (typeof livekitService.stopAllVoiceActivities === 'function') {
                livekitService.stopAllVoiceActivities();
            }
        }
        cleanupVoiceServices();
    }
});

// Additional cleanup for window close events
window.addEventListener('close', cleanupVoiceServices);
document.addEventListener('DOMContentLoaded', function() {
    // Add cleanup to any close buttons
    const closeButtons = document.querySelectorAll('.close, .btn-close, [data-dismiss="modal"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('🚪 Close button clicked - cleaning up voice services');
            cleanupVoiceServices();
        });
    });
    
    // Add cleanup to navigation events
    const navLinks = document.querySelectorAll('a[href]');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            console.log('🧭 Navigation link clicked - cleaning up voice services');
            cleanupVoiceServices();
        });
    });
});

// Global emergency cleanup function (can be called from console)
window.emergencyStopVoice = function() {
    console.log('🚨 EMERGENCY VOICE STOP - Called from console');
    cleanupVoiceServices();
    
    // Additional emergency cleanup
    if (window.speechSynthesis) {
        console.log('🚨 Emergency speech synthesis cleanup');
        window.speechSynthesis.cancel();
        window.speechSynthesis.pause();
        
        // Clear global utterance reference
        if (window.currentVoiceUtterance) {
            window.currentVoiceUtterance = null;
        }
        
        // Try multiple aggressive methods
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
        }, 100);
        
        setTimeout(() => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }, 200);
    }
    
    console.log('🚨 Emergency voice stop completed');
};

// Global function to stop all voice activities (can be called from anywhere)
window.stopAllVoice = function() {
    console.log('🛑 STOP ALL VOICE - Called globally');
    cleanupVoiceServices();
    
    if (livekitService && typeof livekitService.forceStopAll === 'function') {
        livekitService.forceStopAll();
    }
    
    console.log('🛑 ALL VOICE ACTIVITIES STOPPED');
}; */