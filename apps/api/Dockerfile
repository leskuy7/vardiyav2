FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install

FROM deps AS build
COPY . .
RUN npm run -w @vardiya/api prisma:generate
RUN npm run -w @vardiya/api build

FROM base AS runner
COPY --from=build /app /app
EXPOSE 4000
CMD ["npm", "run", "-w", "@vardiya/api", "start"]
