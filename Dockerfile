# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci --production=false

# Copy source + configs
COPY src/ src/
COPY vite.renderer.config.ts .
COPY tsconfig.json .
COPY tsconfig.electron.json .
COPY postcss.config.cjs .
COPY tailwind.config.js .

# Build renderer + electron main
RUN npm run build

# Expose the port the server listens on
ENV PORT=3000
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
