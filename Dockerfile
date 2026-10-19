FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 TRUST_PROXY=1
# data/ (catalog, users, backups, audit log) and assets/images/uploads must live on a persistent volume
VOLUME ["/app/data", "/app/assets/images/uploads"]
EXPOSE 3000
USER node
CMD ["node", "server.js"]
