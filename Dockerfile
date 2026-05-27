# Use pinned Node.js 20.19.0 base image matching the project's .nvmrc
FROM node:20.19.0

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies (git is required by Hardhat Network Helpers and other dev tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy root dependency configuration files
COPY package.json package-lock.json /app/

# Install root dependencies (including Hardhat and Solidity tools)
RUN npm ci --legacy-peer-deps

# Copy backend dependency configuration files
COPY backend/package.json backend/package-lock.json /app/backend/

# Install backend dependencies
RUN cd backend && npm ci --legacy-peer-deps

# Copy frontend dependency configuration files
COPY frontend/package.json frontend/package-lock.json /app/frontend/

# Install frontend dependencies
RUN cd frontend && npm ci --legacy-peer-deps

# Copy all application code
COPY . /app/

# Pre-compile the Solidity smart contracts to verify everything builds correctly
RUN npm run compile

# Expose ports for the backend API and the frontend client
EXPOSE 5001 3000

# Set the default command to run contract tests
CMD ["npm", "run", "test"]
