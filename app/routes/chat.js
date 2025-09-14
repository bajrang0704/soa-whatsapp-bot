/**
 * Chat API Routes
 * 
 * Handles all chat-related API endpoints.
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');

const ChatController = require('../controllers/chatController');

/**
 * Sets up chat routes
 * @returns {express.Router} Configured chat router
 */
function setupChatRoutes() {
    const router = express.Router();
    const chatController = new ChatController();
    
    // Chat message endpoint
    router.post('/message',
        asyncHandler(chatController.handleMessage.bind(chatController))
    );
    
    // Chat history endpoint
    router.get('/history/:sessionId',
        asyncHandler(chatController.getHistory.bind(chatController))
    );
    
    // Clear chat history endpoint
    router.delete('/history/:sessionId',
        asyncHandler(chatController.clearHistory.bind(chatController))
    );
    
    return router;
}

module.exports = { setupChatRoutes };
