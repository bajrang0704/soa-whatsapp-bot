// Socket.IO Service Module
class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.messageHandlers = new Map();
        this.errorHandlers = new Map();
    }

    // Initialize Socket.IO connection
    initialize() {
        try {
            // iOS-compatible Socket.IO configuration
            const options = {
                transports: ['websocket', 'polling'], // Fallback to polling for iOS
                timeout: 20000,
                forceNew: true
            };
            
            this.socket = io(options);
            
            // Setup iOS WebSocket fallback
            if (typeof iosCompatibility !== 'undefined') {
                iosCompatibility.setupWebSocketFallback(this.socket);
            }
            
            this.socket.on('connect', () => {
                console.log('🔗 Connected to server via Socket.IO');
                this.isConnected = true;
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from server');
                this.isConnected = false;
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection error:', error);
                this.isConnected = false;
            });
            
            // Handle typing indicators
            this.socket.on('typing', () => {
                this.showTypingIndicator();
            });
            
            this.socket.on('stop-typing', () => {
                this.hideTypingIndicator();
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize Socket.IO:', error);
            this.isConnected = false;
        }
    }

    // Send chat message
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

    // Send voice message
    sendVoiceMessage(transcript, language = 'en', conversationContext = [], sessionId = null) {
        if (this.socket && this.isConnected) {
            const messageData = {
                message: transcript,
                language,
                timestamp: new Date().toISOString(),
                isVoiceMessage: true,
                sessionId: sessionId || `voice_${Date.now()}`,
                conversationContext: conversationContext.slice(-4) // Send last 4 messages for context
            };
            
            console.log('🎤 Sending voice message via Socket.IO:', messageData);
            this.socket.emit('message', messageData);
            return true;
        }
        return false;
    }

    // Listen for message responses
    onMessageResponse(handler) {
        if (this.socket) {
            this.socket.on('message-response', handler);
        }
    }

    // Listen for voice responses
    onVoiceResponse(handler) {
        if (this.socket) {
            this.socket.on('voice-response', handler);
        }
    }

    // Listen for errors
    onError(handler) {
        if (this.socket) {
            this.socket.on('error', handler);
        }
    }

    // Remove listeners
    off(event, handler) {
        if (this.socket) {
            this.socket.off(event, handler);
        }
    }

    // Show typing indicator
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        // Remove existing typing indicator
        const existingIndicator = document.getElementById('typing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message bot-message typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Hide typing indicator
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Get connection status
    getConnectionStatus() {
        return this.isConnected;
    }
}

// Export singleton instance
export const socketService = new SocketService();
