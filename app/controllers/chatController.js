/**
 * Chat Controller
 * 
 * Handles chat-related operations including message processing,
 * history management, and conversation flow.
 */

const ChatService = require('../../core/chat/chatService');
const { asyncHandler } = require('../middleware/errorHandler');

class ChatController {
    constructor() {
        this.chatService = new ChatService();
    }
    
    /**
     * Handles incoming chat messages
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async handleMessage(req, res) {
        try {
            const { message, sessionId, language = 'en', isVoiceMessage = false } = req.body;
            
            if (!message || !sessionId) {
                return res.status(400).json({
                    success: false,
                    error: 'Message and sessionId are required'
                });
            }
            
            const result = await this.chatService.processMessage({
                message,
                sessionId,
                language,
                isVoiceMessage
            });
            
            res.json({
                success: true,
                ...result
            });
            
        } catch (error) {
            console.error('❌ Chat message error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process message',
                message: error.message
            });
        }
    }
    
    /**
     * Gets chat history for a session
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async getHistory(req, res) {
        try {
            const { sessionId } = req.params;
            const { limit = 50 } = req.query;
            
            const history = await this.chatService.getHistory(sessionId, parseInt(limit));
            
            res.json({
                success: true,
                history,
                sessionId
            });
            
        } catch (error) {
            console.error('❌ Get history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get chat history',
                message: error.message
            });
        }
    }
    
    /**
     * Clears chat history for a session
     * @param {express.Request} req - Express request object
     * @param {express.Response} res - Express response object
     */
    async clearHistory(req, res) {
        try {
            const { sessionId } = req.params;
            
            const success = await this.chatService.clearHistory(sessionId);
            
            res.json({
                success,
                message: success ? 'History cleared successfully' : 'Failed to clear history',
                sessionId
            });
            
        } catch (error) {
            console.error('❌ Clear history error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear chat history',
                message: error.message
            });
        }
    }
}

module.exports = ChatController;
