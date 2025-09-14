/**
 * Services Initialization
 * 
 * Initializes all application services and dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Initializes all application services
 */
async function initializeServices() {
    try {
        console.log('🔧 Initializing services...');
        
        // Check data files
        await checkDataFiles();
        
        // Initialize external services
        await initializeExternalServices();
        
        // Initialize core services
        await initializeCoreServices();
        
        console.log('✅ All services initialized successfully');
        
    } catch (error) {
        console.error('❌ Service initialization failed:', error);
        throw error;
    }
}

/**
 * Checks required data files
 */
async function checkDataFiles() {
    console.log('📁 Checking data files...');
    
    const dataPath = path.join(__dirname, '../data/soa-departments.json');
    
    if (!fs.existsSync(dataPath)) {
        console.warn('⚠️ SOA departments data file not found');
        console.log('📝 Please create /data/soa-departments.json file');
    } else {
        console.log('✅ SOA departments data file found');
    }
}

/**
 * Initializes external services
 */
async function initializeExternalServices() {
    console.log('🌐 Initializing external services...');
    
    // Check environment variables
    const services = {
        'DEEPGRAM_API_KEY': 'Deepgram STT/TTS',
        'GROQ_API_KEY': 'Groq LLM',
        'OPENAI_API_KEY': 'OpenAI LLM',
        'XTTS_SERVER_URL': 'XTTS Server'
    };
    
    for (const [key, service] of Object.entries(services)) {
        if (process.env[key]) {
            console.log(`✅ ${service} configured`);
        } else {
            console.log(`⚠️ ${service} not configured (${key} missing)`);
        }
    }
}

/**
 * Initializes core services
 */
async function initializeCoreServices() {
    console.log('🧠 Initializing core services...');
    
    // Initialize Enhanced RAG Service
    try {
        const EnhancedRagService = require('../core/university/enhancedRagService');
        await EnhancedRagService.initialize();
        console.log('✅ Enhanced RAG Service initialized');
    } catch (error) {
        console.warn('⚠️ Enhanced RAG Service initialization failed:', error.message);
        console.log('📚 Using fallback RAG service');
    }
    
    console.log('✅ Core services ready');
}

module.exports = { initializeServices };
