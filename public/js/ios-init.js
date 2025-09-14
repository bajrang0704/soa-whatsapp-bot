// iOS Initialization Script
// This script runs immediately to detect iOS and show compatibility warnings

(function() {
    'use strict';
    
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
        console.log('🍎 iOS device detected');
        
        // Add iOS-specific meta tags
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
        
        // Add iOS-specific CSS
        const iosStyles = document.createElement('style');
        iosStyles.textContent = `
            /* iOS-specific styles */
            body {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -webkit-tap-highlight-color: transparent;
                -webkit-overflow-scrolling: touch;
            }
            
            /* Fix iOS input zoom */
            input, textarea, select {
                font-size: 16px !important;
            }
            
            /* iOS safe area support */
            .navbar {
                padding-top: env(safe-area-inset-top);
            }
            
            /* iOS button fixes */
            button, .btn {
                -webkit-appearance: none;
                border-radius: 0;
            }
            
            /* iOS audio controls */
            audio {
                -webkit-playsinline: true;
                playsinline: true;
            }
            
            /* iOS voice button specific */
            .voice-btn {
                -webkit-tap-highlight-color: rgba(0,0,0,0.1);
                touch-action: manipulation;
            }
            
            /* iOS permission alert styles */
            .ios-permission-alert {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            }
            
            .ios-alert-content {
                background: white;
                padding: 20px;
                border-radius: 10px;
                max-width: 400px;
                text-align: center;
                margin: 20px;
            }
            
            .ios-alert-content h3 {
                color: #007AFF;
                margin-bottom: 15px;
            }
            
            .ios-alert-content ol {
                text-align: left;
                margin: 15px 0;
            }
            
            .ios-alert-content button {
                background: #007AFF;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 15px;
            }
        `;
        document.head.appendChild(iosStyles);
        
        // Add iOS-specific event listeners
        document.addEventListener('DOMContentLoaded', function() {
            // Prevent iOS zoom on double tap
            let lastTouchEnd = 0;
            document.addEventListener('touchend', function(event) {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                    event.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
            
            // Handle iOS orientation changes
            window.addEventListener('orientationchange', function() {
                setTimeout(function() {
                    window.scrollTo(0, 0);
                }, 100);
            });
            
            // iOS-specific voice button handling
            const voiceBtn = document.querySelector('.voice-btn');
            if (voiceBtn) {
                voiceBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    this.style.transform = 'scale(0.95)';
                });
                
                voiceBtn.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    this.style.transform = 'scale(1)';
                });
            }
        });
        
        // Show iOS compatibility info in console
        console.log('🍎 iOS Compatibility Features Enabled:');
        console.log('- WebSocket fallback to polling');
        console.log('- iOS-specific audio constraints');
        console.log('- Touch event optimizations');
        console.log('- Safe area support');
        console.log('- Input zoom prevention');
    }
})();
