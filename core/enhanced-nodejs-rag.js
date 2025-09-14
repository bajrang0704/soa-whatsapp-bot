const fs = require('fs-extra');
const natural = require('natural');
const axios = require('axios');
require('dotenv').config();

// Dynamic import for ES modules
let pipeline, env;

class AdvancedTokenizer {
    static tokenize(text) {
        // Advanced tokenization with sentence splitting and preprocessing
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2);
    }
    
    static extractKeywords(text, topK = 10) {
        const tokens = this.tokenize(text);
        const freq = {};
        tokens.forEach(token => {
            freq[token] = (freq[token] || 0) + 1;
        });
        
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topK)
            .map(([word, count]) => ({ word, score: count }));
    }
}

class DocumentProcessor {
    static chunkText(text, maxLength = 500, overlap = 50) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const chunks = [];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxLength) {
                currentChunk += sentence + '. ';
            } else {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = sentence + '. ';
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        // Add overlap between chunks
        const overlappedChunks = [];
        for (let i = 0; i < chunks.length; i++) {
            let chunk = chunks[i];
            if (i > 0 && overlap > 0) {
                const prevWords = chunks[i-1].split(' ').slice(-overlap/2);
                chunk = prevWords.join(' ') + ' ' + chunk;
            }
            overlappedChunks.push(chunk);
        }
        
        return overlappedChunks;
    }
    
    static enhanceDocument(doc, metadata = {}) {
        const keywords = AdvancedTokenizer.extractKeywords(doc.content, 15);
        const chunks = this.chunkText(doc.content);
        
        return {
            ...doc,
            keywords,
            chunks,
            wordCount: doc.content.split(' ').length,
            enhanced: true,
            enhancedAt: new Date().toISOString(),
            ...metadata
        };
    }
}

class RerankerSimulator {
    // Simulate CrossEncoder reranking with sophisticated scoring
    static rerankResults(query, results, topK = 5) {
        const queryKeywords = new Set(AdvancedTokenizer.tokenize(query));
        
        return results.map(result => {
            const docKeywords = new Set(AdvancedTokenizer.tokenize(result.document.content));
            
            // Calculate multiple relevance signals
            const keywordOverlap = this.calculateOverlap(queryKeywords, docKeywords);
            const positionBoost = this.calculatePositionBoost(result.document.content, query);
            const lengthPenalty = this.calculateLengthPenalty(result.document.content);
            const typeBoost = this.calculateTypeBoost(result.document.type, query);
            
            // Combined reranking score
            const rerankScore = (
                result.score * 0.5 +           // Original similarity
                keywordOverlap * 0.2 +         // Keyword overlap
                positionBoost * 0.15 +         // Position of query terms
                typeBoost * 0.1 +              // Document type relevance
                lengthPenalty * 0.05           // Length normalization
            );
            
            return {
                ...result,
                originalScore: result.score,
                rerankScore,
                score: rerankScore,
                rerankingSignals: {
                    keywordOverlap,
                    positionBoost,
                    lengthPenalty,
                    typeBoost
                }
            };
        })
        .sort((a, b) => b.rerankScore - a.rerankScore)
        .slice(0, topK);
    }
    
    static calculateOverlap(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / Math.max(union.size, 1);
    }
    
    static calculatePositionBoost(content, query) {
        const queryTerms = AdvancedTokenizer.tokenize(query);
        const contentLower = content.toLowerCase();
        let boost = 0;
        
        queryTerms.forEach(term => {
            const index = contentLower.indexOf(term);
            if (index !== -1) {
                // Earlier positions get higher boost
                boost += Math.max(0, 1 - (index / contentLower.length));
            }
        });
        
        return boost / Math.max(queryTerms.length, 1);
    }
    
    static calculateLengthPenalty(content) {
        const idealLength = 200;
        const actualLength = content.length;
        return Math.exp(-Math.abs(actualLength - idealLength) / idealLength);
    }
    
    static calculateTypeBoost(docType, query) {
        const queryLower = query.toLowerCase();
        const boosts = {
            'admission': queryLower.includes('admission') || queryLower.includes('requirement') ? 0.3 : 0,
            'fee': queryLower.includes('fee') || queryLower.includes('cost') || queryLower.includes('tuition') ? 0.3 : 0,
            'department': queryLower.includes('department') || queryLower.includes('program') ? 0.2 : 0,
        };
        
        return boosts[docType] || 0;
    }
}

class LLMIntegrator {
    constructor(config = {}) {
        this.groqApiKey = config.groqApiKey || process.env.GROQ_API_KEY;
        this.openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
        this.anthropicApiKey = config.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
        this.model = config.model || 'groq';
        this.maxTokens = config.maxTokens || 500;
        this.temperature = config.temperature || 0.7;
    }
    
    async generateResponse(query, context, conversationHistory = [], language = 'en', promptType = 'default') {
        let systemPrompt, userPrompt;
        
        if (promptType === 'voice') {
            systemPrompt = this.buildVoiceSystemPrompt(context, language);
            userPrompt = this.buildVoiceUserPrompt(query, context);
        } else {
            systemPrompt = this.buildSystemPrompt(context, conversationHistory, language);
            userPrompt = this.buildUserPrompt(query);
        }
        
        // Replace {user_query} placeholder in system prompt
        systemPrompt = systemPrompt.replace('{user_query}', query);
        
        try {
            switch (this.model) {
                case 'groq':
                    return await this.callGroq(systemPrompt, userPrompt);
                case 'openai':
                    return await this.callOpenAI(systemPrompt, userPrompt);
                case 'anthropic':
                    return await this.callAnthropic(systemPrompt, userPrompt);
                default:
                    return this.generateFallbackResponse(query, context, language);
            }
        } catch (error) {
            console.error('LLM generation error:', error);
            return this.generateFallbackResponse(query, context, language);
        }
    }
    
    buildSystemPrompt(context, history, language = 'en') {
        const ragResponse = context.map((doc, i) => `${i+1}. ${doc.content}`).join('\n\n');
        
        let prompt = language === 'ar' 
            ? `أنت مساعد ذكي محادث مفيد.

ستحصل على:
1. استفسار المستخدم (السؤال الذي طرحه المستخدم).
2. السياق المسترجع (معلومات مسترجعة من مصادر خارجية أو قاعدة المعرفة).

مهمتك:
- استخدم السياق المسترجع كمصدر الحقيقة الأساسي.
- إذا كان السياق ذا صلة، أجب على الاستفسار بناءً عليه بدقة.
- إذا لم يحتوي السياق على معلومات كافية، قل ذلك بأدب بدلاً من التخمين.
- اجعل الإجابة واضحة ومختصرة ومحادثة.

---
استفسار المستخدم:
{user_query}

السياق المسترجع:
${ragResponse}

الإجابة:`
            : `You are a helpful conversational AI assistant.  
You will be given:
1. A **user query** (the question the user asked).  
2. A **retrieved context** (information retrieved from external sources or knowledge base).  

Your task:
- Use the retrieved context as the **primary source of truth**.  
- If the context is relevant, answer the query **strictly based on it**.  
- If the context does not contain enough information, politely say so instead of guessing.  
- Keep the answer clear, concise, and conversational.  

---
User Query:  
{user_query}

Retrieved Context:  
${ragResponse}

Answer:`;

        return prompt;
    }
    
    buildUserPrompt(query) {
        return query; // The system prompt already contains the template with {user_query}
    }
    
    buildVoiceSystemPrompt(context, language = 'en') {
        const ragResponse = context.map((doc, i) => `${i+1}. ${doc.content}`).join('\n\n');
        
        if (language === 'ar') {
            return `أنت مساعد صوتي ودود ومفيد لقبولات الكلية.

ستحصل على:
1. استفسار الطالب المنطوق حول القبولات.
2. السياق المسترجع (معلومات حول إجراءات القبول، الأهلية، المواعيد النهائية، الرسوم، أو الدورات).

مهمتك:
- أجب بوضوح وبشكل طبيعي كما لو كنت تتحدث مع طالب.
- اعتمد دائماً على السياق المسترجع كمصدر الحقيقة الأساسي.
- إذا قدم السياق معلومات كافية، أعط إجابة قصيرة ومحادثة ومشجعة.
- إذا كان السياق غير مكتمل، قل بأدب أنك لا تملك التفاصيل الكاملة ووجه الطالب نحو الخطوات التالية المحتملة.
- لا تقرأ السياق المسترجع كلمة بكلمة - أعد صياغته إلى كلام بسيط وطبيعي.
- اجعل الإجابات تركز على القبولات (الأهلية، العملية، المواعيد النهائية، المنح الدراسية، الدورات، إلخ).

---
سؤال الطالب (منطوق):
{user_query}

السياق المسترجع:
${ragResponse}

الإجابة المنطوقة:`;
        } else {
            return `You are a friendly and helpful voice assistant for college admissions.  

You will be given:  
1. A student's spoken query about admissions.  
2. Retrieved context (information about admission procedures, eligibility, deadlines, fees, or courses).  

Your task:  
- Answer **clearly and naturally as if speaking to a student**.  
- Always rely on the retrieved context as the **main source of truth**.  
- If the context provides enough info, give a **short, conversational, and encouraging answer**.  
- If the context is incomplete, politely say you don't have the full details and guide the student on possible next steps.  
- Do not read the retrieved context word-for-word — **paraphrase it into simple, natural speech**.  
- Keep answers focused on admissions (eligibility, process, deadlines, scholarships, courses, etc.).  

---
Student's Question (spoken):  
{user_query}

Retrieved Context:  
${ragResponse}

Spoken Answer:`;
        }
    }
    
    buildVoiceUserPrompt(query, context) {
        return query; // The system prompt already contains the template with {user_query}
    }
    
    async callGroq(systemPrompt, userPrompt) {
        if (!this.groqApiKey) {
            console.log('❌ GROQ API key not provided - using fallback response');
            throw new Error('GROQ API key not provided');
        }
        
        console.log('\n🤖 ===== GROQ LLM CALL =====');
        console.log('📝 System Prompt:');
        console.log(systemPrompt);
        console.log('\n👤 User Prompt:');
        console.log(userPrompt);
        console.log('\n⏳ Calling Groq API...');
        
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: this.maxTokens,
            temperature: this.temperature
        }, {
            headers: {
                'Authorization': `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        const llmResponse = response.data.choices[0].message.content;
        console.log('\n✅ Groq Response:');
        console.log(llmResponse);
        console.log('🤖 ===== END GROQ CALL =====\n');
        
        return llmResponse;
    }
    
    async callOpenAI(systemPrompt, userPrompt) {
        if (!this.openaiApiKey) {
            throw new Error('OpenAI API key not provided');
        }
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: this.maxTokens,
            temperature: this.temperature
        }, {
            headers: {
                'Authorization': `Bearer ${this.openaiApiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0].message.content;
    }
    
    async callAnthropic(systemPrompt, userPrompt) {
        if (!this.anthropicApiKey) {
            throw new Error('Anthropic API key not provided');
        }
        
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: this.maxTokens,
            messages: [
                { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
            ],
            temperature: this.temperature
        }, {
            headers: {
                'x-api-key': this.anthropicApiKey,
                'content-type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });
        
        return response.data.content[0].text;
    }
    
    generateFallbackResponse(query, context, language = 'en') {
        if (context.length === 0) {
            return language === 'ar' 
                ? "لم أستطع العثور على معلومات محددة حول ذلك. يرجى إعادة صياغة سؤالك أو التواصل مع الجامعة مباشرة."
                : "I couldn't find specific information about that. Please try rephrasing your question or contact the university directly.";
        }
        
        const topResult = context[0];
        const queryLower = query.toLowerCase();
        
        if (queryLower.includes('admission') || queryLower.includes('requirement')) {
            return this.formatAdmissionResponse(context);
        } else if (queryLower.includes('fee') || queryLower.includes('cost')) {
            return this.formatFeeResponse(context);
        } else if (queryLower.includes('compare')) {
            return this.formatComparisonResponse(context);
        } else {
            return `Based on the available information:\n\n${topResult.content}`;
        }
    }
    
    formatAdmissionResponse(context) {
        const admissionDocs = context.filter(doc => 
            doc.type === 'admission' || 
            doc.content.toLowerCase().includes('admission')
        ).slice(0, 3);
        
        if (admissionDocs.length === 0) return context[0].content;
        
        let response = "Here are the admission requirements:\n\n";
        admissionDocs.forEach((doc, index) => {
            const dept = doc.metadata?.department || 'Department';
            const grade = this.extractGrade(doc.content);
            response += `${index + 1}. **${dept}**: ${grade ? `Minimum grade ${grade}` : 'See details below'}\n`;
        });
        
        return response;
    }
    
    formatFeeResponse(context) {
        const feeDocs = context.filter(doc => 
            doc.type === 'fee' || 
            doc.content.toLowerCase().includes('fee')
        ).slice(0, 3);
        
        if (feeDocs.length === 0) return context[0].content;
        
        let response = "Here are the tuition fees:\n\n";
        feeDocs.forEach((doc, index) => {
            const dept = doc.metadata?.department || 'Department';
            const fee = this.extractFee(doc.content);
            response += `${index + 1}. **${dept}**: ${fee || 'Contact university'}\n`;
        });
        
        return response;
    }
    
    formatComparisonResponse(context) {
        if (context.length < 2) return context[0]?.content || "Not enough information for comparison.";
        
        let response = "Here's a comparison:\n\n";
        context.slice(0, 2).forEach((doc, index) => {
            const dept = doc.metadata?.department || `Option ${index + 1}`;
            const grade = this.extractGrade(doc.content);
            const fee = this.extractFee(doc.content);
            
            response += `**${dept}**:\n`;
            response += `- Requirements: ${grade || 'Contact university'}\n`;
            response += `- Fees: ${fee || 'Contact university'}\n\n`;
        });
        
        return response;
    }
    
    extractGrade(text) {
        const gradeMatch = text.match(/(\d+\.?\d*)\s*%/);
        return gradeMatch ? gradeMatch[1] + '%' : null;
    }
    
    extractFee(text) {
        const feeMatch = text.match(/(\d{1,3}(,\d{3})*)\s*(IQD|USD|\$)/);
        return feeMatch ? feeMatch[0] : null;
    }
}

class AdvancedConversationMemory {
    constructor(maxHistory = 20, maxTokens = 8000) {
        this.maxHistory = maxHistory;
        this.maxTokens = maxTokens;
        this.history = [];
        this.contextCache = new Map();
    }
    
    addExchange(userMessage, botResponse, retrievedContext = []) {
        const exchange = {
            timestamp: new Date().toISOString(),
            user: userMessage,
            assistant: botResponse,
            context: retrievedContext.map(ctx => ({
                content: ctx.content.substring(0, 150) + '...',
                score: ctx.score,
                type: ctx.type
            })),
            tokens: this.estimateTokens(userMessage + botResponse),
            keywords: AdvancedTokenizer.extractKeywords(userMessage + ' ' + botResponse, 10)
        };
        
        this.history.push(exchange);
        
        // Maintain history size
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
        
        // Update context cache
        const cacheKey = this.generateCacheKey(userMessage);
        this.contextCache.set(cacheKey, {
            response: botResponse,
            context: retrievedContext,
            timestamp: exchange.timestamp
        });
    }
    
    getRelevantHistory(currentQuery, maxExchanges = 5) {
        const queryKeywords = new Set(AdvancedTokenizer.tokenize(currentQuery));
        
        return this.history
            .map(exchange => {
                const exchangeKeywords = new Set(exchange.keywords.map(k => k.word));
                const relevance = this.calculateRelevance(queryKeywords, exchangeKeywords);
                
                return { ...exchange, relevance };
            })
            .filter(exchange => exchange.relevance > 0.1)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, maxExchanges);
    }
    
    calculateRelevance(queryKeywords, exchangeKeywords) {
        const intersection = new Set([...queryKeywords].filter(x => exchangeKeywords.has(x)));
        const union = new Set([...queryKeywords, ...exchangeKeywords]);
        
        if (union.size === 0) return 0;
        return intersection.size / union.size;
    }
    
    getConversationSummary() {
        if (this.history.length === 0) return '';
        
        const recentExchanges = this.history.slice(-3);
        return recentExchanges
            .map(exchange => `User: ${exchange.user}\nAssistant: ${exchange.assistant}`)
            .join('\n\n');
    }
    
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    
    generateCacheKey(query) {
        return AdvancedTokenizer.tokenize(query).slice(0, 5).join('_');
    }
    
    getCachedResponse(query) {
        const cacheKey = this.generateCacheKey(query);
        const cached = this.contextCache.get(cacheKey);
        
        if (cached) {
            const ageMinutes = (Date.now() - new Date(cached.timestamp)) / (1000 * 60);
            if (ageMinutes < 30) { // Cache valid for 30 minutes
                return cached;
            }
        }
        
        return null;
    }
    
    clear() {
        this.history = [];
        this.contextCache.clear();
    }
    
    getStats() {
        const totalTokens = this.history.reduce((sum, h) => sum + (h.tokens || 0), 0);
        return {
            totalExchanges: this.history.length,
            totalTokens,
            cacheSize: this.contextCache.size,
            oldestExchange: this.history[0]?.timestamp,
            newestExchange: this.history[this.history.length - 1]?.timestamp
        };
    }
}

class EnhancedNodeRAGSystem {
    constructor(options = {}) {
        // Model configuration
        this.modelName = options.modelName || 'Xenova/all-MiniLM-L6-v2';
        this.maxResults = options.maxResults || 5;
        this.enableReranking = options.enableReranking !== false;
        this.enableLLM = options.enableLLM !== false;
        this.enableAdvancedMemory = options.enableAdvancedMemory !== false;
        
        // Initialize components
        this.embedder = null;
        this.documents = [];
        this.embeddings = [];
        this.tfidfVectorizer = new natural.TfIdf();
        
        // Advanced features
        this.llm = new LLMIntegrator(options.llmConfig || {});
        this.sessionMemories = new Map();
        
        // Performance tracking
        this.isInitialized = false;
        this.initTime = 0;
        this.stats = {
            totalQueries: 0,
            avgQueryTime: 0,
            cacheHits: 0,
            llmCalls: 0
        };
        
        console.log('Enhanced NodeRAG System initialized with advanced capabilities');
    }
    
    async initialize() {
        const startTime = Date.now();
        console.log('Loading advanced embedding model...');
        
        try {
            // Dynamic import for ES modules
            if (!pipeline || !env) {
                const transformers = await import('@xenova/transformers');
                pipeline = transformers.pipeline;
                env = transformers.env;
                
                // Allow remote models
                env.allowRemoteModels = true;
                env.allowLocalModels = true;
            }
            
            // Docker-specific configuration for ONNX Runtime
            const modelConfig = {
                quantized: true,
                local_files_only: false,
                cache_dir: './models',
                // Docker-specific optimizations
                device: 'cpu',
                dtype: 'float32'
            };
            
            // Add environment-specific settings
            if (process.env.NODE_ENV === 'production') {
                modelConfig.progress_callback = null; // Disable progress in production
            }
            
            this.embedder = await pipeline('feature-extraction', this.modelName, modelConfig);
            
            this.initTime = Date.now() - startTime;
            this.isInitialized = true;
            console.log(`Advanced model loaded in ${this.initTime}ms`);
            
        } catch (error) {
            console.error('Failed to load model:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // In Docker/production, try to continue with fallback
            if (process.env.NODE_ENV === 'production') {
                console.log('⚠️ Using fallback mode due to model loading failure');
                this.isInitialized = false;
                return;
            }
            
            throw error;
        }
    }
    
    async loadKnowledgeBase(dataFile = 'data.json') {
        console.log('Loading and processing knowledge base...');
        const startTime = Date.now();
        
        try {
            const rawData = await fs.readJson(dataFile);
            await this.processUniversityDataAdvanced(rawData);
            
            await this.buildAdvancedIndices();
            
            const loadTime = Date.now() - startTime;
            console.log(`Enhanced knowledge base loaded in ${loadTime}ms`);
            console.log(`Total documents: ${this.documents.length}`);
            
        } catch (error) {
            console.error('Failed to load knowledge base:', error);
            throw error;
        }
    }
    
    async processUniversityDataAdvanced(data) {
        this.documents = [];
        
        const departments = data.departments;
        if (departments) {
            const deptArray = Array.isArray(departments) ? departments : 
                Object.entries(departments).map(([key, value]) => ({
                    id: key.toLowerCase(),
                    name_en: key,
                    ...value
                }));
            
            for (const dept of deptArray) {
                // Enhanced document processing with chunking and metadata
                const baseDoc = {
                    id: `dept_${dept.id}`,
                    content: this.formatDepartmentInfo(dept),
                    type: 'department',
                    metadata: {
                        department: dept.name_en,
                        department_ar: dept.name_ar,
                        admission_grade: dept.minimum_grade,
                        tuition_fee: dept.tuition_fee,
                        college: dept.college || 'SOA University',
                        shift: dept.shift
                    }
                };
                
                // Process document with advanced features
                const enhancedDoc = DocumentProcessor.enhanceDocument(baseDoc);
                this.documents.push(enhancedDoc);
                
                // Create specialized documents
                if (dept.minimum_grade || dept.admission_channels) {
                    const admissionDoc = DocumentProcessor.enhanceDocument({
                        id: `admission_${dept.id}`,
                        content: this.formatAdmissionInfo(dept),
                        type: 'admission',
                        metadata: {
                            department: dept.name_en,
                            department_ar: dept.name_ar,
                            minimum_grade: dept.minimum_grade
                        }
                    });
                    this.documents.push(admissionDoc);
                }
                
                if (dept.tuition_fee) {
                    const feeDoc = DocumentProcessor.enhanceDocument({
                        id: `fee_${dept.id}`,
                        content: this.formatFeeInfo(dept),
                        type: 'fee',
                        metadata: {
                            department: dept.name_en,
                            department_ar: dept.name_ar,
                            tuition_fee: dept.tuition_fee
                        }
                    });
                    this.documents.push(feeDoc);
                }
            }
        }
        
        console.log(`Processed ${this.documents.length} enhanced documents`);
    }
    
    formatDepartmentInfo(dept) {
        const minGrade = typeof dept.minimum_grade === 'object' ? 
            Object.values(dept.minimum_grade)[0] : dept.minimum_grade;
        const fee = typeof dept.tuition_fee === 'object' ? 
            Object.values(dept.tuition_fee)[0] : dept.tuition_fee;
        
        // Handle shift field - it can be string or array
        const shiftInfo = Array.isArray(dept.shift) ? dept.shift.join(', ') : dept.shift;
        const channelsInfo = Array.isArray(dept.admission_channels) ? dept.admission_channels.join(', ') : dept.admission_channels;
            
        return `${dept.name_en} Department (${dept.name_ar || dept.name_en}) offers comprehensive education in its field. ` +
               `Admission Requirements: Minimum grade ${minGrade || 'Contact university'}. ` +
               `Annual Tuition: ${fee || 'Contact university'}. ` +
               `Available shifts: ${shiftInfo || 'Morning'}. ` +
               `Admission channels: ${channelsInfo || 'General'}. ` +
               `This program provides students with theoretical knowledge and practical skills needed for professional success.`;
    }
    
    formatAdmissionInfo(dept) {
        const minGrade = typeof dept.minimum_grade === 'object' ? 
            Object.values(dept.minimum_grade)[0] : dept.minimum_grade;
        const channels = Array.isArray(dept.admission_channels) ? dept.admission_channels.join(', ') : dept.admission_channels;
        const shiftInfo = Array.isArray(dept.shift) ? dept.shift.join(', ') : dept.shift;
        
        return `Admission requirements for ${dept.name_en} (${dept.name_ar || dept.name_en}): ` +
               `Students must achieve a minimum grade of ${minGrade || 'contact university'} to be eligible for admission. ` +
               `Accepted through ${channels || 'General admission'} admission channels. ` +
               `Available study shifts: ${shiftInfo || 'Morning'}. ` +
               `Students should submit their applications according to the university calendar and meet all specified requirements.`;
    }
    
    formatFeeInfo(dept) {
        const fee = typeof dept.tuition_fee === 'object' ? 
            Object.values(dept.tuition_fee)[0] : dept.tuition_fee;
            
        return `Tuition fees for ${dept.name_en} (${dept.name_ar || dept.name_en}): ` +
               `Annual tuition is ${fee || 'available upon inquiry'} per academic year. ` +
               `This covers core curriculum, access to facilities, and basic student services. ` +
               `Additional fees may apply for laboratory work, specialized equipment, textbooks, and extracurricular activities. ` +
               `Payment plans and financial aid options may be available - contact the admissions office for details.`;
    }
    
    async buildAdvancedIndices() {
        console.log('Building advanced search indices...');
        const startTime = Date.now();
        
        // Build semantic embeddings with batching
        this.embeddings = [];
        const batchSize = 16;
        
        for (let i = 0; i < this.documents.length; i += batchSize) {
            const batch = this.documents.slice(i, i + batchSize);
            const texts = batch.map(doc => doc.content);
            
            try {
                const batchEmbeddings = await Promise.all(
                    texts.map(text => this.getEmbedding(text))
                );
                this.embeddings.push(...batchEmbeddings);
            } catch (error) {
                console.error(`Error processing batch ${i}:`, error);
                // Add fallback embeddings
                for (let j = 0; j < batch.length; j++) {
                    this.embeddings.push(new Array(384).fill(0));
                }
            }
        }
        
        // Build enhanced TF-IDF index
        this.documents.forEach(doc => {
            // Add enhanced text including keywords and metadata
            const enhancedText = [
                doc.content,
                ...(doc.keywords || []).map(k => k.word),
                doc.metadata?.department || '',
                doc.type || ''
            ].join(' ');
            
            this.tfidfVectorizer.addDocument(enhancedText);
        });
        
        const buildTime = Date.now() - startTime;
        console.log(`Advanced indices built in ${buildTime}ms`);
    }
    
    async getEmbedding(text) {
        try {
            if (!this.embedder) {
                throw new Error('Embedder not initialized');
            }
            
            const cleanText = text.substring(0, 512);
            const output = await this.embedder(cleanText, {
                pooling: 'mean',
                normalize: true
            });
            
            return Array.from(output.data);
        } catch (error) {
            console.error('Embedding error:', error);
            return new Array(384).fill(0);
        }
    }
    
    async advancedSemanticSearch(query, k = 5) {
        const startTime = Date.now();
        
        try {
            const queryEmbedding = await this.getEmbedding(query);
            
            const similarities = this.embeddings.map((docEmbedding, index) => ({
                index,
                score: this.advancedCosineSimilarity(queryEmbedding, docEmbedding),
                document: this.documents[index]
            }));
            
            let results = similarities
                .sort((a, b) => b.score - a.score)
                .slice(0, k * 2) // Get more candidates for reranking
                .map(result => ({
                    ...result,
                    searchType: 'semantic'
                }));
            
            // Apply reranking if enabled
            if (this.enableReranking) {
                results = RerankerSimulator.rerankResults(query, results, k);
            } else {
                results = results.slice(0, k);
            }
            
            const searchTime = Date.now() - startTime;
            console.log(`Advanced semantic search completed in ${searchTime}ms`);
            
            return results;
        } catch (error) {
            console.error('Advanced semantic search error:', error);
            return [];
        }
    }
    
    advancedCosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        const norm = Math.sqrt(normA) * Math.sqrt(normB);
        if (norm === 0) return 0;
        
        // Enhanced similarity with length normalization
        const similarity = dotProduct / norm;
        return Math.max(0, similarity); // Ensure non-negative
    }
    
    advancedKeywordSearch(query, k = 5) {
        const startTime = Date.now();
        
        try {
            const queryTerms = AdvancedTokenizer.tokenize(query);
            const scores = [];
            
            for (let i = 0; i < this.documents.length; i++) {
                let score = 0;
                
                // Enhanced TF-IDF with keyword boosting
                queryTerms.forEach(term => {
                    const tfidf = this.tfidfVectorizer.tfidf(term, i);
                    
                    // Boost score for exact matches in metadata
                    const doc = this.documents[i];
                    if (doc.metadata?.department?.toLowerCase().includes(term) ||
                        doc.type?.toLowerCase().includes(term)) {
                        score += tfidf * 1.5; // Metadata boost
                    } else {
                        score += tfidf;
                    }
                });
                
                if (score > 0) {
                    scores.push({
                        index: i,
                        score: score,
                        document: this.documents[i]
                    });
                }
            }
            
            const results = scores
                .sort((a, b) => b.score - a.score)
                .slice(0, k)
                .map(result => ({
                    ...result,
                    searchType: 'keyword'
                }));
            
            const searchTime = Date.now() - startTime;
            console.log(`Advanced keyword search completed in ${searchTime}ms`);
            
            return results;
        } catch (error) {
            console.error('Advanced keyword search error:', error);
            return [];
        }
    }
    
    async advancedHybridSearch(query, k = 5) {
        const [semanticResults, keywordResults] = await Promise.all([
            this.advancedSemanticSearch(query, k),
            Promise.resolve(this.advancedKeywordSearch(query, k))
        ]);
        
        // Advanced result fusion with score normalization
        const combined = new Map();
        const maxSemanticScore = Math.max(...semanticResults.map(r => r.score));
        const maxKeywordScore = Math.max(...keywordResults.map(r => r.score));
        
        // Normalize and combine semantic results
        semanticResults.forEach(result => {
            const normalizedScore = maxSemanticScore > 0 ? result.score / maxSemanticScore : 0;
            combined.set(result.document.id, {
                ...result,
                score: normalizedScore * 0.7, // Weight semantic higher
                searchType: 'hybrid',
                semanticScore: result.score,
                keywordScore: 0
            });
        });
        
        // Normalize and add keyword results
        keywordResults.forEach(result => {
            const normalizedScore = maxKeywordScore > 0 ? result.score / maxKeywordScore : 0;
            const key = result.document.id;
            
            if (combined.has(key)) {
                const existing = combined.get(key);
                combined.set(key, {
                    ...existing,
                    score: existing.score + (normalizedScore * 0.3),
                    keywordScore: result.score
                });
            } else {
                combined.set(key, {
                    ...result,
                    score: normalizedScore * 0.3,
                    searchType: 'hybrid',
                    semanticScore: 0,
                    keywordScore: result.score
                });
            }
        });
        
        // Final reranking if enabled
        let results = Array.from(combined.values())
            .sort((a, b) => b.score - a.score);
        
        if (this.enableReranking) {
            results = RerankerSimulator.rerankResults(query, results, k);
        } else {
            results = results.slice(0, k);
        }
        
        return results;
    }
    
    getSessionMemory(sessionId = 'default') {
        if (!this.enableAdvancedMemory) return null;
        
        if (!this.sessionMemories.has(sessionId)) {
            this.sessionMemories.set(sessionId, new AdvancedConversationMemory());
        }
        
        return this.sessionMemories.get(sessionId);
    }
    
    async generateAdvancedResponse(query, results, sessionId = 'default', language = 'en', isVoiceInteraction = false) {
        const startTime = Date.now();
        
        if (results.length === 0) {
            return {
                response: language === 'ar' 
                    ? "لم أستطع العثور على معلومات محددة حول ذلك. يرجى إعادة صياغة سؤالك أو التواصل مع الجامعة مباشرة."
                    : "I couldn't find specific information about that. Please try rephrasing your question or contact the university directly.",
                confidence: 0,
                generationTime: Date.now() - startTime,
                method: 'fallback'
            };
        }
        
        // Check cache first
        const memory = this.getSessionMemory(sessionId);
        if (memory) {
            const cached = memory.getCachedResponse(query);
            if (cached) {
                this.stats.cacheHits++;
                return {
                    response: cached.response,
                    confidence: 0.8,
                    generationTime: Date.now() - startTime,
                    method: 'cached'
                };
            }
        }
        
        const context = results.map(r => r.document);
        const conversationHistory = memory ? memory.getRelevantHistory(query, 5) : [];
        
        // Use explicit voice interaction flag instead of session ID detection
        const promptType = isVoiceInteraction ? 'voice' : 'default';
        
        let response;
        let method;
        
        try {
            if (this.enableLLM) {
                this.stats.llmCalls++;
                console.log(`\n🧠 LLM Generation - Session: ${sessionId}, Prompt Type: ${promptType}`);
                console.log(`📋 Query: "${query}"`);
                console.log(`📚 Context Documents: ${context.length}`);
                response = await this.llm.generateResponse(query, context, conversationHistory, language, promptType);
                method = 'llm';
                console.log(`✅ LLM Response Generated (${method})`);
            } else {
                console.log(`\n📝 Using Template Response (LLM disabled)`);
                response = this.llm.generateFallbackResponse(query, context, language);
                method = 'template';
            }
        } catch (error) {
            console.error('❌ Response generation error:', error);
            console.log(`🔄 Falling back to template response`);
            response = this.llm.generateFallbackResponse(query, context, language);
            method = 'fallback';
        }
        
        const confidence = this.calculateResponseConfidence(results, query);
        
        console.log(`\n📤 Final Response (${method}):`);
        console.log(`"${response}"`);
        console.log(`⏱️ Generation Time: ${Date.now() - startTime}ms`);
        console.log(`🎯 Confidence: ${confidence?.toFixed(3)}`);
        
        return {
            response,
            confidence,
            generationTime: Date.now() - startTime,
            method
        };
    }
    
    calculateResponseConfidence(results, query) {
        if (results.length === 0) return 0;
        
        const topScore = results[0].score;
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        const queryLength = query.length;
        
        // Multi-factor confidence calculation
        let confidence = Math.min(topScore * 2, 1.0); // Base on top score
        confidence *= Math.min(avgScore * 5, 1.0); // Boost if multiple good results
        confidence *= Math.min(queryLength / 20, 1.0); // Longer queries are more specific
        
        return Math.max(0, Math.min(1, confidence));
    }
    
    async advancedQuery(userQuery, sessionId = 'default', searchType = 'hybrid', options = {}) {
        const language = options.language || 'en';
        const isVoiceInteraction = options.isVoiceInteraction || false;
        const startTime = Date.now();
        this.stats.totalQueries++;
        
        console.log(`Processing advanced query: "${userQuery}" (Session: ${sessionId}, Voice: ${isVoiceInteraction})`);
        
        try {
            if (!this.isInitialized) {
                throw new Error('System not initialized. Call initialize() first.');
            }
            
            // Enhanced query preprocessing with conversation memory
            const memory = this.getSessionMemory(sessionId);
            let enhancedQuery = userQuery;
            
            if (memory) {
                const relevantHistory = memory.getRelevantHistory(userQuery, 3);
                if (relevantHistory.length > 0) {
                    // Build context from recent conversation
                    const contextTerms = relevantHistory
                        .slice(0, 2)
                        .map(h => h.keywords.slice(0, 2).map(k => k.word).join(' '))
                        .join(' ');
                    enhancedQuery = `${userQuery} ${contextTerms}`;
                    console.log(`Enhanced query with conversation context: ${enhancedQuery.substring(0, 100)}...`);
                }
            }
            
            // Advanced search with multiple strategies
            let results = [];
            switch (searchType) {
                case 'semantic':
                    results = await this.advancedSemanticSearch(enhancedQuery, this.maxResults);
                    break;
                case 'keyword':
                    results = this.advancedKeywordSearch(enhancedQuery, this.maxResults);
                    break;
                case 'hybrid':
                default:
                    results = await this.advancedHybridSearch(enhancedQuery, this.maxResults);
                    break;
            }
            
            // Generate advanced response with voice/text differentiation
            const responseData = await this.generateAdvancedResponse(userQuery, results, sessionId, language, isVoiceInteraction);
            
            // Update memory
            if (memory) {
                memory.addExchange(userQuery, responseData.response, results.map(r => r.document));
            }
            
            const totalTime = Date.now() - startTime;
            
            // Update stats
            this.stats.avgQueryTime = (this.stats.avgQueryTime * (this.stats.totalQueries - 1) + totalTime) / this.stats.totalQueries;
            
            return {
                query: userQuery,
                response: responseData.response,
                confidence: responseData.confidence,
                results: results.map(r => ({
                    content: r.document.content,
                    score: r.score,
                    searchType: r.searchType,
                    metadata: r.document.metadata,
                    rerankingSignals: r.rerankingSignals
                })),
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                performance: {
                    totalTime: `${totalTime}ms`,
                    generationTime: responseData.generationTime + 'ms',
                    generationMethod: responseData.method,
                    resultCount: results.length,
                    searchType: searchType,
                    cacheHit: responseData.method === 'cached'
                },
                memoryStats: memory ? memory.getStats() : null
            };
            
        } catch (error) {
            console.error('Advanced query processing error:', error);
            return {
                query: userQuery,
                response: "Sorry, I encountered an error processing your question. Please try again.",
                error: error.message,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                performance: {
                    totalTime: `${Date.now() - startTime}ms`,
                    error: true
                }
            };
        }
    }
    
    clearMemory(sessionId = 'default') {
        if (this.sessionMemories.has(sessionId)) {
            this.sessionMemories.get(sessionId).clear();
            console.log(`Cleared advanced memory for session: ${sessionId}`);
        }
    }
    
    getAdvancedStats() {
        return {
            ...this.stats,
            isInitialized: this.isInitialized,
            initTime: this.initTime,
            documentsCount: this.documents.length,
            embeddingsCount: this.embeddings.length,
            sessionCount: this.sessionMemories.size,
            features: {
                enableReranking: this.enableReranking,
                enableLLM: this.enableLLM,
                enableAdvancedMemory: this.enableAdvancedMemory
            },
            memoryStats: Array.from(this.sessionMemories.values()).map(m => m.getStats())
        };
    }
}

module.exports = { EnhancedNodeRAGSystem, LLMIntegrator, AdvancedConversationMemory };
