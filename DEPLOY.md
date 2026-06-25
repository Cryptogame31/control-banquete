# 🚀 Control Banquete — Guía de Despliegue en EasyPanel

## Requisitos previos
- Cuenta en [EasyPanel](https://easypanel.io)
- Servidor con Docker (mínimo 1 GB RAM)
- Repositorio GitHub: `Cryptogame31/control-banquete`

---

## 1. Preparar el repositorio

Asegúrate de tener estos archivos en la raíz del repositorio:

```
control-banquete/
├── server-offline.js      ← Servidor principal
├── package.json
├── Dockerfile             ← Se crea en el paso 2
├── .env.example           ← Variables de entorno
├── index.html
├── register.html
├── login.html
├── subscription.html
├── cotizar.html
├── ultraadmin.html
├── legal.html
└── js/
    ├── app.js
    ├── db.js
    ├── auth.js
    ├── config.js
    └── i18n.js
```

---

## 2. Crear el Dockerfile

Crea un archivo `Dockerfile` en la raíz del proyecto:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar todo el código
COPY . .

# Puerto de la aplicación
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/config || exit 1

# Iniciar el servidor
CMD ["node", "server-offline.js"]
```

---

## 3. Configurar EasyPanel

### 3.1 Crear nuevo proyecto

1. Entra a tu panel de EasyPanel
2. Click en **"Create Project"**
3. Nombre: `control-banquete`

### 3.2 Crear servicio

1. Dentro del proyecto, click **"Create Service"**
2. Selecciona **"App"**
3. Selecciona **"GitHub"** como fuente

### 3.3 Conectar GitHub

1. Autoriza EasyPanel para acceder a tu repositorio
2. Selecciona: `Cryptogame31/control-banquete`
3. Branch: `main`
4. Build method: **Dockerfile** (detecta automáticamente)

### 3.4 Variables de entorno

En la sección **Environment Variables** del servicio, agrega:

```env
NODE_ENV=production
PORT=8080

# JWT (CAMBIA ESTO — mínimo 32 caracteres aleatorios)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_cambiar_2026

# Prueba gratuita
TRIAL_DAYS=3

# Ultra Admin (CAMBIA ESTAS CREDENCIALES)
ULTRA_ADMIN_EMAIL=ultra@tudominio.com
ULTRA_ADMIN_PASSWORD=TuPasswordMuySeguro2026!

# Soporte
SUPPORT_EMAIL=soporte@tudominio.com
```

> ⚠️ **IMPORTANTE**: Cambia `JWT_SECRET`, `ULTRA_ADMIN_EMAIL` y `ULTRA_ADMIN_PASSWORD` antes de desplegar en producción.

### 3.5 Dominio

1. En la sección **"Domains"**, click **"Add Domain"**
2. Si tienes dominio propio: `app.tudominio.com`
3. EasyPanel configura HTTPS automáticamente con Let's Encrypt

---

## 4. Deploy automático

EasyPanel detectará cambios en `main` y desplegará automáticamente al hacer push.

Para forzar un redeploy manual:
1. Ve al servicio en EasyPanel
2. Click **"Deploy"**

---

## 5. Google Play Store — URLs importantes

Una vez desplegado, estas son las URLs que necesitas para Google Play:

| Propósito | URL |
|-----------|-----|
| App principal | `https://app.tudominio.com` |
| Registro | `https://app.tudominio.com/register.html` |
| Política de Privacidad | `https://app.tudominio.com/legal.html#privacy` |
| Términos de Servicio | `https://app.tudominio.com/legal.html#terms` |
| Cancelación | `https://app.tudominio.com/legal.html#cancellation` |
| Eliminación de datos | `https://app.tudominio.com/legal.html#data-deletion` |
| Ultra Admin | `https://app.tudominio.com/ultraadmin.html` |

---

## 6. Configurar Google Play Billing (producción)

Para que las compras reales funcionen en la app Android:

### 6.1 Crear app en Google Play Console
1. Ve a [Google Play Console](https://play.google.com/console)
2. Crea la aplicación Android
3. En **"Monetización"** → **"Productos"** → **"Suscripciones"**, crea:

| ID del producto (SKU) | Nombre | Precio |
|----------------------|--------|--------|
| `com.controlbanquete.monthly` | Plan Mensual | $10.00 USD |
| `com.controlbanquete.quarterly` | Plan Trimestral | $35.00 USD |
| `com.controlbanquete.annual` | Plan Anual | $95.00 USD |

### 6.2 Verificar tokens de compra (backend)
En producción, el endpoint `/api/subscription/activate` debe verificar el `purchaseToken` con la **Google Play Developer API**. Agrega al `.env`:

```env
GOOGLE_PLAY_PACKAGE_NAME=com.controlbanquete.app
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # JSON de cuenta de servicio
```

---

## 7. Configuración de n8n para correos

Cada SuperAdmin configura su propio webhook n8n desde el panel:

**Panel → Configuración → Webhook n8n**

### Ejemplo de flujo n8n para una nueva cotización:
```
Webhook (POST) → Switch (por tipo de evento) → Gmail/SMTP → Enviar correo al cliente
```

El backend envía este payload a cada webhook configurado:
```json
{
  "event": "new_quotation",
  "tenantId": "usr_xxx",
  "businessName": "Banquetes La Perla",
  "timestamp": "2026-06-25T12:00:00Z",
  "data": {
    "clientName": "María García",
    "eventType": "boda",
    "date": "2026-12-15",
    "guests": 200,
    "totalValue": 7200000
  }
}
```

---

## 8. Verificación post-despliegue

Ejecuta estos checks manualmente tras el primer despliegue:

- [ ] `GET /api/config` → devuelve `{"useMockData":false}`
- [ ] Registro en `/register.html` funciona
- [ ] Login en `/login.html` funciona
- [ ] Panel en `/index.html` carga correctamente
- [ ] Ultra Admin en `/ultraadmin.html` accesible
- [ ] Páginas legales en `/legal.html` disponibles
- [ ] Cotizador público en `/cotizar.html?t={tenantId}` carga

---

## 9. Notas de seguridad para producción

> [!IMPORTANT]
> En producción con datos reales, migra a una base de datos persistente (PostgreSQL):
> - Agrega `pg` o `Prisma` como ORM
> - Configura `DATABASE_URL` en variables de entorno
> - El código actual usa memoria RAM (datos se pierden al reiniciar)

> [!WARNING]
> El servidor actual (`server-offline.js`) es ideal para MVP y pruebas.
> Para producción de escala, agrega persistencia de datos real.
