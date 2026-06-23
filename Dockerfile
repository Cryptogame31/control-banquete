FROM node:22-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package.json package-lock.json ./

# Instalar solo las dependencias de producción
RUN npm ci --only=production

# Copiar el código fuente y activos
COPY . .

# Exponer el puerto por defecto de la aplicación
EXPOSE 8080

# Variables de entorno predeterminadas
ENV PORT=8080
ENV NODE_ENV=production
ENV USE_MOCK_DATA=true
ENV N8N_WEBHOOK_URL=https://n8nok-n8n.uah3tl.easypanel.host/webhook/095df717-d027-44e1-8cfa-f1cc57fe6bff


# Ejecutar el servidor Express
CMD ["node", "server.js"]
