# 📋 MANUAL TÉCNICO COMPLETO
# 🏰 Casa de Banquetes Sarahy — Sistema de Gestión Integral

> **Versión actual:** v16 (PostgreSQL & Express Backend)  
> **Última actualización:** Junio 2026 (Ordenamiento de Catálogo, Planes de Alimentación, Recreación y Despliegue)  
> **Repositorio:** `https://github.com/Cryptogame31/banquetes-sarahy.git`

---

## 🔑 1. CREDENCIALES DE ACCESO Y ROLES

La aplicación utiliza autenticación mediante JWT (JSON Web Tokens) basada en contraseñas cifradas con `bcryptjs` en la base de datos PostgreSQL.

### 👥 Usuarios Iniciales / Semilla (Seed)

| Rol | Correo Electrónico | Contraseña |
|-----|--------------------|------------|
| **Super Administrador** | `admin@sarahy.com` | `123456` |
| **Jefe de Compras** | `compras@sarahy.com` | `123456` |
| **Chef Principal (Cocina)** | `cocina@sarahy.com` | `123456` |
| **Coordinador de Logística** | `logistica@sarahy.com` | `123456` |
| **Cliente Demo** | `cliente@sarahy.com` | `123456` |

---

## 🏗️ 2. ARQUITECTURA DEL SISTEMA

La aplicación se estructuró originalmente como una SPA (Single Page Application) estática y posteriormente se migró a un modelo cliente-servidor robusto con Node.js, Express y PostgreSQL.

### 📂 Estructura de Directorios

```
Banquetes Sarahy/
├── index.html            ← Interfaz de usuario (SPA) y maquetación de modals
├── server.js             ← Servidor backend (Express, APIs, PDFKit, Auth, Webhooks)
├── package.json          ← Scripts de ejecución y dependencias del sistema
├── .env                  ← Variables de entorno (DATABASE_URL, JWT_SECRET, PORT)
├── prisma/
│   └── schema.prisma     ← Esquema de la base de datos (Modelos y relaciones)
├── generated-client/     ← Cliente de Prisma compilado localmente
├── css/
│   └── styles.css        ← Diseño visual (Temas dinámicos, fuentes, CSS variables)
├── js/
│   ├── config.js         ← Configuración de URLs y desactivación de simulador
│   ├── auth.js           ← Gestión de inicio de sesión, token JWT y decodificación de roles
│   ├── db.js             ← Adaptador de comunicación API (fetch a /api/*)
│   ├── seed.js           ← Configuración y valores base por defecto
│   └── app.js            ← Lógica principal del negocio (Cotizador, vistas de roles, calendar)
├── sw.js                 ← Service Worker para soporte PWA y modo sin conexión
└── manifest.json         ← Configuración de la PWA (Íconos, colores de barra)
```

### ⚙️ Stack Tecnológico
* **Frontend**: HTML5 Semántico + CSS3 (Variables, Flexbox, Grid) + JavaScript ES6+ Vanilla.
* **Backend**: Node.js + Express.js.
* **Base de Datos**: PostgreSQL + Prisma ORM para consultas y migraciones.
* **Autenticación**: JWT (JSON Web Tokens) guardados en el `localStorage` (`sarahy_token`).
* **Generación de Reportes**:
  * **PDF**: Librería `pdfkit` ejecutada en backend con diseño corporativo Slate/Gold, auto-paginación y limpieza de emojis.
  * **Excel**: Librería `xlsx` integrada en el cliente.
* **Integraciones**: Webhook saliente de cotizaciones hacia N8N (automatización de envíos de correo).

---

## 🗄️ 3. ESQUEMA DE BASE DE DATOS (PRISMA)

El esquema de base de datos se encuentra definido en `prisma/schema.prisma`. A continuación se describen los modelos principales:

### Modelo `Product` (Catálogo de Servicios y Tarifas)
* `id` (String, PK): Identificador único autogenerado.
* `category` (String): Categoría del producto (`venue`, `catering`, `photography`, `decoration`, `recreation`, `service`, `coctel`, `arroz`, `carne`, etc.).
* `name` (String): Nombre del servicio/plato.
* `description` (String, Opcional): Detalles que visualiza el cliente.
* `price` (Float): Tarifa unitaria en COP.
* `infoUrl` (String, Opcional): Enlace externo de información (Google Drive/Sitio Web).
* `active` (Boolean): Indica si está disponible.
* `allowMultiples` (Boolean): Si permite seleccionar múltiples unidades (licores, cervezas).
* `eventType` (String, Opcional): Tipos de fiesta donde aplica (delimitado por comas, ej: `boda,quinces`).
* `position` (Int): Orden de prioridad (menor número se muestra primero en el cotizador y listas).
* `ingredients`, `shoppingList`, `managementList` (Json, Opcionales): Listas de abastecimiento y tareas asociadas.

### Modelo `Quotation` (Cotizaciones)
* `id` (String, PK): Identificador con prefijo `q_`.
* `clientName`, `clientEmail`, `clientPhone` (Strings): Datos del contacto.
* `eventType` (String): Tipo de evento.
* `date` (String): Fecha del evento (YYYY-MM-DD).
* `guests` (Int): Cantidad de invitados.
* `totalValue` (Float): Presupuesto total calculado.
* `discount` (Float), `discountPercent` (Float), `discountLabel` (String): Descuentos aplicados por el administrador.
* `venueId`, `cateringId`, `photographyId`, `decorationId`, `recreationId` (Strings): Referencias a productos del catálogo.
* `menu` (Json): Selección de platos elegida por el cliente.
* `selectedServices` (Json): Arreglo de IDs de servicios adicionales y licores contratados.
* `status` (String): Estado de la cotización (`pendiente`, `respondida`, `archivada`).

### Modelo `Event` (Eventos/Fiestas Agendadas)
* Conserva una estructura idéntica a `Quotation` y añade:
  * `time` (String): Hora del evento.
  * `paidAmount` (Float): Sumatoria de los abonos recibidos.
  * `balance` (Float): Saldo restante a pagar (`totalValue - paidAmount`).
  * `payments` (Json): Historial de transacciones de abonos.
  * `schedule` (Json): Timeline y cronograma de actividades operativas.
  * `appointments` (Json): Citas y ensayos programados (ej: Degustación, Ensayo general).
  * `completedTasks` (Json): Checklist de tareas de Logística realizadas.
  * `completedPurchases` (Json): Checklist de compras de insumos para Cocina/Logística completadas.
  * `allowColorSelection` (Boolean): Habilitación para que el cliente escoja el color de mantelería.
  * `selectedColor` / `selectedColors` (Json): Selección de colores realizada por el cliente (máximo 2 cambios permitidos).
  * `colorChangeCount` (Int): Contador de cambios de opinión del cliente.
  * `photoDriveLink` (String): Enlace al Drive de fotos final del evento.
  * `photoSelectionText` (Json): Listado de fotos seleccionadas por el cliente.
  * `photoSelectionLocked` (Boolean): Bloqueo de la selección una vez enviada.
  * `photoStatus` (String): Estado de la entrega (`sin_fotografia`, `cargadas`, `seleccionadas`, `entregado`).

---

## 🔌 4. INTEGRACIONES Y WEBHOOKS (N8N)

### 📤 Webhook Saliente (Notificación de Cotización)
Cuando un cliente genera una cotización en línea, el servidor realiza un `POST` a la URL configurada en la variable `N8N_WEBHOOK_URL` enviando el payload de la cotización. Esto activa los flujos de correo de N8N.

### 📥 Webhook Entrante (`POST /api/webhooks/n8n`)
El flujo de N8N se comunica con la app para sincronizar datos utilizando la acción `create_quotation`. 
* **Lógica de Deduplicación y Reutilización Inteligente**: Para evitar que N8N inserte registros vacíos debido a la falta de mapeo de campos complejos, el backend verifica si se ha creado una cotización en los últimos **3 minutos** que comparta el mismo correo, teléfono o nombre del cliente. 
* Si se encuentra una coincidencia, el servidor **reutiliza la cotización original** y retorna su ID, evitando la pérdida de servicios adicionales y licores.

### 📄 Endpoint de PDF (`POST /api/quotations/generate-pdf`)
Genera la propuesta formal en PDF para ser enviada por correo.
* **Salvaguarda de Búsqueda Fallback**: Si N8N no envía el campo `id` en la petición, el servidor busca automáticamente la cotización más reciente del cliente de los últimos 5 minutos en PostgreSQL y la utiliza como fuente.
* **Limpieza de Caracteres**: Ejecuta la función `cleanText` para suprimir emojis (ej. 🏛️, 🎙️) y Variation Selectors (`\uFE0F`) que causan errores en las fuentes estándar de PDFKit.

---

## 💻 5. INSTALACIÓN Y EJECUCIÓN EN LOCAL

### Requisitos Previos
1. Instalar **Node.js** (v18 o superior).
2. Tener configurado el archivo `.env` en la raíz del proyecto. El archivo ya apunta a la base de datos remota de producción:
   ```env
   DATABASE_URL="postgresql://sarahyadmi:Kakaroto321%3F@72.61.11.171:5432/sarahy-db?schema=public&sslmode=disable"
   JWT_SECRET="sarahy-super-secret-key-2026"
   PORT=8080
   ```

### Pasos de Arranque
1. Abre tu terminal en el directorio del proyecto.
2. Ejecuta:
   ```bash
   npm start
   ```
   *(Esto iniciará el servidor Express en el puerto 8080 y sincronizará la base de datos PostgreSQL).*
3. Abre tu navegador y accede a:
   **`http://localhost:8080/?demo=false`**
   *(El query parameter `?demo=false` es obligatorio en el primer ingreso para desactivar el modo simulador y conectar con los endpoints reales del servidor).*

---

## 🚀 6. DESPLIEGUE EN PRODUCCIÓN (EASYPANEL)

El despliegue está automatizado con Docker a través de **Easypanel**.

### Archivos de Configuración de Despliegue
* **`Dockerfile`**: Define una imagen base de Node, copia los archivos, ejecuta `npx prisma generate` y expone el puerto `8080`.
* **`docker-compose.yml`**: Configura las variables de entorno y los volúmenes para el despliegue del contenedor.

### Pasos de Actualización
1. Realiza commits y sube los cambios al repositorio GitHub:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push origin main
   ```
2. Entra a tu panel de **Easypanel**.
3. Selecciona el servicio `banquetes-sarahy` y haz clic en **Force Redeploy**. El sistema construirá la nueva imagen de Docker y levantará la aplicación actualizada de manera inmediata.

---
*Manual Técnico generado para v16 — Casa de Banquetes Sarahy*
