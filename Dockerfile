FROM node:22-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack disable
RUN corepack enable
RUN COREPACK_INTEGRITY_KEYS=0 corepack prepare pnpm@latest --activate

RUN apt-get update -y
RUN apt-get install -y openssl

# Install the Cloud SQL Auth Proxy
ADD https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.linux.amd64 /cloud_sql_proxy
RUN chmod +x /cloud_sql_proxy

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json .
COPY pnpm-lock.yaml .
COPY tsconfig.json .
COPY svelte.config.js .
COPY vite.config.ts .

# Install dependencies
RUN pnpm install

# Copy the rest of the app files
COPY . .

# Generate Prisma Client (ensure this runs after npm install)
# Provide a placeholder DATABASE_URL for build time (real one comes from runtime env vars)
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN npx prisma generate

# Build the SvelteKit app
RUN pnpm run build

# Expose the port for Cloud Run
ENV PORT 8080
EXPOSE 8080

# Set the command to run the app
CMD /cloud_sql_proxy deep-voyage-436902-b3:us-central1:jobcamp26 --port 3306 --private-ip & pnpm run start
