#!/usr/bin/env node

/**
 * AWS Deployment Debug Script
 * 
 * This script helps debug individual services in your AWS deployment
 */

const https = require('https');
const fs = require('fs');

// Configuration
const BASE_URL = 'https://soa.resonira.com'; // Replace with your actual URL
const TIMEOUT = 10000;

console.log('🔍 AWS Deployment Debug Script');
console.log('================================\n');

// Test functions
async function testPostEndpoint(path, description, data) {
    return new Promise((resolve) => {
        console.log(`🧪 Testing: ${description}`);
        console.log(`   URL: ${BASE_URL}${path}`);
        console.log(`   Method: POST`);
        
        const postData = JSON.stringify(data);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'AWS-Debug-Script/1.0'
            },
            timeout: TIMEOUT
        };
        
        const req = https.request(`${BASE_URL}${path}`, options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
                
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log(`   ✅ SUCCESS: ${description}\n`);
                    resolve({ success: true, status: res.statusCode, data: responseData });
                } else {
                    console.log(`   ❌ FAILED: ${description}`);
                    console.log(`   Response: ${responseData.substring(0, 200)}...\n`);
                    resolve({ success: false, status: res.statusCode, data: responseData });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ ERROR: ${error.message}\n`);
            resolve({ success: false, error: error.message });
        });
        
        req.on('timeout', () => {
            console.log(`   ⏰ TIMEOUT: Request timed out after ${TIMEOUT}ms\n`);
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });
        
        req.write(postData);
        req.end();
    });
}

async function testEndpoint(path, description) {
    return new Promise((resolve) => {
        console.log(`🧪 Testing: ${description}`);
        console.log(`   URL: ${BASE_URL}${path}`);
        
        const req = https.get(`${BASE_URL}${path}`, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'AWS-Debug-Script/1.0'
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
                console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
                
                if (res.statusCode === 200) {
                    console.log(`   ✅ SUCCESS: ${description}\n`);
                    resolve({ success: true, status: res.statusCode, data });
                } else {
                    console.log(`   ❌ FAILED: ${description}`);
                    console.log(`   Response: ${data.substring(0, 200)}...\n`);
                    resolve({ success: false, status: res.statusCode, data });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ ERROR: ${error.message}\n`);
            resolve({ success: false, error: error.message });
        });
        
        req.on('timeout', () => {
            console.log(`   ⏰ TIMEOUT: Request timed out after ${TIMEOUT}ms\n`);
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });
    });
}

// Test voice module file directly
async function testVoiceModuleFile() {
    return new Promise((resolve) => {
        console.log('🧪 Testing: Voice Module File Access');
        console.log(`   URL: ${BASE_URL}/js/voice-module.js`);
        
        const req = https.get(`${BASE_URL}/js/voice-module.js`, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'AWS-Debug-Script/1.0',
                'Accept': 'application/javascript, text/javascript, */*'
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
                console.log(`   Content-Type: ${res.headers['content-type']}`);
                console.log(`   Content-Length: ${res.headers['content-length']}`);
                
                if (res.statusCode === 200) {
                    console.log(`   ✅ SUCCESS: Voice module file accessible`);
                    console.log(`   File size: ${data.length} bytes`);
                    console.log(`   First 100 chars: ${data.substring(0, 100)}...\n`);
                    resolve({ success: true, status: res.statusCode, size: data.length });
                } else {
                    console.log(`   ❌ FAILED: Voice module file not accessible`);
                    console.log(`   Response: ${data.substring(0, 200)}...\n`);
                    resolve({ success: false, status: res.statusCode, data });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ ERROR: ${error.message}\n`);
            resolve({ success: false, error: error.message });
        });
        
        req.on('timeout', () => {
            console.log(`   ⏰ TIMEOUT: Request timed out after ${TIMEOUT}ms\n`);
            req.destroy();
            resolve({ success: false, error: 'timeout' });
        });
    });
}

// Main test function
async function runTests() {
    console.log(`🌐 Testing deployment at: ${BASE_URL}\n`);
    
    const results = {
        health: await testEndpoint('/health', 'Health Check'),
        voiceConfig: await testEndpoint('/api/voice/config', 'Voice Configuration'),
        voiceModule: await testVoiceModuleFile(),
        chatEndpoint: await testPostEndpoint('/api/chat/message', 'Chat Endpoint', { message: 'test', sessionId: 'test-session' }),
        ragEndpoint: await testPostEndpoint('/api/rag/query', 'RAG Endpoint', { query: 'test query' })
    };
    
    console.log('📊 Test Results Summary');
    console.log('======================');
    
    Object.entries(results).forEach(([test, result]) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${test.padEnd(15)}: ${status}`);
    });
    
    console.log('\n🔧 Recommended Actions:');
    
    if (!results.health.success) {
        console.log('• Check if your AWS Elastic Beanstalk application is running');
        console.log('• Verify the application URL is correct');
    }
    
    if (!results.voiceConfig.success) {
        console.log('• Set GROQ_API_KEY environment variable in AWS console');
        console.log('• Check Google Cloud credentials are properly configured');
    }
    
    if (!results.voiceModule.success) {
        console.log('• Check if static file serving is working');
        console.log('• Verify the voice-module.js file exists in public/js/');
        console.log('• Check for JavaScript syntax errors in voice-module.js');
    }
    
    if (!results.ragEndpoint.success) {
        console.log('• Verify GROQ_API_KEY is set and valid');
        console.log('• Check RAG service initialization');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Set GROQ_API_KEY in AWS Elastic Beanstalk environment variables');
    console.log('2. Redeploy your application');
    console.log('3. Check AWS CloudWatch logs for detailed error messages');
    console.log('4. Test WebSocket connections separately');
}

// Run the tests
runTests().catch(console.error);
