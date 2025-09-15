/**
 * Middleware Configuration
 * 
 * This module sets up all Express middleware including CORS, body parsing,
 * static file serving, and custom middleware.
 */

const cors = require('cors');
const express = require('express');
const path = require('path');
const multer = require('multer');

const { requestLogger } = require('./requestLogger');
const { errorHandler } = require('./errorHandler');
const { rateLimiter } = require('./rateLimiter');

/**
 * Sets up all middleware for the Express app
 * @param {express.Application} app - Express application instance
 */
function setupMiddleware(app) {
    // CORS configuration - permissive for cloud deployment
    app.use(cors({
        origin: true, // Allow all origins in production
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        credentials: true
    }));
    
    // Body parsing middleware
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json({ limit: '10mb' }));
    
    // Static file serving with error handling
    app.use('/js', (req, res, next) => {
        console.log(`📁 Serving JS file: ${req.path}`);
        next();
    });
    
    app.use(express.static(path.join(__dirname, '../../public'), {
        setHeaders: (res, path) => {
            if (path.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            }
        }
    }));
    
    // Request logging
    app.use(requestLogger);
    
    // Rate limiting
    app.use(rateLimiter);
    
    // File upload configuration
    setupFileUpload(app);
}

/**
 * Sets up file upload middleware
 * @param {express.Application} app - Express application instance
 */
function setupFileUpload(app) {
    // Disk storage for general file uploads
    const diskUpload = multer({
        dest: path.join(__dirname, '../../temp/uploads/'),
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
            files: 1
        },
        fileFilter: (req, file, cb) => {
            const allowedTypes = [
                'audio/wav', 
                'audio/webm', 
                'audio/mp4', 
                'audio/mpeg', 
                'audio/ogg'
            ];
            
            if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
                cb(null, true);
            } else {
                cb(new Error('Invalid audio file type'), false);
            }
        }
    });
    
    // Memory storage for voice processing
    const memoryUpload = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
            files: 1
        },
        fileFilter: (req, file, cb) => {
            const allowedTypes = [
                'audio/wav', 
                'audio/webm', 
                'audio/mp4', 
                'audio/mpeg', 
                'audio/ogg'
            ];
            
            if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
                cb(null, true);
            } else {
                cb(new Error('Invalid audio file type'), false);
            }
        }
    });
    
    // Make upload middlewares available globally
    app.locals.upload = diskUpload;
    app.locals.memoryUpload = memoryUpload;
}

module.exports = { setupMiddleware };
