# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install system dependencies for audio processing and native modules
RUN apk add --no-cache \
    curl \
    libc6-compat \
    ffmpeg \
    python3 \
    make \
    g++ \
    gcc \
    musl-dev \
    linux-headers \
    libstdc++ \
    libgomp \
    libgcc \
    libatomic

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p temp/uploads temp/audio models

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV ONNX_DISABLE_WASM=1
ENV ONNX_DISABLE_CPU_FEATURES=1

# Expose port
EXPOSE 8080

# Health check with longer timeout for initialization
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["npm", "start"]
