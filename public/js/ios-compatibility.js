// iOS Compatibility Module
// Handles iOS-specific issues with audio recording and WebSocket connections

export class IOSCompatibility {
    constructor() {
        this.isIOS = this.detectIOS();
        this.isSafari = this.detectSafari();
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioStream = null;
    }

    // Detect iOS devices
    detectIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    // Detect Safari browser
    detectSafari() {
        return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    }

    // Get iOS-compatible audio constraints
    getAudioConstraints() {
        if (this.isIOS) {
            return {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 1
                }
            };
        }
        return { audio: true };
    }

    // Request microphone permission with iOS-specific handling
    async requestMicrophonePermission() {
        if (!this.isIOS) {
            return true;
        }

        try {
            // For iOS, we need to request permission first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('❌ iOS microphone permission denied:', error);
            this.showIOSPermissionAlert();
            return false;
        }
    }

    // Show iOS-specific permission alert
    showIOSPermissionAlert() {
        const alert = document.createElement('div');
        alert.className = 'ios-permission-alert';
        alert.innerHTML = `
            <div class="ios-alert-content">
                <h3>🍎 iOS Microphone Permission Required</h3>
                <p>To use voice features on iOS:</p>
                <ol>
                    <li>Tap the microphone icon</li>
                    <li>Allow microphone access when prompted</li>
                    <li>If blocked, go to Settings > Safari > Microphone</li>
                </ol>
                <button onclick="this.parentElement.parentElement.remove()">Got it!</button>
            </div>
        `;
        
        // Add CSS for the alert
        const style = document.createElement('style');
        style.textContent = `
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
            }
            .ios-alert-content {
                background: white;
                padding: 20px;
                border-radius: 10px;
                max-width: 400px;
                text-align: center;
            }
            .ios-alert-content button {
                background: #007AFF;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 15px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(alert);
    }

    // Create iOS-compatible MediaRecorder
    async createMediaRecorder() {
        if (!this.isIOS) {
            return null;
        }

        try {
            const constraints = this.getAudioConstraints();
            this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // For iOS, we need to use specific MIME types
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/wav'
            ];
            
            let selectedMimeType = null;
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }
            
            if (!selectedMimeType) {
                throw new Error('No supported audio format found for iOS');
            }
            
            const options = {
                mimeType: selectedMimeType,
                audioBitsPerSecond: 128000
            };
            
            this.mediaRecorder = new MediaRecorder(this.audioStream, options);
            return this.mediaRecorder;
            
        } catch (error) {
            console.error('❌ iOS MediaRecorder creation failed:', error);
            throw error;
        }
    }

    // Handle iOS audio context issues
    async createAudioContext() {
        if (!this.isIOS) {
            return new AudioContext();
        }

        try {
            // iOS requires user interaction to create AudioContext
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            } else if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            return this.audioContext;
        } catch (error) {
            console.error('❌ iOS AudioContext creation failed:', error);
            throw error;
        }
    }

    // Play audio with iOS compatibility
    async playAudio(audioBlob) {
        if (!this.isIOS) {
            const audio = new Audio();
            audio.src = URL.createObjectURL(audioBlob);
            return audio.play();
        }

        try {
            // For iOS, we need to handle audio playback differently
            const audio = new Audio();
            audio.preload = 'auto';
            audio.controls = false;
            
            // Convert blob to data URL for iOS compatibility
            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = () => {
                    audio.src = reader.result;
                    audio.play().then(resolve).catch(reject);
                };
                reader.onerror = reject;
                reader.readAsDataURL(audioBlob);
            });
        } catch (error) {
            console.error('❌ iOS audio playback failed:', error);
            throw error;
        }
    }

    // Handle iOS WebSocket connection issues
    setupWebSocketFallback(socket) {
        if (!this.isIOS) {
            return;
        }

        // iOS Safari has issues with WebSocket connections
        socket.on('connect_error', (error) => {
            console.warn('⚠️ iOS WebSocket connection error:', error);
            
            // Try to reconnect
            setTimeout(() => {
                socket.connect();
            }, 1000);
        });

        // Handle connection drops
        socket.on('disconnect', (reason) => {
            if (reason === 'io server disconnect') {
                // Server disconnected, try to reconnect
                socket.connect();
            }
        });
    }

    // Get iOS-specific user agent info
    getIOSInfo() {
        if (!this.isIOS) {
            return null;
        }

        const userAgent = navigator.userAgent;
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent);
        const isIPod = /iPod/.test(userAgent);
        
        return {
            isIPhone,
            isIPad,
            isIPod,
            isSafari: this.isSafari,
            version: this.getIOSVersion()
        };
    }

    // Get iOS version
    getIOSVersion() {
        const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
        if (match) {
            return {
                major: parseInt(match[1]),
                minor: parseInt(match[2]),
                patch: parseInt(match[3]) || 0
            };
        }
        return null;
    }

    // Check if iOS version supports required features
    supportsRequiredFeatures() {
        if (!this.isIOS) {
            return true;
        }

        const version = this.getIOSVersion();
        if (!version) {
            return false;
        }

        // iOS 14+ required for proper WebRTC support
        return version.major >= 14;
    }

    // Show iOS compatibility warning
    showCompatibilityWarning() {
        if (!this.isIOS || this.supportsRequiredFeatures()) {
            return;
        }

        const warning = document.createElement('div');
        warning.className = 'ios-compatibility-warning';
        warning.innerHTML = `
            <div class="ios-warning-content">
                <h3>⚠️ iOS Compatibility Warning</h3>
                <p>Your iOS version may not support all voice features. Please update to iOS 14 or later for the best experience.</p>
                <button onclick="this.parentElement.parentElement.remove()">Continue Anyway</button>
            </div>
        `;
        
        document.body.appendChild(warning);
    }
}

// Export singleton instance
export const iosCompatibility = new IOSCompatibility();
