/**
 * SOA University WhatsApp Bot - Main Application Entry Point
 * 
 * This is the main entry point for the SOA University WhatsApp Bot application.
 * It initializes the server, sets up middleware, and starts the application.
 */

require('dotenv').config();

const { createServer } = require('./app/server');
const { initializeServices } = require('./app/services');
const VoiceStreamService = require('./core/ai/voiceStreamService');

async function startApplication() {
    try {
        console.log('🚀 Starting SOA University WhatsApp Bot...\n');
        
        // Initialize all services
        await initializeServices();
        
        // Create and start the server
        const server = createServer();
        
        // Initialize voice streaming service
        const voiceStreamService = new VoiceStreamService(server);
        
        const PORT = process.env.PORT || 8080;
        
        // Log the port for debugging
        console.log(`🌐 Server will start on port: ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📦 Node version: ${process.version}`);
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log('✅ Server started successfully!');
            console.log(`🌐 Web Interface: http://localhost:${PORT}`);
            console.log(`🎤 Voice API: http://0.0.0.0:${PORT}/api/voice`);
            console.log(`🎙️ Voice Stream: ws://0.0.0.0:${PORT}/voice-stream`);
            console.log(`🏥 Health Check: http://0.0.0.0:${PORT}/health`);
        });
        
        // Add error handling for server startup
        server.on('error', (error) => {
            console.error('❌ Server startup error:', error);
            process.exit(1);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🔄 Received SIGTERM, shutting down gracefully...');
            server.close(() => process.exit(0));
        });
        
        process.on('SIGINT', () => {
            console.log('\n🔄 Received SIGINT, shutting down gracefully...');
            server.close(() => process.exit(0));
        });
        
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    }
}

// Start the application
startApplication();
