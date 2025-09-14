/**
 * Memory Service
 * 
 * Manages conversation memory and session data using local memory storage.
 */

class MemoryService {
    constructor() {
        this.sessions = new Map();
        console.log('💾 Memory Service initialized with local memory storage');
    }
    
    /**
     * Saves an exchange to memory
     * @param {string} sessionId - Session ID
     * @param {Object} exchange - Exchange data
     */
    async saveExchange(sessionId, exchange) {
        try {
            if (!this.sessions.has(sessionId)) {
                this.sessions.set(sessionId, []);
            }
            
            const history = this.sessions.get(sessionId);
            history.push(exchange);
            
            // Keep only last 100 exchanges
            if (history.length > 100) {
                history.splice(0, history.length - 100);
            }
            
            console.log(`💾 Saved exchange for session: ${sessionId}`);
            
        } catch (error) {
            console.error('❌ Error saving exchange:', error);
            throw error;
        }
    }
    
    /**
     * Gets conversation history
     * @param {string} sessionId - Session ID
     * @param {number} limit - Maximum number of exchanges
     * @returns {Array} Conversation history
     */
    async getHistory(sessionId, limit = 50) {
        try {
            const history = this.sessions.get(sessionId) || [];
            return history.slice(-limit);
            
        } catch (error) {
            console.error('❌ Error getting history:', error);
            throw error;
        }
    }
    
    /**
     * Clears conversation history
     * @param {string} sessionId - Session ID
     * @returns {boolean} Success status
     */
    async clearHistory(sessionId) {
        try {
            this.sessions.delete(sessionId);
            console.log(`🧹 Cleared history for session: ${sessionId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error clearing history:', error);
            return false;
        }
    }
    
    /**
     * Gets memory statistics
     * @returns {Object} Memory statistics
     */
    getStats() {
        return {
            totalSessions: this.sessions.size,
            activeSessions: this.sessions.size,
            memoryUsage: 'In-memory storage'
        };
    }
}

module.exports = MemoryService;
