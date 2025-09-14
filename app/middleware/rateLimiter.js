/**
 * Rate Limiting Middleware
 * 
 * Simple in-memory rate limiting to prevent abuse.
 */

const rateLimitMap = new Map();

/**
 * Rate limiting middleware
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next function
 */
function rateLimiter(req, res, next) {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100; // Max requests per window
    
    // Clean up old entries
    for (const [key, data] of rateLimitMap.entries()) {
        if (now - data.firstRequest > windowMs) {
            rateLimitMap.delete(key);
        }
    }
    
    // Get or create client data
    let clientData = rateLimitMap.get(clientId);
    if (!clientData) {
        clientData = {
            firstRequest: now,
            requestCount: 0
        };
        rateLimitMap.set(clientId, clientData);
    }
    
    // Check if within window
    if (now - clientData.firstRequest > windowMs) {
        // Reset window
        clientData.firstRequest = now;
        clientData.requestCount = 0;
    }
    
    // Check rate limit
    if (clientData.requestCount >= maxRequests) {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((windowMs - (now - clientData.firstRequest)) / 1000)
        });
    }
    
    // Increment counter
    clientData.requestCount++;
    
    // Add rate limit headers
    res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - clientData.requestCount,
        'X-RateLimit-Reset': new Date(clientData.firstRequest + windowMs).toISOString()
    });
    
    next();
}

module.exports = { rateLimiter };
