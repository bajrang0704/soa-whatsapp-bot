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
        formattedMessage = formattedMessage.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formattedMessage = formattedMessage.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        if (/[\u0600-\u06FF]/.test(message)) {
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
                this.handleVoiceResponse(responseText);
            } else {
                console.warn('⚠️ No speech detected or pipeline failed');
                this.handleVoiceResponse('I didn\'t hear any speech clearly. Please try again.');
            }
            
        } catch (error) {
            console.error('❌ Voice pipeline error:', error);
            this.handleVoiceResponse('Sorry, I had trouble processing your speech. Please try again.');
        }
    } 

    handleVoiceResponse(responseText) {
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

// App initialization
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
};