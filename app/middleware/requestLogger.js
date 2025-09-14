/**
 * Request Logging Middleware
 * 
 * Logs all incoming requests with timestamp, method, URL, and response time.
 */

/**
 * Request logging middleware
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    
    // Log request
    console.log(`📥 ${req.method} ${req.url} - ${timestamp}`);
    
    // Override res.end to log response time
    const originalEnd = res.end;
    res.end = function(...args) {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusEmoji = status >= 200 && status < 300 ? '✅' : 
                           status >= 400 && status < 500 ? '⚠️' : '❌';
        
        console.log(`📤 ${statusEmoji} ${req.method} ${req.url} - ${status} (${duration}ms)`);
        
        originalEnd.apply(this, args);
    };
    
    next();
}

module.exports = { requestLogger };
