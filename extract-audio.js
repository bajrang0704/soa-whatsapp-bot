const fs = require('fs');

/**
 * Extract first N seconds from a WAV file
 * This properly handles WAV file headers and sample rates
 */
function extractWavSegment(inputFile, outputFile, durationSeconds) {
    console.log(`🎵 Extracting first ${durationSeconds} seconds from ${inputFile}...`);
    
    try {
        const buffer = fs.readFileSync(inputFile);
        console.log(`📁 Input file size: ${buffer.length} bytes`);
        
        // Parse WAV header
        const header = parseWavHeader(buffer);
        console.log(`📊 WAV Info:`, header);
        
        // Calculate bytes for the specified duration
        const bytesPerSecond = header.sampleRate * header.channels * (header.bitsPerSample / 8);
        const maxDataBytes = Math.floor(bytesPerSecond * durationSeconds);
        const maxTotalBytes = header.dataOffset + maxDataBytes;
        
        // Ensure we don't exceed file size
        const actualBytes = Math.min(maxTotalBytes, buffer.length);
        const actualDataBytes = actualBytes - header.dataOffset;
        
        console.log(`📏 Extracting ${actualDataBytes} data bytes (${(actualDataBytes / bytesPerSecond).toFixed(2)} seconds)`);
        
        // Extract the segment
        const extractedBuffer = buffer.slice(0, actualBytes);
        
        // Update the file size in the header
        extractedBuffer.writeUInt32LE(actualBytes - 8, 4); // File size
        extractedBuffer.writeUInt32LE(actualDataBytes, header.dataOffset - 4); // Data chunk size
        
        // Write the extracted file
        fs.writeFileSync(outputFile, extractedBuffer);
        console.log(`✅ Extracted ${extractedBuffer.length} bytes to ${outputFile}`);
        
        return {
            success: true,
            inputSize: buffer.length,
            outputSize: extractedBuffer.length,
            duration: actualDataBytes / bytesPerSecond,
            header: header
        };
        
    } catch (error) {
        console.error(`❌ Error extracting audio: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Parse WAV file header to get audio properties
 */
function parseWavHeader(buffer) {
    // Check for RIFF header
    const riff = buffer.toString('ascii', 0, 4);
    if (riff !== 'RIFF') {
        throw new Error('Not a valid WAV file (missing RIFF header)');
    }
    
    // Check for WAVE format
    const wave = buffer.toString('ascii', 8, 12);
    if (wave !== 'WAVE') {
        throw new Error('Not a valid WAV file (missing WAVE format)');
    }
    
    // Find fmt chunk
    let fmtOffset = 12;
    while (fmtOffset < buffer.length - 8) {
        const chunkId = buffer.toString('ascii', fmtOffset, fmtOffset + 4);
        const chunkSize = buffer.readUInt32LE(fmtOffset + 4);
        
        if (chunkId === 'fmt ') {
            // Parse fmt chunk
            const audioFormat = buffer.readUInt16LE(fmtOffset + 8);
            const channels = buffer.readUInt16LE(fmtOffset + 10);
            const sampleRate = buffer.readUInt32LE(fmtOffset + 12);
            const bitsPerSample = buffer.readUInt16LE(fmtOffset + 22);
            
            return {
                audioFormat,
                channels,
                sampleRate,
                bitsPerSample,
                dataOffset: findDataChunk(buffer)
            };
        }
        
        fmtOffset += 8 + chunkSize;
    }
    
    throw new Error('Could not find fmt chunk in WAV file');
}

/**
 * Find the data chunk offset
 */
function findDataChunk(buffer) {
    let offset = 12;
    while (offset < buffer.length - 8) {
        const chunkId = buffer.toString('ascii', offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        
        if (chunkId === 'data') {
            return offset + 8;
        }
        
        offset += 8 + chunkSize;
    }
    
    throw new Error('Could not find data chunk in WAV file');
}

// Export for use in other scripts
module.exports = { extractWavSegment, parseWavHeader };

// If run directly, extract first 10 seconds
if (require.main === module) {
    const inputFile = process.argv[2] || 'download.wav';
    const outputFile = process.argv[3] || 'extracted.wav';
    const duration = parseInt(process.argv[4]) || 10;
    
    const result = extractWavSegment(inputFile, outputFile, duration);
    if (result.success) {
        console.log(`\n🎉 Extraction successful!`);
        console.log(`📊 Summary:`);
        console.log(`   - Input: ${inputFile} (${result.inputSize} bytes)`);
        console.log(`   - Output: ${outputFile} (${result.outputSize} bytes)`);
        console.log(`   - Duration: ${result.duration.toFixed(2)} seconds`);
        console.log(`   - Sample Rate: ${result.header.sampleRate} Hz`);
        console.log(`   - Channels: ${result.header.channels}`);
        console.log(`   - Bits per Sample: ${result.header.bitsPerSample}`);
    } else {
        console.error(`❌ Extraction failed: ${result.error}`);
        process.exit(1);
    }
}
