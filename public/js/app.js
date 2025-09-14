// Main Application Module
import { socketService } from './socket-service.js';
import { chatModule } from './chat-module.js';
import { voiceModule } from './voice-module.js';
import { departmentsModule } from './departments-module.js';
import { t } from './translations.js';

class App {
    constructor() {
        this.currentLanguage = 'en';
        this.currentTheme = 'light';
        this.initialize();
    }

    // Initialize the application
    initialize() {
        console.log('🚀 Initializing SOA University College App...');
        
        // Load saved preferences
        this.loadPreferences();
        
        // Initialize all modules
        this.initializeModules();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.initializeUI();
        
        console.log('✅ App initialization complete');
    }

    // Load saved preferences
    loadPreferences() {
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && savedLanguage !== this.currentLanguage) {
            this.currentLanguage = savedLanguage;
        }
        
        const savedTheme = localStorage.getItem('preferredTheme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
        }
    }

    // Initialize all modules
    initializeModules() {
        // Initialize Socket.IO
        socketService.initialize();
        
        // Set language for all modules
        chatModule.setLanguage(this.currentLanguage);
        voiceModule.setLanguage(this.currentLanguage);
        departmentsModule.setLanguage(this.currentLanguage);
        
        // Initialize speech synthesis
        if ('speechSynthesis' in window) {
            console.log('✅ Speech synthesis initialized');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Language toggle
        const languageBtn = document.getElementById('languageBtn');
        if (languageBtn) {
            languageBtn.addEventListener('click', () => this.toggleLanguage());
        }
        
        // Theme toggle
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.toggleTheme());
        }
        
        // Mobile menu
        const hamburger = document.getElementById('hamburger');
        if (hamburger) {
            hamburger.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
        
        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Initialize UI
    initializeUI() {
        // Apply language settings
        this.updateUILanguage();
        
        // Apply theme settings
        this.applyTheme();
        
        // Render departments
        departmentsModule.renderDepartments();
        departmentsModule.updateDepartmentCount();
        
        // Initialize voice button state
        this.updateVoiceButtonState('ready');
        
        // Initialize animations
        this.initAnimations();
    }

    // Toggle language
    toggleLanguage() {
        console.log('🔄 Language toggle clicked, current:', this.currentLanguage);
        this.currentLanguage = this.currentLanguage === 'en' ? 'ar' : 'en';
        console.log('🌐 New language:', this.currentLanguage);
        
        // Update document language but keep direction LTR
        document.documentElement.dir = 'ltr';
        if (this.currentLanguage === 'ar') {
            document.documentElement.lang = 'ar';
        } else {
            document.documentElement.lang = 'en';
        }
        
        // Update all modules
        chatModule.setLanguage(this.currentLanguage);
        voiceModule.setLanguage(this.currentLanguage);
        departmentsModule.setLanguage(this.currentLanguage);
        
        // Update UI
        this.updateUILanguage();
        departmentsModule.renderDepartments();
        
        // Store preference
        localStorage.setItem('preferredLanguage', this.currentLanguage);
        console.log('💾 Saved language preference:', this.currentLanguage);
    }

    // Toggle theme
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('preferredTheme', this.currentTheme);
    }

    // Apply theme
    applyTheme() {
        const themeBtn = document.getElementById('themeBtn');
        const themeIcon = themeBtn?.querySelector('i');
        
        if (this.currentTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (themeIcon) {
                themeIcon.className = 'fas fa-sun';
            }
        } else {
            document.body.classList.remove('dark-theme');
            if (themeIcon) {
                themeIcon.className = 'fas fa-moon';
            }
        }
    }

    // Update UI language
    updateUILanguage() {
        const elementsWithTranslate = document.querySelectorAll('[data-translate]');
        console.log(`🔍 Found ${elementsWithTranslate.length} elements with data-translate`);
        
        elementsWithTranslate.forEach((element, index) => {
            const key = element.getAttribute('data-translate');
            const translation = t(key, this.currentLanguage);
            
            console.log(`${index + 1}. Key: "${key}" -> "${translation}" (${element.tagName})`);
            
            // Handle special cases for elements with icons
            if (element.parentElement && element.parentElement.querySelector('i')) {
                const icon = element.parentElement.querySelector('i').outerHTML;
                if (element.tagName === 'SPAN' && element.parentElement.classList.contains('btn')) {
                    element.textContent = translation;
                } else if (element.parentElement.tagName === 'H3') {
                    element.parentElement.innerHTML = `${icon}<span data-translate="${key}">${translation}</span>`;
                } else {
                    element.textContent = translation;
                }
            } else {
                element.textContent = translation;
            }
        });
        
        // Update placeholder text for inputs
        const elementsWithPlaceholder = document.querySelectorAll('[data-translate-placeholder]');
        elementsWithPlaceholder.forEach((element) => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = t(key, this.currentLanguage);
            element.placeholder = translation;
        });
        
        console.log('✅ UI language update completed');
    }

    // Toggle mobile menu
    toggleMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.classList.toggle('active');
        }
    }

    // Close modals
    closeModals() {
        this.closeChatbot();
        this.closeVoiceAgent();
    }

    // Close chatbot
    closeChatbot() {
        const chatbotModal = document.getElementById('chatbotModal');
        if (chatbotModal) {
            chatbotModal.classList.remove('show');
        }
    }

    // Close voice agent
    closeVoiceAgent() {
        const voiceModal = document.getElementById('voiceModal');
        if (voiceModal) {
            voiceModal.classList.remove('show');
            
            // Stop voice conversation
            if (voiceModule.isConversationActive) {
                voiceModule.stopVoiceConversation();
            }
        }
    }

    // Update voice button state
    updateVoiceButtonState(state) {
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceBtnIcon = document.getElementById('voiceBtnIcon');
        
        if (!voiceBtn || !voiceBtnIcon) return;
        
        // Remove all state classes
        voiceBtn.classList.remove('ready', 'active', 'listening', 'speaking', 'processing');
        
        switch(state) {
            case 'ready':
                voiceBtn.classList.add('ready');
                voiceBtnIcon.className = 'fas fa-play';
                voiceBtn.onclick = () => voiceModule.startVoiceConversation();
                break;
            case 'active':
                voiceBtn.classList.add('active');
                voiceBtnIcon.className = 'fas fa-stop';
                voiceBtn.onclick = () => voiceModule.stopVoiceConversation();
                break;
            case 'listening':
                voiceBtn.classList.add('listening');
                voiceBtnIcon.className = 'fas fa-microphone';
                break;
            case 'speaking':
                voiceBtn.classList.add('speaking');
                voiceBtnIcon.className = 'fas fa-hand-paper';
                voiceBtn.onclick = () => voiceModule.interruptSpeaking();
                break;
            case 'processing':
                voiceBtn.classList.add('processing');
                voiceBtnIcon.className = 'fas fa-cog fa-spin';
                break;
        }
    }

    // Initialize animations
    initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.department-card, .info-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IQ', {
            style: 'currency',
            currency: 'IQD',
            minimumFractionDigits: 0
        }).format(amount);
    }

    formatPercentage(percentage) {
        return parseFloat(percentage).toFixed(1) + '%';
    }

    // Show loading animation
    showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="loading"></div>';
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Export for global access
export default App;
