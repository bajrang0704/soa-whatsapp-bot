/**
 * Enhanced RAG Service
 * 
 * Direct integration of the Enhanced RAG system into the main application.
 * This replaces the need for a separate RAG server.
 */

const { EnhancedNodeRAGSystem } = require('../enhanced-nodejs-rag');

class EnhancedRagService {
    constructor() {
        this.ragSystem = null;
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    /**
     * Initialize the Enhanced RAG system
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize();
        return this.initializationPromise;
    }

    async _doInitialize() {
        try {
            console.log('🚀 Initializing Enhanced RAG System...');
            
            // Check if we should skip Enhanced RAG in production due to Docker issues
            if (process.env.NODE_ENV === 'production' && process.env.SKIP_ENHANCED_RAG === 'true') {
                console.log('⚠️ Skipping Enhanced RAG System in production (Docker compatibility)');
                this.isInitialized = false;
                return;
            }
            
            this.ragSystem = new EnhancedNodeRAGSystem();
            
            // Initialize the Enhanced RAG system first
            console.log('🔧 Initializing Enhanced RAG system...');
            
            // Set a timeout for initialization to prevent hanging
            const initTimeout = setTimeout(() => {
                throw new Error('Enhanced RAG initialization timeout after 60 seconds');
            }, 60000);
            
            try {
                await this.ragSystem.initialize();
                clearTimeout(initTimeout);
            } catch (initError) {
                clearTimeout(initTimeout);
                console.warn('⚠️ Enhanced RAG initialization failed:', initError.message);
                throw initError;
            }
            
            // Load the knowledge base
            const path = require('path');
            const knowledgeBasePath = path.join(__dirname, '../../data/data.json');
            
            console.log('📚 Loading knowledge base...');
            await this.ragSystem.loadKnowledgeBase(knowledgeBasePath);
            
            this.isInitialized = true;
            console.log('✅ Enhanced RAG System initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced RAG System:', error);
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack?.substring(0, 500)
            });
            
            // Always use fallback in production to prevent container crashes
            console.log('⚠️ Enhanced RAG System failed to initialize, using fallback mode');
            this.isInitialized = false;
            this.ragSystem = null;
        }
    }

    /**
     * Process a query using the Enhanced RAG system
     * @param {string} query - The user query
     * @param {string} sessionId - Session ID for conversation tracking
     * @param {string} language - Language code (en/ar)
     * @param {string} searchType - Search type (hybrid/semantic/keyword)
     * @param {boolean} isVoiceInteraction - Whether this is a voice interaction
     * @returns {Object} RAG response
     */
    async processQuery(query, sessionId = 'default', language = 'en', searchType = 'hybrid', isVoiceInteraction = false) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // If Enhanced RAG failed to initialize, use fallback
            if (!this.isInitialized) {
                console.log('🔄 Using fallback RAG service due to Enhanced RAG initialization failure');
                return await this.fallbackQuery(query, sessionId, language, isVoiceInteraction);
            }

            console.log(`🧠 Enhanced RAG Query: "${query}" (${language}, ${searchType}, Voice: ${isVoiceInteraction})`);
            
            const result = await this.ragSystem.advancedQuery(query, sessionId, searchType, { 
                language, 
                isVoiceInteraction 
            });
            
            return {
                success: true,
                response: result.response,
                confidence: result.confidence,
                performance: result.performance,
                sources: result.sources || [],
                sessionId: sessionId,
                isVoiceInteraction: isVoiceInteraction
            };

        } catch (error) {
            console.error('❌ Enhanced RAG processing error:', error);
            console.log('🔄 Falling back to basic RAG service');
            return await this.fallbackQuery(query, sessionId, language, isVoiceInteraction);
        }
    }

    async fallbackQuery(query, sessionId, language, isVoiceInteraction) {
        try {
            // Use the basic RAG service as fallback (it's exported as an instance, not a class)
            const ragService = require('./ragService');
            
            const result = await ragService.processQuery(query, language);
            
            return {
                success: true,
                response: result.response,
                confidence: result.confidence || 0.7,
                performance: { fallback: true, method: 'basic-rag' },
                sources: result.sources || [],
                sessionId: sessionId,
                isVoiceInteraction: isVoiceInteraction
            };
        } catch (error) {
            console.error('❌ Fallback RAG also failed:', error);
            return {
                success: false,
                error: error.message,
                response: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                confidence: 0,
                performance: { error: true, message: error.message }
            };
        }
    }

    /**
     * Get system statistics
     */
    async getStats() {
        if (!this.isInitialized) {
            return { initialized: false };
        }

        try {
            return await this.ragSystem.getStats();
        } catch (error) {
            console.error('❌ Error getting RAG stats:', error);
            return { error: error.message };
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            status: this.isInitialized ? 'healthy' : 'initializing',
            initialized: this.isInitialized,
            timestamp: new Date().toISOString()
        };
    }
}

// Create a singleton instance
const enhancedRagService = new EnhancedRagService();

module.exports = enhancedRagService;
