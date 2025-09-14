/**
 * API Routes Configuration
 * 
 * Sets up all API routes including voice, chat, and other endpoints.
 */

const { setupVoiceRoutes } = require('./voice');
const { setupChatRoutes } = require('./chat');
const livekitRoutes = require('./livekit');
const axios = require('axios');
const EnhancedRagService = require('../../core/university/enhancedRagService');

/**
 * Sets up all API routes
 * @param {express.Application} app - Express application instance
 */
function setupApiRoutes(app) {
    // Voice API routes
    app.use('/api/voice', setupVoiceRoutes());
    
    // Chat API routes
    app.use('/api/chat', setupChatRoutes());
    
    // LiveKit API routes for real-time voice streaming
    app.use('/api/livekit', livekitRoutes);
    
    // RAG service is now integrated directly - no proxy needed
    
    // Direct RAG API endpoint for testing
    app.post('/api/rag/query', async (req, res) => {
        try {
            const { query, sessionId = 'test-session', language = 'en', isVoiceInteraction = false } = req.body;
            
            if (!query) {
                return res.status(400).json({ error: 'Query is required' });
            }

            console.log(`🧠 Direct RAG API Query: "${query}" (${language}, ${isVoiceInteraction ? 'voice' : 'text'})`);
            
            const ragService = new EnhancedRagService();
            await ragService.initialize();
            
            const result = await ragService.processQuery(query, sessionId, language, isVoiceInteraction);
            
            res.json({
                success: true,
                query: query,
                response: result.response,
                confidence: result.confidence,
                sources: result.sources,
                performance: result.performance,
                sessionId: sessionId,
                isVoiceInteraction: isVoiceInteraction,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Direct RAG API error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                response: "I'm sorry, I'm having trouble processing your request right now.",
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // Other API routes can be added here
}

module.exports = { setupApiRoutes };
