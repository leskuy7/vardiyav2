# Root Dockerfile for Railway: builds only the API so Railway uses Docker instead of Nixpacks.
# Reduces EOF risk and gives explicit, cacheable build steps.
FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run -w @vardiya/api prisma:generate
RUN npm run -w @vardiya/api build

FROM base AS runner
COPY --from=build /app /app
WORKDIR /app
EXPOSE 4000
CMD ["npm", "run", "-w", "@vardiya/api", "start:prod"]
