FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV NODE_ENV=development

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json vitest.config.ts eslint.config.js ./
COPY src ./src
COPY scripts ./scripts
COPY tests ./tests
COPY migrations ./migrations

RUN npm run build \
  && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/migrations ./migrations

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "start"]
