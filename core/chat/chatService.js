/**
 * Chat Service
 * 
 * Core chat processing service that handles message processing,
 * conversation flow, and integration with AI services.
 */

const LLMService = require('../../infrastructure/external/llmService');
const MemoryService = require('../memory/memoryService');
const enhancedRagService = require('../university/enhancedRagService');

class ChatService {
    constructor() {
        this.ragService = enhancedRagService;
        this.llmService = new LLMService();
        this.memoryService = new MemoryService();
    }
    
    /**
     * Processes incoming chat messages
     * @param {Object} params - Message parameters
     * @param {string} params.message - User message
     * @param {string} params.sessionId - Session ID
     * @param {string} params.language - Language code
     * @param {boolean} params.isVoiceMessage - Whether it's a voice message
     * @returns {Promise<Object>} Chat response
     */
    async processMessage({ message, sessionId, language, isVoiceMessage }) {
        try {
            console.log(`💬 Processing message: "${message.substring(0, 50)}..." (${language})`);
            
            // Get conversation history
            const history = await this.memoryService.getHistory(sessionId);
            
            // Process with Enhanced RAG Service (direct integration)
            const ragResult = await this.ragService.processQuery(message, sessionId, language, 'hybrid', isVoiceMessage);
            
            if (!ragResult.success) {
                throw new Error('RAG processing failed: ' + ragResult.error);
            }
            
            // Use the Enhanced RAG response directly (it already includes LLM processing)
            const response = {
                text: ragResult.response,
                confidence: ragResult.confidence,
                performance: ragResult.performance
            };
            
            // Save to memory
            await this.memoryService.saveExchange(sessionId, {
                userMessage: message,
                botResponse: response.text,
                timestamp: new Date().toISOString(),
                language,
                isVoiceMessage
            });
            
            return {
                response: response.text,
                confidence: response.confidence,
                language: language,
                sources: response.performance?.resultCount || 0,
                sessionId
            };
            
        } catch (error) {
            console.error('❌ Chat processing error:', error);
            throw error;
        }
    }
    
    /**
     * Gets chat history for a session
     * @param {string} sessionId - Session ID
     * @param {number} limit - Maximum number of messages
     * @returns {Promise<Array>} Chat history
     */
    async getHistory(sessionId, limit = 50) {
        try {
            const history = await this.memoryService.getHistory(sessionId, limit);
            return history;
            
        } catch (error) {
            console.error('❌ Get history error:', error);
            throw error;
        }
    }
    
    /**
     * Clears chat history for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} Success status
     */
    async clearHistory(sessionId) {
        try {
            const success = await this.memoryService.clearHistory(sessionId);
            return success;
            
        } catch (error) {
            console.error('❌ Clear history error:', error);
            throw error;
        }
    }
    
    /**
     * Gets welcome message
     * @param {string} language - Language code
     * @returns {string} Welcome message
     */
    getWelcomeMessage(language = 'en') {
        if (language === 'ar') {
            return `🎓 أهلاً بك في كلية سلطان للفنون!

أنا مساعد ذكي يمكنني مساعدتك في:
• متطلبات القبول لكل قسم
• الرسوم الدراسية والتكاليف  
• الدرجات المطلوبة للقبول
• الفترات المتاحة (صباحي/مسائي)
• مقارنة الأقسام المختلفة

اسألني أي سؤال حول القبول!
مثال: "ما متطلبات طب الأسنان؟" أو "كم رسوم الهندسة؟"`;
        }
        
        return `🎓 Welcome to SOA University College!

I'm an AI assistant that can help you with:
• Admission requirements for each department
• Tuition fees and costs
• Minimum grade requirements  
• Available shifts (Morning/Evening)
• Department comparisons

Ask me anything about admissions!
Example: "What are dentistry requirements?" or "How much does engineering cost?"`;
    }
}

module.exports = ChatService;
