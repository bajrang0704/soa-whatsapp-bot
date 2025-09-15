/**
 * Server Configuration and Setup
 * 
 * This module handles the Express server setup, middleware configuration,
 * and route registration.
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const { setupMiddleware } = require('./middleware');
const { setupRoutes } = require('./routes');
const { setupSocketIO } = require('./socket');

/**
 * Creates and configures the Express server
 * @returns {http.Server} Configured HTTP server
 */
function createServer() {
    const app = express();
    const server = http.createServer(app);
    
    // Configure Socket.IO for AWS deployment
    const io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling'], // Add fallback transport
        allowEIO3: true, // For compatibility
        pingTimeout: 60000, // Increase timeout for AWS
        pingInterval: 25000, // Increase interval for AWS
        upgradeTimeout: 30000 // Increase upgrade timeout
    });
    
    // Setup middleware
    setupMiddleware(app);
    
    // Setup routes
    setupRoutes(app);
    
    // Setup Socket.IO handlers
    setupSocketIO(io);
    
    // Error handling middleware
    app.use((error, req, res, next) => {
        console.error('❌ Server Error:', error);
        res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    });
    
    // 404 handler
    app.use('*', (req, res) => {
        res.status(404).json({
            error: 'Route not found',
            message: `The route ${req.method} ${req.originalUrl} does not exist`,
            available_routes: [
                '/',
                '/health',
                '/departments',
                '/api/voice',
                '/api/chat'
            ]
        });
    });
    
    return server;
}

module.exports = { createServer };
