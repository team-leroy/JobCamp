FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set non-interactive frontend for apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Placeholder only for prisma generate at build time; real DATABASE_URL at runtime
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"

RUN apt-get update -y
RUN apt-get install -y openssl

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json .
COPY pnpm-lock.yaml .
COPY tsconfig.json .
COPY svelte.config.js .
COPY vite.config.ts .

# Skip automatic Prisma generation during install (we do it explicitly later)
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# Install dependencies
RUN pnpm install

# Copy the rest of the app files
COPY . .

# Generate Prisma Client (ensure this runs after npm install)
RUN npx prisma generate

# Build the SvelteKit app
RUN pnpm run build

# Local file storage — mount a persistent volume at /app/uploads
# docker run ... -v /mnt/<pool>/<dataset>:/app/uploads
ENV UPLOAD_DIR=/app/uploads
RUN mkdir -p /app/uploads

# Expose the port for production (e.g. reverse proxy)
ENV PORT=8080
ENV BODY_SIZE_LIMIT=20971520
EXPOSE 8080

# Set the command to run the app (all config from runtime env)
CMD ["pnpm", "run", "start"]
