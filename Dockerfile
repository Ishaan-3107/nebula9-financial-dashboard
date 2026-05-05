# Monolith image: API + WebSocket + static SPA (set CLIENT_ORIGIN to public URL)
FROM node:20-alpine AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client ./
RUN npm run build

FROM node:20-alpine AS server
WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm ci
COPY server ./
COPY --from=client-build /client/dist ./static
RUN npm run build
COPY server/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV NODE_ENV=production
ENV SERVE_STATIC=1
ENV CLIENT_DIST=/app/static
EXPOSE 4000
ENTRYPOINT ["/docker-entrypoint.sh"]
