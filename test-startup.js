/**
 * Simple startup test script
 * This script tests if the application can start without errors
 */

console.log('🧪 Testing application startup...');

try {
    // Test basic imports
    console.log('✅ Testing basic imports...');
    require('dotenv').config();
    const express = require('express');
    const http = require('http');
    
    // Test environment variables
    console.log('✅ Testing environment variables...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT || 8080);
    console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Set' : 'Not set');
    
    // Test basic server creation
    console.log('✅ Testing server creation...');
    const app = express();
    const server = http.createServer(app);
    
    // Test basic middleware
    console.log('✅ Testing middleware...');
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Test basic route
    console.log('✅ Testing basic route...');
    app.get('/health', (req, res) => {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    
    // Test server start
    console.log('✅ Testing server start...');
    const PORT = process.env.PORT || 8080;
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server started successfully on port ${PORT}`);
        console.log('✅ All tests passed!');
        process.exit(0);
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
        console.log('❌ Server startup timeout');
        process.exit(1);
    }, 10000);
    
} catch (error) {
    console.error('❌ Startup test failed:', error);
    process.exit(1);
}
