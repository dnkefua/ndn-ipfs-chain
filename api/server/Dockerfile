FROM node:20-alpine AS build
WORKDIR /app
COPY api/server/package.json ./
RUN npm install --omit=dev
COPY api/server/src ./src
COPY api/openapi.yaml ./openapi.yaml

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
