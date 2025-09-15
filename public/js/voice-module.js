// Voice Module
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
        this.CONVERSATION_TIMEOUT = 180000; // 3 minutes
        this.RESPONSE_DELAY = 500;
        this.MAX_RECORDING_TIME = 30000; // 30 seconds
        this.SILENCE_DURATION = 5000; // 5 seconds
        
        this.setupEventListeners();
    }

    // Set current language
    setLanguage(language) {
        this.currentLanguage = language;
    }

    // Setup event listeners
    setupEventListeners() {
        // Voice button - using dynamic onclick instead of event listener to avoid conflicts
        // This will be set up in the main app initialization
    }

    // Start voice conversation
    startVoiceConversation() {
        console.log('🚀 Starting human-like voice conversation');
        
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
        this.isProcessingVoice = false;
        this.isSpeaking = false;
        this.isRecording = false;
        
        // Stop speech synthesis
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {
                console.log('Synthesis already stopped');
            }
        }
        
        // Stop any ongoing audio
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio = null;
            } catch (e) {
                console.log('Audio already stopped');
            }
        }
        
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

    // Start listening
    startListening() {
        if (this.isConversationActive && !this.isRecording && !this.isProcessingVoice && !this.isSpeaking) {
            console.log('🎤 Starting to listen...');
            
            // Update UI for listening state
            this.updateVoiceAvatar('listening');
            this.showVoiceWaves(true);
            this.updateVoiceStatus(t('listening', this.currentLanguage));
            
            // Start audio recording
            this.startAudioRecording();
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

    // Send audio to Google Cloud
    async sendAudioToGoogleCloud(audioBlob, mimeType = 'audio/webm') {
        try {
            console.log('📤 Sending audio to Google Cloud...');
            
            const formData = new FormData();
            const fileName = mimeType.includes('webm') ? 'recording.webm' : 
                            mimeType.includes('mp4') ? 'recording.mp4' : 'recording.wav';
            formData.append('audio', audioBlob, fileName);
            formData.append('language', this.currentLanguage === 'ar' ? 'ar' : 'en');
            
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('🎯 Google Cloud voice processing response:', result);
            
            if (result.success) {
                // Check if we have a transcript from STT
                if (result.pipeline && result.pipeline.stt && result.pipeline.stt.transcript && result.pipeline.stt.transcript.trim().length > 0) {
                    console.log('✅ Google Cloud STT transcription successful:', result.pipeline.stt.transcript);
                    
                    // Use the complete pipeline response (STT + RAG + TTS)
                    this.handleCompleteVoiceResponse(result.pipeline);
                } else {
                    console.warn('⚠️ No speech detected in audio');
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
                throw new Error(`Google Cloud voice processing failed: ${result.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('❌ Google Cloud voice service error:', error);
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
            
            // Use RAG response if available, otherwise generate fallback
            const responseText = ragResponse || this.generateVoiceResponse(transcript);
            
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
                    if (this.isConversationActive) {
                        console.log('🔄 Restarting listening after response');
                        setTimeout(() => {
                            this.startListening();
                        }, 300);
                    }
                });
            }
        } else {
            console.warn('⚠️ No transcript in pipeline response');
            this.handleRecordingError('no-transcript');
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
                this.isSpeaking = false;
                if (this.isConversationActive) {
                    console.log('🔄 Restarting listening after TTS audio');
                    setTimeout(() => {
                        this.startListening();
                    }, 300);
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
                `أهلاً! سؤالك عن "${transcript}" مثير للاهتمام. دعني أساعدك في ذلك.`,
                `نعم، "${transcript}" موضوع مهم. إليك ما أعرفه عنه.`,
                `فهمت، تريد معرفة المزيد عن "${transcript}". هذا رائع!`
            ] : [
                `That's interesting! You're asking about "${transcript}". Let me help you with that.`,
                `Yes, "${transcript}" is an important topic. Here's what I can tell you.`,
                `I understand you want to know more about "${transcript}". That's great!`
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
    updateVoiceButtonState(state) {
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
                voiceBtn.onclick = null; // No stop button - continuous conversation
                break;
            case 'listening':
                voiceBtn.classList.add('listening');
                voiceBtnIcon.className = 'fas fa-microphone';
                break;
            case 'speaking':
                voiceBtn.classList.add('speaking');
                voiceBtnIcon.className = 'fas fa-volume-up';
                voiceBtn.onclick = null; // No interrupt - let AI finish speaking
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
        
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        
        this.isSpeaking = false;
        this.wasInterrupted = true;
        
        if (this.isConversationActive) {
            this.updateVoiceStatus(this.currentLanguage === 'ar' ? 'تم المقاطعة - أستمع الآن' : 'Interrupted - listening now');
            this.updateVoiceButtonState('listening');
            this.updateVoiceAvatar('listening');
            this.showVoiceWaves(true);
            
            setTimeout(() => {
                this.startListening();
            }, 300);
        }
    }

    // Reset conversation timeout
    resetConversationTimeout() {
        clearTimeout(this.conversationTimeout);
        this.conversationTimeout = setTimeout(() => {
            console.log('⏰ Conversation timeout - ending conversation');
            this.stopVoiceConversation();
        }, this.CONVERSATION_TIMEOUT);
    }

    // Handle recording errors
    handleRecordingError(errorType) {
        this.isRecording = false;
        this.isProcessingVoice = false;
        
        let errorMessage;
        switch(errorType) {
            case 'mic-access-denied':
                errorMessage = this.currentLanguage === 'ar' ? 'يرجى السماح بالوصول للميكروفون' : 'Please allow microphone access';
                break;
            case 'recording-failed':
                errorMessage = this.currentLanguage === 'ar' ? 'فشل في التسجيل' : 'Recording failed';
                break;
            case 'processing-failed':
                errorMessage = this.currentLanguage === 'ar' ? 'فشل في معالجة الصوت' : 'Audio processing failed';
                break;
            case 'google-cloud-service-failed':
                errorMessage = this.currentLanguage === 'ar' ? 'خدمة التعرف على الصوت غير متاحة' : 'Voice recognition service unavailable';
                break;
            case 'https-required':
                errorMessage = this.currentLanguage === 'ar' ? 'الميكروفون يتطلب HTTPS أو localhost للعمل' : 'Microphone requires HTTPS or localhost to work';
                break;
            default:
                errorMessage = t('error-occurred', this.currentLanguage);
        }
        
        this.updateVoiceStatus(errorMessage);
        this.isConversationActive = false;
        this.updateVoiceButtonState('ready');
        this.updateVoiceAvatar('ready');
        this.showVoiceWaves(false);
        
        setTimeout(() => {
            this.updateVoiceStatus(t('voice-ready', this.currentLanguage));
        }, 5000);
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
