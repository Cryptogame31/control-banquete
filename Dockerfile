FROM node:20-alpine

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar todo el código
COPY . .

# Puerto de la aplicación
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-80}/api/config || exit 1

# Iniciar el servidor
CMD ["node", "server-offline.js"]
