// Voice Module
import { socketService } from './socket-service.js';
import { t } from './translations.js';
import { iosCompatibility } from './ios-compatibility.js';

export class VoiceModule {
    constructor() {
        this.currentLanguage = 'en';
        console.log(`🌐 VoiceModule initialized with language: ${this.currentLanguage}`);
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
        
        // Audio playback tracking
        this.currentAudioSource = null;
        this.currentAudioContext = null;
        this.currentAudio = null;
        
        // Constants
        this.CONVERSATION_TIMEOUT = 150000; // 10 minutes
        this.RESPONSE_DELAY = 100;
        this.MAX_RECORDING_TIME = 7000; // 7 seconds (fallback)
        this.SILENCE_DURATION = 1500; // 1.5 seconds of silence to stop recording
        
        // Voice Activity Detection (VAD) constants
        this.SPEECH_THRESHOLD = 0.1; // Audio level threshold for speech detection
        this.SILENCE_THRESHOLD = 0.05; // Audio level threshold for silence
        this.MIN_SPEECH_DURATION = 500; // Minimum speech duration (ms)
        this.VAD_CHECK_INTERVAL = 100; // Check audio levels every 100ms
        
        // VAD state variables
        this.isSpeechDetected = false;
        this.speechStartTime = null;
        this.silenceStartTime = null;
        this.vadInterval = null;
        this.currentAudioLevel = 0;
        
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
        
        // Handle visibility change to hidden (only stop if conversation is not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.isConversationActive) {
                console.log('👁️ Page hidden and conversation not active - performing audio cleanup');
                this.performCompleteAudioCleanup();
            } else if (document.hidden && this.isConversationActive) {
                console.log('👁️ Page hidden but conversation active - keeping conversation running');
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
        
        // Stop Web Audio API sources
        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
                this.currentAudioSource.disconnect();
                this.currentAudioSource = null;
                console.log('🔇 Emergency: Web Audio source stopped');
            } catch (e) {
                console.log('⚠️ Emergency: Web Audio source cleanup failed');
            }
        }
        
        // Close audio contexts
        if (this.currentAudioContext) {
            try {
                this.currentAudioContext.close();
                this.currentAudioContext = null;
                console.log('🔇 Emergency: Audio context closed');
            } catch (e) {
                console.log('⚠️ Emergency: Audio context cleanup failed');
            }
        }
        
        if (window.audioContext) {
            try {
                window.audioContext.close();
                window.audioContext = null;
                console.log('🔇 Emergency: Global audio context closed');
            } catch (e) {
                console.log('⚠️ Emergency: Global audio context cleanup failed');
            }
        }
        
        // Clear global references
        if (window.currentVoiceUtterance) {
            window.currentVoiceUtterance = null;
        }
        
        console.log('🚨 Emergency audio cleanup completed');
    }

    // Start voice conversation
    startVoiceConversation() {
        console.log('🚀 Starting voice conversation');
        
        // Check security context first (fast)
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
        
        // Update UI to show speaking state immediately
        this.updateVoiceButtonState('active');
        this.updateVoiceStatus(t('speaking', this.currentLanguage));
        this.updateVoiceAvatar('speaking');
        this.showVoiceWaves(false);
        
        // Test backend connectivity in background (non-blocking)
        this.testBackendConnectivity();
        
        // Start the conversation with greeting immediately
        this.playInitialGreeting(() => {
            if (this.isConversationActive) {
                // Only show listening state after greeting is complete
                const listeningText = t('listening', this.currentLanguage);
                console.log(`🔍 Translation result for 'listening': "${listeningText}" (language: ${this.currentLanguage})`);
                this.updateVoiceStatus(listeningText);
                this.updateVoiceAvatar('listening');
                this.showVoiceWaves(true);
                this.startListening();
                this.resetConversationTimeout();
            }
        });
    }

    // Stop voice conversation
    stopVoiceConversation(force = false) {
        console.log('🛑 Stopping voice conversation', force ? '(forced)' : '');
        console.log('🔍 Current state before stop:', {
            isConversationActive: this.isConversationActive,
            isProcessingVoice: this.isProcessingVoice,
            isSpeaking: this.isSpeaking,
            isRecording: this.isRecording
        });
        
        // If not forced and conversation is active, ask for confirmation
        if (!force && this.isConversationActive) {
            console.log('⚠️ Conversation is active - stopping gracefully');
        }
        
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
        
        // Stop Web Audio API sources
        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
                this.currentAudioSource.disconnect();
                this.currentAudioSource = null;
                console.log('✅ Web Audio source stopped');
            } catch (e) {
                console.log('⚠️ Web Audio source already stopped');
            }
        }
        
        // Close audio context
        if (this.currentAudioContext) {
            try {
                this.currentAudioContext.close();
                this.currentAudioContext = null;
                console.log('✅ Audio context closed');
            } catch (e) {
                console.log('⚠️ Audio context already closed');
            }
        }
        
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

    // Start listening with Voice Activity Detection
    startListening() {
        console.log('🎤 startListening() called - checking conditions:', {
            isConversationActive: this.isConversationActive,
            isRecording: this.isRecording,
            isProcessingVoice: this.isProcessingVoice,
            isSpeaking: this.isSpeaking
        });
        
        if (this.isConversationActive && !this.isRecording && !this.isProcessingVoice && !this.isSpeaking) {
            console.log('✅ All conditions met - starting Voice Activity Detection...');
            console.log('🔍 Current audio stream status:', {
                hasAudioStream: !!this.audioStream,
                audioStreamActive: this.audioStream ? this.audioStream.active : false,
                audioTracks: this.audioStream ? this.audioStream.getAudioTracks().length : 0
            });
            
            // Update UI for listening state
            this.updateVoiceAvatar('listening');
            this.showVoiceWaves(true);
            this.updateVoiceStatus(t('listening', this.currentLanguage));
            
            // Start Voice Activity Detection (this will start recording when speech is detected)
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
            
            // Use iOS-compatible audio constraints with higher quality
            const constraints = iosCompatibility.isIOS ? 
                iosCompatibility.getAudioConstraints() : 
                { 
                audio: {
                    sampleRate: 48000, // Higher sample rate for better quality
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true, // Enable noise suppression
                    autoGainControl: true,
                    latency: 0.01 // Low latency
                } 
                };
            
            this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            console.log('✅ Microphone access granted successfully');
            console.log('🔍 Audio stream tracks:', this.audioStream.getAudioTracks().length);
            console.log('🔍 Audio track settings:', this.audioStream.getAudioTracks()[0]?.getSettings());
            
            // Check microphone permissions
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            console.log('🔍 Microphone permission status:', permissionStatus.state);
            
            // Test if microphone is actually working
            const audioTrack = this.audioStream.getAudioTracks()[0];
            if (audioTrack) {
                console.log('🔍 Audio track state:', audioTrack.readyState);
                console.log('🔍 Audio track enabled:', audioTrack.enabled);
                console.log('🔍 Audio track muted:', audioTrack.muted);
            }
            
            // Set up audio level monitoring
            this.setupAudioLevelMonitoring(this.audioStream);
            
            // Create MediaRecorder with Google Cloud-compatible formats
            const options = { 
                audioBitsPerSecond: 128000, // Higher bitrate for better quality
                sampleRate: 48000, // Higher sample rate
                channelCount: 1 // Mono audio
            };
            
            // Try formats in order of Google Cloud compatibility (prefer WAV)
            const supportedFormats = [
                'audio/wav;codecs=1', // WAV with PCM codec
                'audio/wav',
                'audio/mp4;codecs=mp4a.40.2', // MP4 with AAC codec
                'audio/mp4',
                'audio/webm;codecs=opus', // WebM with Opus codec
                'audio/webm',
                'audio/ogg;codecs=opus', // OGG with Opus codec
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
            
            console.log('🔴 Recording started with Voice Activity Detection');
            
            // Set maximum recording time as fallback (in case VAD fails)
            this.recordingTimeout = setTimeout(() => {
                if (this.isRecording) {
                    console.log('⏰ Maximum recording time reached (fallback)');
                    this.stopAudioRecording();
                }
            }, this.MAX_RECORDING_TIME);
            
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
            
            const processingText = t('processing', this.currentLanguage);
            console.log(`🔍 Translation result for 'processing': "${processingText}" (language: ${this.currentLanguage})`);
            this.updateVoiceStatus(processingText);
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
            
            console.log('🔄 Creating audio blob for Google Cloud...');
            
            let mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
            if (mimeType.includes('opus')) {
                mimeType = 'audio/ogg; codecs=opus';
            }
            
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });
            console.log(`🎵 Audio blob created: ${audioBlob.size} bytes, type: ${mimeType}`);
            console.log(`🔍 Audio chunks collected: ${this.audioChunks.length} chunks`);
            console.log(`🔍 Total audio duration: ~${Math.round(audioBlob.size / 16000)} seconds (estimated)`);
            
            // Validate audio blob size
            if (audioBlob.size < 1000) {
                console.warn('⚠️ Audio blob is very small, might not contain speech');
            }
            
            // Check if we have any audio data
            if (this.audioChunks.length === 0) {
                console.error('❌ No audio chunks collected - microphone may not be working');
                if (this.isConversationActive) {
                    setTimeout(() => this.startListening(), 1000);
                }
                return;
            }
            
            // Log audio quality info
            console.log(`🔍 Audio quality check: ${audioBlob.size} bytes, ${this.audioChunks.length} chunks, format: ${mimeType}`);
            
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
            
            // Store references for interruption
            this.currentAudioSource = audioSource;
            this.currentAudioContext = audioContext;
            
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
                this.isProcessingVoice = false; // Reset processing state
                
                // Clear audio source references
                this.currentAudioSource = null;
                this.currentAudioContext = null;
                
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
            
            // Store references for interruption
            this.currentAudioSource = audioSource;
            this.currentAudioContext = audioContext;
            
            audioSource.buffer = audioBufferData;
            audioSource.connect(audioContext.destination);
            
            audioSource.onended = () => {
                console.log('✅ Google Cloud TTS playback completed');
                this.isSpeaking = false;
                this.isProcessingVoice = false; // Reset processing state
                
                // Clear audio source references
                this.currentAudioSource = null;
                this.currentAudioContext = null;
                
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
        console.log('🎯 Playing initial greeting...');
        
        // Use fallback greeting immediately for instant response
        const fallbackGreeting = this.currentLanguage === 'ar' 
            ? 'مرحباً، هذا مكتب الإدارة في كلية سلطان للفنون. كيف يمكنني مساعدتك؟'
            : 'Hi, this is the administration desk of SOA college. How can I help you?';
        
        // Start speaking immediately with fallback
        this.speakTextContinuous(fallbackGreeting, callback);
        
        // Try to get enhanced greeting from backend in background (non-blocking)
        try {
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
                if (data.success && data.greeting !== fallbackGreeting) {
                    console.log('✅ Enhanced initial greeting received:', data.greeting);
                    // Note: We could interrupt and play the enhanced greeting, but for now we'll use fallback for instant response
                }
            }
        } catch (error) {
            console.log('ℹ️ Using fallback greeting (backend greeting unavailable)');
        }
    }

    // Voice Activity Detection (VAD) - Enhanced audio monitoring
    setupAudioLevelMonitoring(stream) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            this.microphone.connect(this.analyser);
            
            // Start VAD monitoring
            this.startVoiceActivityDetection(dataArray, bufferLength);
            
            console.log('✅ Voice Activity Detection started');
            
        } catch (error) {
            console.warn('⚠️ Voice Activity Detection failed:', error);
        }
    }

    // Start Voice Activity Detection
    startVoiceActivityDetection(dataArray, bufferLength) {
        // Clear any existing VAD interval
        if (this.vadInterval) {
            clearInterval(this.vadInterval);
        }
        
        // Reset VAD state
        this.isSpeechDetected = false;
        this.speechStartTime = null;
        this.silenceStartTime = null;
        
        // Start VAD monitoring
        this.vadInterval = setInterval(() => {
            if (this.analyser && this.isRecording) {
                this.analyser.getByteFrequencyData(dataArray);
                
                // Calculate audio level
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                this.currentAudioLevel = average / 255; // Normalize to 0-1
                
                // Detect speech activity
                this.detectSpeechActivity();
            }
        }, this.VAD_CHECK_INTERVAL);
    }

    // Detect speech activity and manage recording
    detectSpeechActivity() {
        const now = Date.now();
        const audioLevel = this.currentAudioLevel;
        
        // Log audio level occasionally
        if (Math.random() < 0.1) { // 10% chance to log
            console.log(`🎤 VAD: Audio level ${audioLevel.toFixed(3)} (threshold: ${this.SPEECH_THRESHOLD})`);
        }
        
        if (audioLevel > this.SPEECH_THRESHOLD) {
            // Speech detected
            if (!this.isSpeechDetected) {
                console.log('🗣️ Speech detected - starting recording');
                this.isSpeechDetected = true;
                this.speechStartTime = now;
                this.silenceStartTime = null;
                
                // Start recording if not already recording
                if (!this.isRecording) {
                    this.startAudioRecording();
                }
            }
        } else {
            // Silence detected
            if (this.isSpeechDetected) {
                if (!this.silenceStartTime) {
                    this.silenceStartTime = now;
                    console.log('🔇 Silence detected - starting silence timer');
                } else {
                    const silenceDuration = now - this.silenceStartTime;
                    
                    // Check if silence duration exceeds threshold
                    if (silenceDuration >= this.SILENCE_DURATION) {
                        const speechDuration = this.speechStartTime ? now - this.speechStartTime : 0;
                        
                        // Only stop if we had meaningful speech
                        if (speechDuration >= this.MIN_SPEECH_DURATION) {
                            console.log(`✅ Speech ended - stopping recording (speech: ${speechDuration}ms, silence: ${silenceDuration}ms)`);
                            this.stopAudioRecording();
                            this.isSpeechDetected = false;
                            this.speechStartTime = null;
                            this.silenceStartTime = null;
                        } else {
                            console.log(`⚠️ Speech too short (${speechDuration}ms) - continuing to listen`);
                            this.silenceStartTime = null; // Reset silence timer
                        }
                    }
                }
            }
        }
    }

    // Stop Voice Activity Detection
    stopVoiceActivityDetection() {
        if (this.vadInterval) {
            clearInterval(this.vadInterval);
            this.vadInterval = null;
        }
        
        // Reset VAD state
        this.isSpeechDetected = false;
        this.speechStartTime = null;
        this.silenceStartTime = null;
        this.currentAudioLevel = 0;
        
        console.log('🔇 Voice Activity Detection stopped');
    }

    stopAudioLevelMonitoring() {
        // Stop Voice Activity Detection
        this.stopVoiceActivityDetection();
        
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
    updateVoiceButtonState(state) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceBtnIcon = document.getElementById('voiceBtnIcon');
        const voiceBtnText = document.getElementById('voiceBtnText');
        
        if (!voiceBtn || !voiceBtnIcon || !voiceBtnText) return;
        
        // Remove all state classes
        voiceBtn.classList.remove('ready', 'active', 'listening', 'speaking', 'processing');
        
        switch(state) {
            case 'ready':
                voiceBtn.classList.add('ready');
                voiceBtnIcon.className = 'fas fa-play';
                voiceBtnText.textContent = 'Start Voice Assistant';
                voiceBtn.onclick = () => this.startVoiceConversation();
                break;
          /*  case 'active':
                voiceBtn.classList.add('active');
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtnText.textContent = 'Stop Voice Assistant';
                voiceBtn.onclick = () => this.stopVoiceConversation(); // Allow stopping conversation
                break; */
            case 'listening':
                voiceBtn.classList.add('listening');
                voiceBtnIcon.className = 'fas fa-microphone';
                voiceBtnText.textContent = 'Listening...';
                voiceBtn.onclick = () => this.startListening();
                break;
            case 'speaking':
                voiceBtn.classList.add('speaking');
                voiceBtnIcon.className = 'fas fa-volume-up';
                voiceBtnText.textContent = 'Click to Interrupt';
                voiceBtn.onclick = () => this.interruptSpeaking(); // Allow interruption
                break;
            case 'processing':
                voiceBtn.classList.add('processing');
                voiceBtnIcon.className = 'fas fa-cog fa-spin';
                voiceBtnText.textContent = 'Thinking...';
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
        console.log(`🔄 Updating voice status to: "${status}"`);
        const statusElement = document.getElementById('voiceStatus');
        if (statusElement) {
            const oldStatus = statusElement.textContent;
            statusElement.textContent = status;
            console.log(`✅ Voice status updated successfully: "${oldStatus}" → "${status}"`);
            console.log(`🔍 Status element details:`, {
                id: statusElement.id,
                textContent: statusElement.textContent,
                innerHTML: statusElement.innerHTML,
                visible: statusElement.offsetParent !== null,
                display: window.getComputedStyle(statusElement).display
            });
            
            // Verify the update actually worked
            setTimeout(() => {
                const currentStatus = statusElement.textContent;
                if (currentStatus !== status) {
                    console.warn(`⚠️ Status was overridden: expected "${status}", got "${currentStatus}"`);
                    console.warn(`🔍 Current element state:`, {
                        textContent: statusElement.textContent,
                        innerHTML: statusElement.innerHTML
                    });
                }
            }, 100);
        } else {
            console.error(`❌ Voice status element not found!`);
        }
    }

    // Interrupt speaking
    interruptSpeaking() {
        console.log('🖐️ User interrupted speaking');
        
        // Stop all speech synthesis
        this.stopAllSpeechSynthesis();
        
        // Stop all audio playback
        this.stopAllAudioPlayback();
        
        // Reset all speaking states
        this.isSpeaking = false;
        this.isProcessingVoice = false;
        this.wasInterrupted = true;
        
        // Clear audio source references
        this.currentAudioSource = null;
        this.currentAudioContext = null;
        
        if (this.isConversationActive) {
            this.updateVoiceStatus(this.currentLanguage === 'ar' ? 'تم المقاطعة - أستمع الآن' : 'Interrupted - listening now');
            this.updateVoiceButtonState('listening');
            this.updateVoiceAvatar('listening');
            this.showVoiceWaves(true);
            
            // Automatically start listening after interrupt
            setTimeout(() => {
                console.log('🔄 Checking conditions for auto-start after interrupt:', {
                    isConversationActive: this.isConversationActive,
                    isSpeaking: this.isSpeaking,
                    isProcessingVoice: this.isProcessingVoice,
                    isRecording: this.isRecording,
                    audioStream: !!this.audioStream
                });
                
                if (this.isConversationActive && !this.isSpeaking && !this.isProcessingVoice) {
                    console.log('🔄 Auto-starting listening after interrupt');
                    this.startListening();
                } else {
                    console.log('❌ Cannot auto-start listening - conditions not met');
                }
            }, 500); // Small delay to ensure audio cleanup is complete
        }
        
        console.log('✅ Interrupt completed - audio stopped and state reset');
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
