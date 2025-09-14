/**
 * LLM Service
 * 
 * External service integration for Large Language Models (Groq, OpenAI, etc.).
 * Integrates with the existing LLM service.
 */

const axios = require('axios');

// LLM Service - No external dependency needed

class LLMService {
    constructor() {
        this.groqApiKey = process.env.GROQ_API_KEY;
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.openaiUrl = 'https://api.openai.com/v1/chat/completions';
        // LLM Service initialized
        console.log('🤖 LLM Service initialized with enhanced capabilities');
    }
    
    /**
     * Generates response using LLM
     * @param {Object} params - LLM parameters
     * @param {string} params.query - User query
     * @param {string} params.context - Context information
     * @param {Array} params.history - Conversation history
     * @param {string} params.language - Language code
     * @returns {Promise<Object>} LLM response
     */
    async generateResponse({ query, context, history, language }) {
        try {
            console.log(`🤖 Generating LLM response for: "${query}"`);
            
            // Use the existing LLM service which already has RAG integration
            const response = await this.existingLLM.processQuery(query, language);
            
            return {
                text: response,
                confidence: 0.9,
                language: language,
                provider: 'enhanced-rag'
            };
            
        } catch (error) {
            console.error('❌ LLM generation error:', error);
            
            // Fallback to direct LLM calls
            if (this.groqApiKey) {
                return await this.generateWithGroq({ query, context, history, language });
            } else if (this.openaiApiKey) {
                return await this.generateWithOpenAI({ query, context, history, language });
            } else {
                throw new Error('No LLM API key configured');
            }
        }
    }
    
    /**
     * Generates response using Groq
     * @param {Object} params - LLM parameters
     * @returns {Promise<Object>} LLM response
     */
    async generateWithGroq({ query, context, history, language }) {
        try {
            console.log(`🤖 Generating response with Groq...`);
            
            const messages = this.buildMessages({ query, context, history, language });
            
            const response = await axios.post(this.groqUrl, {
                model: 'llama-3.1-8b-instant',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000,
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${this.groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            const content = response.data.choices[0].message.content;
            
            return {
                text: content,
                confidence: 0.8,
                language: language,
                provider: 'groq'
            };
            
        } catch (error) {
            console.error('❌ Groq generation error:', error);
            throw error;
        }
    }
    
    /**
     * Generates response using OpenAI
     * @param {Object} params - LLM parameters
     * @returns {Promise<Object>} LLM response
     */
    async generateWithOpenAI({ query, context, history, language }) {
        try {
            console.log(`🤖 Generating response with OpenAI...`);
            
            const messages = this.buildMessages({ query, context, history, language });
            
            const response = await axios.post(this.openaiUrl, {
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            const content = response.data.choices[0].message.content;
            
            return {
                text: content,
                confidence: 0.8,
                language: language,
                provider: 'openai'
            };
            
        } catch (error) {
            console.error('❌ OpenAI generation error:', error);
            throw error;
        }
    }
    
    /**
     * Builds messages for LLM
     * @param {Object} params - Message parameters
     * @returns {Array} Messages array
     */
    buildMessages({ query, context, history, language }) {
        const messages = [];
        
        // System prompt
        const systemPrompt = this.getSystemPrompt(language);
        messages.push({
            role: 'system',
            content: systemPrompt
        });
        
        // Add context if available
        if (context) {
            messages.push({
                role: 'system',
                content: `Context: ${context}`
            });
        }
        
        // Add conversation history
        if (history && history.length > 0) {
            history.slice(-10).forEach(exchange => {
                messages.push({
                    role: 'user',
                    content: exchange.userMessage
                });
                messages.push({
                    role: 'assistant',
                    content: exchange.botResponse
                });
            });
        }
        
        // Add current query
        messages.push({
            role: 'user',
            content: query
        });
        
        return messages;
    }
    
    /**
     * Gets system prompt for language
     * @param {string} language - Language code
     * @returns {string} System prompt
     */
    getSystemPrompt(language) {
        if (language === 'ar') {
            return `أنت مساعد ذكي لجامعة سلطان للفنون. ساعد الطلاب في:
- متطلبات القبول لكل قسم
- الرسوم الدراسية والتكاليف
- الدرجات المطلوبة للقبول
- الفترات المتاحة (صباحي/مسائي)
- مقارنة الأقسام المختلفة

أجب باللغة العربية بطريقة مفيدة ومهذبة.`;
        }
        
        return `You are an intelligent assistant for SOA University College. Help students with:
- Admission requirements for each department
- Tuition fees and costs
- Minimum grade requirements for admission
- Available shifts (Morning/Evening)
- Department comparisons

Answer in English in a helpful and polite manner.`;
    }
    
    /**
     * Gets service status
     * @returns {Object} Service status
     */
    getStatus() {
        return {
            groq: {
                configured: !!this.groqApiKey,
                apiKey: this.groqApiKey ? '***' + this.groqApiKey.slice(-4) : null
            },
            openai: {
                configured: !!this.openaiApiKey,
                apiKey: this.openaiApiKey ? '***' + this.openaiApiKey.slice(-4) : null
            }
        };
    }
}

module.exports = LLMService;
