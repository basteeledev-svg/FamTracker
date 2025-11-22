FROM node:18-alpine

WORKDIR /app

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (will rebuild native modules for Alpine Linux)
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose ports
EXPOSE 3000 3001

# Start server
CMD ["npm", "start"]
