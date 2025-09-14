/**
 * Web Routes
 * 
 * Handles static web pages, health checks, and non-API routes.
 */

const path = require('path');
const fs = require('fs');

/**
 * Sets up web routes
 * @param {express.Application} app - Express application instance
 */
function setupWebRoutes(app) {
    // Home page
    app.get('/', (req, res) => {
        res.send(getHomePage());
    });
    
    // Health check endpoint
    app.get('/health', (req, res) => {
        const health = getHealthStatus();
        res.json(health);
    });
    
    // Departments API (for web interface)
    app.get('/departments', (req, res) => {
        try {
            const departments = getDepartmentsData();
            res.json(departments);
        } catch (error) {
            res.status(500).json({ error: 'Failed to load departments data' });
        }
    });
}

/**
 * Gets the home page HTML
 * @returns {string} HTML content
 */
function getHomePage() {
    const statusEmoji = {
        'ready': '✅',
        'not-built': '⚠️',
        'error': '❌',
        'unknown': '❓'
    };
    
    const { dataLoadStatus, soaData, ragStatus } = getSystemStatus();
    
    return `
        <html>
        <head>
            <title>SOA University WhatsApp Bot</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .status { padding: 15px; margin: 10px 0; border-radius: 8px; }
                .success { background: #d4edda; border-left: 4px solid #28a745; }
                .warning { background: #fff3cd; border-left: 4px solid #ffc107; }
                .error { background: #f8d7da; border-left: 4px solid #dc3545; }
                .info { background: #d1ecf1; border-left: 4px solid #17a2b8; }
                ul { line-height: 1.6; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎓 SOA University WhatsApp Bot</h1>
                
                <div class="status ${dataLoadStatus ? 'success' : 'error'}">
                    <strong>📊 Data Status:</strong> ${dataLoadStatus ? '✅ Loaded' : '❌ Not loaded'} 
                    (${soaData.departments?.length || 0}/16 departments)
                </div>
                
                <div class="status ${ragStatus === 'ready' ? 'success' : ragStatus === 'not-built' ? 'warning' : 'error'}">
                    <strong>🧠 RAG System:</strong> ${statusEmoji[ragStatus]} ${ragStatus.replace('-', ' ').toUpperCase()}
                    ${ragStatus === 'not-built' ? '<br><small>Run <code>npm run build-rag</code> to enable intelligent responses</small>' : ''}
                </div>
                
                <div class="status info">
                    <strong>📱 Server Status:</strong> ✅ Running on port ${process.env.PORT || 3000}
                </div>
                
                <h3>🧪 Test Your Bot</h3>
                <p>Try these commands in the web chat interface:</p>
                <ul>
                    <li><strong>"hello"</strong> - Get welcome message</li>
                    <li><strong>"departments"</strong> - See all 16 departments</li>
                    <li><strong>"What are dentistry requirements?"</strong> - Smart AI response</li>
                    <li><strong>"Compare pharmacy and dentistry fees"</strong> - Intelligent comparison</li>
                    <li><strong>"Which departments cost less than 3 million?"</strong> - Complex query</li>
                    <li><strong>"ما متطلبات الصيدلة؟"</strong> - Arabic query</li>
                </ul>
                
                <h3>📋 System Information</h3>
                <ul>
                    <li><strong>University:</strong> ${soaData.university?.name_en || 'SOA University College'}</li>
                    <li><strong>Academic Year:</strong> ${soaData.university?.academic_year || '2025-2026'}</li>
                    <li><strong>Departments Loaded:</strong> ${soaData.departments?.length || 0}/16</li>
                    <li><strong>Languages:</strong> Arabic + English</li>
                    <li><strong>Web Interface:</strong> <code>http://localhost:${process.env.PORT || 3000}</code></li>
                </ul>
                
                ${ragStatus === 'not-built' ? `
                <div class="status warning">
                    <strong>⚡ Enable RAG for Smart Responses:</strong><br>
                    1. Run: <code>npm run build-rag</code><br>
                    2. Restart: <code>npm run dev</code><br>
                    3. Add <code>GROQ_API_KEY</code> to your .env file
                </div>
                ` : ''}
                
                <div class="footer">
                    <p><strong>Quick Links:</strong></p>
                    <a href="/health" target="_blank">Health Check</a> | 
                    <a href="https://console.groq.com" target="_blank">Get Groq API Key</a> | 
                    <a href="/departments" target="_blank">Departments API</a>
                </div>
            </div>
        </body>
        </html>
    `;
}

/**
 * Gets system status information
 * @returns {Object} System status data
 */
function getSystemStatus() {
    let soaData = {};
    let dataLoadStatus = false;
    
    try {
        const dataPath = path.join(__dirname, '../../data/soa-departments.json');
        soaData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        dataLoadStatus = true;
    } catch (error) {
        dataLoadStatus = false;
    }
    
    let ragStatus = 'unknown';
    try {
        const chunksPath = path.join(__dirname, '../../data/processed-chunks.json');
        const embeddingsPath = path.join(__dirname, '../../data/embeddings.json');
        
        const chunksExist = fs.existsSync(chunksPath);
        const embeddingsExist = fs.existsSync(embeddingsPath);
        
        if (chunksExist && embeddingsExist) {
            ragStatus = 'ready';
        } else {
            ragStatus = 'not-built';
        }
    } catch (error) {
        ragStatus = 'error';
    }
    
    return { dataLoadStatus, soaData, ragStatus };
}

/**
 * Gets health status
 * @returns {Object} Health status data
 */
function getHealthStatus() {
    const { dataLoadStatus, soaData, ragStatus } = getSystemStatus();
    
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        system: {
            data_loaded: dataLoadStatus,
            departments_count: soaData.departments?.length || 0,
            rag_status: ragStatus
        },
        services: {
            groq_configured: !!process.env.GROQ_API_KEY,
            whisper_configured: !!process.env.OPENAI_API_KEY,
            xtts_configured: !!process.env.XTTS_SERVER_URL,
            deepgram_configured: !!process.env.DEEPGRAM_API_KEY
        },
        files: {
            soa_data: fs.existsSync(path.join(__dirname, '../../data/soa-departments.json')),
            processed_chunks: fs.existsSync(path.join(__dirname, '../../data/processed-chunks.json')),
            embeddings: fs.existsSync(path.join(__dirname, '../../data/embeddings.json'))
        }
    };
}

/**
 * Gets departments data
 * @returns {Object} Departments data
 */
function getDepartmentsData() {
    const { soaData } = getSystemStatus();
    
    if (!soaData.departments) {
        throw new Error('Departments data not loaded');
    }
    
    const departmentsList = soaData.departments.map(dept => ({
        id: dept.id,
        name_en: dept.name_en,
        name_ar: dept.name_ar,
        minimum_grade: dept.minimum_grade,
        tuition_fee: dept.tuition_fee,
        shift: dept.shift
    }));
    
    return {
        university: soaData.university,
        departments: departmentsList,
        total: departmentsList.length
    };
}

module.exports = { setupWebRoutes };
