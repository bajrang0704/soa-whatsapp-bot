/**
 * Socket.IO Configuration
 * 
 * Handles WebSocket connections and real-time communication.
 */

const ChatService = require('../core/chat/chatService');

class SocketManager {
    constructor() {
        this.chatService = new ChatService();
    }
    
    /**
     * Sets up Socket.IO handlers
     * @param {socketIo.Server} io - Socket.IO server instance
     */
    setupSocketIO(io) {
        io.on('connection', (socket) => {
            console.log(`🌐 User connected: ${socket.id}`);
            
            // Handle chat messages
            socket.on('message', async (data) => {
                try {
                    await this.handleChatMessage(data, socket);
                } catch (error) {
                    console.error('❌ WebSocket message error:', error);
                    socket.emit('error', { message: 'Failed to process message' });
                }
            });
            
            // Handle voice messages
            socket.on('voice-message', async (data) => {
                try {
                    console.log('🎤 Voice message received:', data.message);
                    await this.handleChatMessage(data, socket, true);
                } catch (error) {
                    console.error('❌ Voice message error:', error);
                    socket.emit('error', { message: 'Failed to process voice message' });
                }
            });
            
            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`👋 User disconnected: ${socket.id}`);
            });
        });
    }
    
    /**
     * Handles chat messages
     * @param {Object} data - Message data
     * @param {socketIo.Socket} socket - Socket instance
     * @param {boolean} isVoiceMessage - Whether it's a voice message
     */
    async handleChatMessage(data, socket, isVoiceMessage = false) {
        try {
            const { message, sessionId, language = 'en' } = data;
            
            if (!message || !sessionId) {
                socket.emit('error', { message: 'Message and sessionId are required' });
                return;
            }
            
            // Process message
            const result = await this.chatService.processMessage({
                message,
                sessionId,
                language,
                isVoiceMessage
            });
            
            // Send response
            socket.emit('message-response', {
                success: true,
                ...result
            });
            
        } catch (error) {
            console.error('❌ Chat message processing error:', error);
            socket.emit('error', { message: 'Failed to process message' });
        }
    }
}

/**
 * Sets up Socket.IO handlers
 * @param {socketIo.Server} io - Socket.IO server instance
 */
function setupSocketIO(io) {
    const socketManager = new SocketManager();
    socketManager.setupSocketIO(io);
}

module.exports = { setupSocketIO };
