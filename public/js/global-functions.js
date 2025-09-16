// Global Functions for HTML onclick handlers
// This file provides global functions that are accessible from HTML onclick attributes

// Global functions for modal interactions

window.openChatbot = function() {
    console.log('🔓 Opening chatbot modal');
    if (window.app) {
        window.app.openChatbot();
    } else {
        console.warn('⚠️ App not initialized yet');
        // Fallback: direct modal manipulation
        const chatbotModal = document.getElementById('chatbotModal');
        if (chatbotModal) {
            chatbotModal.classList.add('show');
            setTimeout(() => {
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.focus();
                }
            }, 100);
        }
    }
};

window.closeChatbot = function() {
    console.log('🔒 Closing chatbot modal');
    if (window.app) {
        window.app.closeChatbot();
    } else {
        // Fallback: direct modal manipulation
        const chatbotModal = document.getElementById('chatbotModal');
        if (chatbotModal) {
            chatbotModal.classList.remove('show');
        }
    }
};

window.openVoiceAgent = function() {
    console.log('🔓 Opening voice agent modal');
    if (window.app) {
        window.app.openVoiceAgent();
    } else {
        console.warn('⚠️ App not initialized yet');
        // Fallback: direct modal manipulation
        const voiceModal = document.getElementById('voiceModal');
        if (voiceModal) {
            voiceModal.classList.add('show');
        }
    }
};

window.closeVoiceAgent = function() {
    console.log('🔒 Closing voice agent modal');
    if (window.app) {
        window.app.closeVoiceAgent();
    } else {
        // Fallback: direct modal manipulation
        const voiceModal = document.getElementById('voiceModal');
        if (voiceModal) {
            voiceModal.classList.remove('show');
            // Stop voice conversation if active (force stop when modal is closed)
            if (window.voiceModule && window.voiceModule.isConversationActive) {
                window.voiceModule.stopVoiceConversation(true);
            }
        }
    }
};

// Initialize global functions immediately
console.log('✅ Global functions initialized');
