FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm install

FROM deps AS build
COPY . .
RUN npm run -w @vardiya/web build

FROM base AS runner
COPY --from=build /app /app
EXPOSE 3000
CMD ["npm", "run", "-w", "@vardiya/web", "start"]
