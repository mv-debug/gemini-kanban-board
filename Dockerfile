FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Install Gemini CLI
RUN npm install -g @google/gemini-cli

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server.js"]
