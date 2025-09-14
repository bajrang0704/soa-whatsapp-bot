/**
 * Routes Configuration
 * 
 * This module sets up all application routes including API routes,
 * static routes, and health checks.
 */

const { setupApiRoutes } = require('./api');
const { setupWebRoutes } = require('./web');

/**
 * Sets up all routes for the Express app
 * @param {express.Application} app - Express application instance
 */
function setupRoutes(app) {
    // Web routes (static pages, health checks, etc.)
    setupWebRoutes(app);
    
    // API routes
    setupApiRoutes(app);
}

module.exports = { setupRoutes };
