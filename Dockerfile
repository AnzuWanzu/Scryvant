FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY backend/package*.json backend/
RUN npm ci --prefix backend
COPY frontend/package*.json frontend/
RUN npm ci --prefix frontend
COPY backend backend
COPY frontend frontend
RUN npm run build --prefix backend && npm run build --prefix frontend

FROM node:24-bookworm-slim AS runtime
WORKDIR /app/backend
COPY --chown=node:node backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node --from=build /app/backend/dist ./dist
COPY --chown=node:node --from=build /app/frontend/dist /app/frontend/dist
ENV NODE_ENV=production PORT=5000 FRONTEND_DIST=/app/frontend/dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
