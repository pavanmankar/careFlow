FROM node:20-alpine
RUN apk add --no-cache wget
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY workers ./workers
RUN pnpm install --frozen-lockfile=false
EXPOSE 3001
CMD ["pnpm", "start"]
