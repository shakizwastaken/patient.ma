FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all app package.json files for dependency resolution
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/auth/package.json ./packages/auth/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/ ./apps/
COPY packages/ ./packages/

# Build the backend first (needed for admin imports)
WORKDIR /app/apps/backend
RUN pnpm run build

# Build the admin frontend
WORKDIR /app/apps/admin
RUN pnpm run build

# Set working directory back to admin
WORKDIR /app/apps/admin

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]