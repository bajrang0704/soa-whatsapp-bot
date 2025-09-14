const axios = require('axios');
require('dotenv').config();

class VoiceSummarizationService {
    constructor() {
        this.groqApiKey = process.env.GROQ_API_KEY;
        this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.1-8b-instant';
        
        if (!this.groqApiKey) {
            console.warn('⚠️ GROQ_API_KEY not found. Voice summarization will use fallback responses.');
        }
    }

    /**
     * Summarize RAG response for voice output
     * @param {string} ragResponse - Full RAG response
     * @param {string} userQuery - Original user query
     * @param {string} language - Language preference ('en' or 'ar')
     * @returns {Promise<string>} - Summarized response suitable for voice
     */
    async summarizeForVoice(ragResponse, userQuery, language = 'en') {
        try {
            if (!this.groqApiKey) {
                return this.getFallbackResponse(ragResponse, language);
            }

            const isArabic = language === 'ar';
            const systemPrompt = this.buildSystemPrompt(isArabic);
            const userPrompt = this.buildUserPrompt(ragResponse, userQuery, isArabic);

            console.log(`🎯 Summarizing RAG response for voice (${language})...`);

            const response = await axios.post(this.groqApiUrl, {
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: isArabic ? 80 : 100, // Much shorter for voice
                temperature: 0.7,
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${this.groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            let summarizedResponse = response.data.choices[0].message.content.trim();
            
            // Ensure response is under 2000 characters for TTS compatibility
            if (summarizedResponse.length > 2000) {
                console.warn(`⚠️ Response too long (${summarizedResponse.length} chars), truncating...`);
                summarizedResponse = summarizedResponse.substring(0, 1950) + '...';
            }
            
            console.log(`✅ Voice summarization complete: ${summarizedResponse.length} chars`);
            return summarizedResponse;

        } catch (error) {
            console.error('❌ Voice summarization failed:', error.message);
            return this.getFallbackResponse(ragResponse, language);
        }
    }

    buildSystemPrompt(isArabic) {
        if (isArabic) {
            return `أنت تعمل كموظف إداري في كلية جامعة جنوب آسيا.

مهمتك:
- أجب على استفسار المستخدم تماماً كما سيجيب موظف الإدارة
- اجعل الإجابة قصيرة وواضحة وصحيحة
- لا تضيف تفسيرات إضافية أو افتراضات أو فقرات طويلة
- إذا لم يكن بالإمكان الإجابة على الاستفسار من البيانات المتوفرة، قل بأدب أنك لا تملك هذه المعلومة
- اجعل الإجابة مناسبة للصوت (أقل من 50 كلمة)`;
        } else {
            return `You are acting as a college administration staff member.

Your task:
- Answer the user exactly as an administration staff would respond
- Keep the response short, clear, and correct
- Do not add extra explanations, assumptions, or long paragraphs
- If the query cannot be answered from the provided data, politely say you don't have that information
- Keep response suitable for voice output (under 50 words)`;
        }
    }

    buildUserPrompt(ragResponse, userQuery, isArabic) {
        if (isArabic) {
            return `استعلام المستخدم: ${userQuery}

بيانات RAG:
${ragResponse}`;
        } else {
            return `User Query: ${userQuery}

RAG Data: ${ragResponse}`;
        }
    }

    getFallbackResponse(ragResponse, language) {
        // Simple fallback: extract key information manually
        const isArabic = language === 'ar';
        
        if (isArabic) {
            // Extract key Arabic information
            const gradeMatch = ragResponse.match(/(\d+\.?\d*)%/);
            const tuitionMatch = ragResponse.match(/(\d+[,\d]*)\s*IQD/);
            
            if (gradeMatch && tuitionMatch) {
                return `المتطلبات: ${gradeMatch[1]}% كحد أدنى. الرسوم السنوية: ${tuitionMatch[1]} دينار عراقي.`;
            } else if (gradeMatch) {
                return `المتطلبات: ${gradeMatch[1]}% كحد أدنى.`;
            } else {
                return 'متوفر في كلية جامعة جنوب آسيا. يرجى زيارة موقعنا للمزيد من التفاصيل.';
            }
        } else {
            // Extract key English information
            const gradeMatch = ragResponse.match(/(\d+\.?\d*)%/);
            const tuitionMatch = ragResponse.match(/(\d+[,\d]*)\s*IQD/);
            
            if (gradeMatch && tuitionMatch) {
                return `Requirements: ${gradeMatch[1]}% minimum grade. Annual tuition: ${tuitionMatch[1]} IQD.`;
            } else if (gradeMatch) {
                return `Requirements: ${gradeMatch[1]}% minimum grade.`;
            } else {
                return 'Available at SOA University College. Please visit our website for more details.';
            }
        }
    }
}

module.exports = new VoiceSummarizationService();
