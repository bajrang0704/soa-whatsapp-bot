// Chat Module
import { socketService } from './socket-service.js';
import { t } from './translations.js';

export class ChatModule {
    constructor() {
        this.currentLanguage = 'en';
        this.setupEventListeners();
    }

    // Set current language
    setLanguage(language) {
        this.currentLanguage = language;
    }

    // Setup event listeners
    setupEventListeners() {
        // Chat input
        const sendBtn = document.getElementById('sendBtn');
        const chatInput = document.getElementById('chatInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
    }

    // Send chat message
    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            console.log(`🗣️ Sending message: "${message}"`);
            
            // Add user message immediately
            this.addChatMessage(message, 'user');
            console.log('✅ User message added to chat');
            input.value = '';
            
            // Send to server via Socket.IO if connected
            if (socketService.getConnectionStatus()) {
                console.log('💬 Sending message via Socket.IO:', message);
                
                // Show typing indicator
                socketService.showTypingIndicator();
                
                // Send message to server
                const sent = socketService.sendMessage(message, this.currentLanguage);
                
                if (sent) {
                    console.log('📤 Message sent to server');
                    
                    // Listen for response
                    const responseHandler = (response) => {
                        console.log('📨 Received response from server:', response);
                        console.log('📨 Response message length:', response.response?.length);
                        console.log('📨 Response message preview:', response.response?.substring(0, 100));
                        socketService.hideTypingIndicator();
                        
                        // Add bot response
                        if (response.response) {
                            this.addChatMessage(response.response, 'bot');
                            console.log('✅ Bot message added to chat');
                        } else {
                            console.error('❌ No response in server response');
                        }
                        
                        // Remove listener after use
                        socketService.off('message-response', responseHandler);
                    };
                    
                    socketService.onMessageResponse(responseHandler);
                    
                    // Handle errors
                    const errorHandler = (error) => {
                        console.error('❌ Server error, using fallback response');
                        socketService.hideTypingIndicator();
                        const fallbackResponse = this.generateChatResponse(message);
                        this.addChatMessage(fallbackResponse, 'bot');
                        
                        // Remove listener after use
                        socketService.off('error', errorHandler);
                    };
                    
                    socketService.onError(errorHandler);
                    
                } else {
                    console.error('❌ Failed to send message via Socket.IO');
                    this.handleSendError(message);
                }
                
            } else {
                // Fallback to local response if no socket connection
                console.log('🔌 No socket connection, using local response');
                setTimeout(() => {
                    const response = this.generateChatResponse(message);
                    this.addChatMessage(response, 'bot');
                }, 1000);
            }
        }
    }

    // Handle send error
    handleSendError(message) {
        socketService.hideTypingIndicator();
        const fallbackResponse = this.generateChatResponse(message);
        this.addChatMessage(fallbackResponse, 'bot');
    }

    // Add chat message to UI
    addChatMessage(message, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message force-ltr-message`;
        
        // Force LTR styling with maximum specificity
        messageDiv.style.cssText = `
            direction: ltr !important;
            text-align: left !important;
            justify-content: flex-start !important;
        `;
        
        const avatar = sender === 'bot' ? 'fas fa-robot' : 'fas fa-user';
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Format the message content properly
        const formattedMessage = this.formatMessageContent(message);
        
        // Use CSS classes for proper styling with better bidirectional text support
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="${avatar}"></i>
            </div>
            <div class="message-content" style="text-align: left !important; direction: ltr !important; unicode-bidi: embed;">
                <div class="message-text" style="text-align: left !important; direction: ltr !important; unicode-bidi: normal !important; word-wrap: break-word; font-family: Arial, sans-serif;">${formattedMessage}</div>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Format message content
    formatMessageContent(message) {
        // Handle different types of message formatting
        
        // 1. Convert line breaks to HTML
        let formattedMessage = message.replace(/\n/g, '<br>');
        
        // 2. Handle lists (bullet points)
        formattedMessage = formattedMessage.replace(/^\* (.+)$/gm, '<li>$1</li>');
        formattedMessage = formattedMessage.replace(/^• (.+)$/gm, '<li>$1</li>');
        formattedMessage = formattedMessage.replace(/^- (.+)$/gm, '<li>$1</li>');
        
        // Wrap consecutive list items in ul tags
        formattedMessage = formattedMessage.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // 3. Handle numbered lists
        formattedMessage = formattedMessage.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
        formattedMessage = formattedMessage.replace(/(<li>.*<\/li>)/gs, (match) => {
            if (!match.includes('<ul>')) {
                return '<ol>' + match + '</ol>';
            }
            return match;
        });
        
        // 4. Handle bold text
        formattedMessage = formattedMessage.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        formattedMessage = formattedMessage.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // 5. Handle department names and fees (make them stand out)
        formattedMessage = formattedMessage.replace(/([A-Za-z\s]+): (\d+[,\d]*)/g, '<span class="department-info"><strong>$1:</strong> $2</span>');
        
        // 6. Handle Arabic text formatting
        if (/[\u0600-\u06FF]/.test(message)) {
            formattedMessage = `<div class="arabic-text">${formattedMessage}</div>`;
        }
        
        return formattedMessage;
    }

    // Generate fallback chat response
    generateChatResponse(message) {
        const responses = this.currentLanguage === 'ar' ? [
            "سأكون سعيداً لمساعدتك بمعلومات حول كلية سلطان للفنون!",
            "هذا سؤال رائع حول برامجنا الأكاديمية.",
            "دعني أقدم لك أحدث المعلومات حول القبول.",
            "يمكنني مساعدتك في العثور على تفاصيل الرسوم والمتطلبات.",
            "جامعتنا تقدم برامج ممتازة في مختلف مجالات الدراسة.",
            "هل تريد معرفة المزيد عن أقسام معينة أو متطلبات القبول؟"
        ] : [
            "I'd be happy to help you with information about SOA University College!",
            "That's a great question about our academic programs.",
            "Let me provide you with the most current information about admissions.",
            "I can help you find details about tuition fees and requirements.",
            "Our university offers excellent programs in various fields of study.",
            "Would you like to know more about specific departments or admission requirements?"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Export singleton instance
export const chatModule = new ChatModule();
