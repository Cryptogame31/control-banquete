# 🚀 GUÍA DE DESPLIEGUE Y AUTOMATIZACIONES (N8N)
## 🏰 Casa de Banquetes Sarahy — Sistema de Gestión Integral

Esta guía explica detalladamente cómo desplegar el sistema en un servidor VPS Ubuntu usando Docker y Nginx, y cómo construir automatizaciones bidireccionales con **N8N** para CRM, WhatsApp o notificaciones por correo.

---

## 🐋 1. DESPLIEGUE EN VPS UBUNTU CON DOCKER

### Paso 1: Conectarse al VPS e Instalar Docker
Conéctate a tu servidor Ubuntu por SSH y ejecuta los siguientes comandos para actualizar el sistema e instalar Docker y Docker Compose:

```bash
# Actualizar lista de paquetes
sudo apt update && sudo apt upgrade -y

# Instalar requisitos previos
sudo apt install -y curl apt-transport-https ca-certificates software-properties-common

# Agregar llave oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Agregar repositorio oficial de Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine y Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar que Docker esté corriendo
sudo systemctl status docker
```

### Paso 2: Subir el Proyecto y Configurar el Docker Compose
1. Crea una carpeta para la aplicación en `/var/www/sarahy/`:
   ```bash
   sudo mkdir -p /var/www/sarahy
   sudo chown -R $USER:$USER /var/www/sarahy
   cd /var/www/sarahy
   ```
2. Sube todos los archivos del proyecto (incluyendo `Dockerfile`, `docker-compose.yml`, `server.js`, carpetas `js/`, `css/`, `icons/`, etc.) a este directorio usando SFTP, Git o SCP.
3. Edita la configuración en `docker-compose.yml` para establecer tus variables de producción:
   ```bash
   nano docker-compose.yml
   ```
   *Si vas a usar Firebase real, cambia `USE_MOCK_DATA` a `false` y pega el JSON de tu cuenta de servicio en `FIREBASE_SERVICE_ACCOUNT` en una sola línea.*

### Paso 3: Iniciar la Aplicación en Docker
Levanta los contenedores en segundo plano:
```bash
docker compose up -d --build
```
Verifica que el contenedor esté corriendo correctamente:
```bash
docker compose ps
docker compose logs -f
```
La aplicación ya estará escuchando internamente en el puerto `8080` de tu servidor.

---

## 🔒 2. CONFIGURACIÓN DE PROXY REVERSO CON NGINX Y SSL (HTTPS)

### Paso 1: Instalar Nginx
```bash
sudo apt install -y nginx
```

### Paso 2: Configurar el Servidor Virtual
1. Copia o crea el archivo de configuración de Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/sarahy
   ```
2. Pega el contenido de tu plantilla [nginx.conf](file:///c:/Users/USER/Downloads/Antigravity/Banquetes%20Sarahy/nginx.conf) (reemplazando `app.tuempresa.com` con tu dominio real apuntando al VPS).
3. Habilita el sitio y recarga Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/sarahy /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Paso 3: Obtener Certificados SSL Gratuitos con Let's Encrypt
1. Instala Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
2. Solicita el certificado SSL (Certbot configurará automáticamente Nginx y renovará las claves cada 90 días):
   ```bash
   sudo certbot --nginx -d app.tuempresa.com
   ```
3. Verifica que puedas entrar de manera segura a `https://app.tuempresa.com`.

---

## 🔌 3. REFERENCIA RÁPIDA DE ENDPOINTS API REST
Tu backend Express expone los siguientes endpoints para automatizaciones o integraciones:

| Método | Endpoint | Descripción | Payload de Entrada |
|--------|----------|-------------|--------------------|
| **GET** | `/api/config` | Obtener credenciales de Firebase públicas | Ninguno |
| **GET** | `/api/settings` | Obtener variables operativas y colores | Ninguno |
| **POST** | `/api/settings` | Actualizar configuración global | Objeto Settings |
| **GET** | `/api/events` | Listar todos los eventos confirmados/realizados | Ninguno |
| **POST** | `/api/events` | Crear un nuevo evento | Objeto Evento |
| **PUT** | `/api/events/:id` | Modificar/actualizar datos o pagos de un evento | Datos a actualizar |
| **GET** | `/api/quotations` | Listar cotizaciones recibidas | Ninguno |
| **POST** | `/api/quotations` | Crear una nueva cotización | Objeto Cotización |
| **PUT** | `/api/quotations/:id` | Responder cotización o aplicar descuentos | Datos a actualizar |
| **POST** | `/api/webhooks/n8n` | Endpoint receptor de acciones de N8N | Objeto de Acción |

---

## 🤖 4. GUÍA DE CONEXIÓN Y FLUJOS CON N8N (PASO A PASO)

N8N te permite automatizar tareas complejas de Banquetes Sarahy conectando el sistema con hojas de cálculo, correo electrónico y la API de WhatsApp de manera visual.

### 🔴 FLUJO 1: Automatización de Notificaciones Salientes (Sistema ──► N8N)
*Objetivo: Recibir un mensaje de WhatsApp y correo cada vez que un cliente envía una nueva cotización, firma un contrato o realiza un abono.*

#### Paso 1: Configurar Webhook en N8N
1. Inicia sesión en tu instancia de N8N.
2. Crea un nuevo **Workflow** y agrega un nodo del tipo **Webhook**.
3. En la configuración del nodo Webhook:
   - **Method**: `POST`
   - **Path**: `sarahy-webhooks`
4. Copia la URL que te proporciona N8N (Ej: `https://n8n.tuempresa.com/webhook/sarahy-webhooks`).

#### Paso 2: Registrar Webhook en el Servidor Docker
1. En tu VPS, abre el archivo `docker-compose.yml`.
2. Busca la variable `N8N_WEBHOOK_URL` y pega la URL que copiaste de N8N:
   ```yaml
   - N8N_WEBHOOK_URL=https://n8n.tuempresa.com/webhook/sarahy-webhooks
   ```
3. Reinicia los contenedores para aplicar los cambios:
   ```bash
   docker compose down && docker compose up -d
   ```

#### Paso 3: Recibir y Procesar el Evento en N8N
1. En N8N, presiona el botón **Listen for Test Event** en el nodo Webhook.
2. Ve al cotizador público de tu aplicación o crea una cotización de prueba. El sistema enviará automáticamente este JSON a N8N:
   ```json
   {
     "event": "quotation.created",
     "timestamp": "2026-06-11T04:00:00.000Z",
     "data": {
       "id": "q_test_123",
       "clientName": "Diana Romero",
       "clientEmail": "diana@test.com",
       "clientPhone": "3159999999",
       "eventType": "boda",
       "date": "2026-12-15",
       "guests": 100,
       "totalValue": 5600000
     }
   }
   ```
3. En N8N, conecta el nodo Webhook a un nodo **Switch** para filtrar por tipo de evento (`{{ $json.event }}`):
   - Ruta 1: `quotation.created`
   - Ruta 2: `contract.signed`
   - Ruta 3: `event.updated`
4. Conecta las rutas a tus servicios favoritos:
   - Para **Email**: Agrega un nodo **Gmail** o **SendGrid** para enviar un correo de bienvenida automático al cliente Diana con los salones recomendados.
   - Para **WhatsApp**: Conecta a un nodo **Twilio** o un **HTTP Request** con una API de WhatsApp (Ej: ManyChat, Waba, Wati) enviando:
     *"Hola Diana, recibimos tu solicitud para tu boda el 2026-12-15. Un asesor de Sarahy se pondrá en contacto pronto."*

---

### 🟢 FLUJO 2: Inyección de Datos Entrantes (N8N ──► Sistema)
*Objetivo: Integrar un formulario externo (como Typeform, Tally, o un bot de chat) para crear cotizaciones en el sistema de Sarahy automáticamente.*

#### Paso 1: Capturar Datos del Formulario
1. En N8N, crea un Trigger (Ej: **Tally Trigger** o **Typeform Trigger**) para detectar nuevos envíos de tu formulario de cotización.

#### Paso 2: Mapear y Construir el Objeto de Cotización
1. Agrega un nodo **Set** en N8N para construir el JSON esperado por el backend de Sarahy.
2. Mapea las preguntas del formulario a los campos de base de datos del sistema:
   ```json
   {
     "clientName": "{{ $json.nombre_formulario }}",
     "clientEmail": "{{ $json.correo_formulario }}",
     "clientPhone": "{{ $json.telefono_formulario }}",
     "eventType": "{{ $json.tipo_evento_formulario }}",
     "date": "{{ $json.fecha_formulario }}",
     "guests": "{{ parseInt($json.invitados_formulario) }}",
     "venueId": "v_prado_colonial",
     "status": "pendiente"
   }
   ```

#### Paso 3: Enviar Datos al Servidor de Sarahy
1. Agrega un nodo **HTTP Request** en N8N.
2. Configura los parámetros:
   - **Method**: `POST`
   - **URL**: `https://app.tuempresa.com/api/webhooks/n8n`
   - **Send Body**: `true`
   - **Body Content Type**: `JSON`
   - **Body Parameters**:
     - `action`: `create_quotation`
     - `data`: `{{ $json }}` (el objeto construido en el paso anterior)
3. Ejecuta el nodo. El sistema responderá confirmando la inyección:
   ```json
   {
     "success": true,
     "message": "Cotización creada vía webhook",
     "id": "q_n8n_abc123"
   }
   ```
4. El Superadministrador verá inmediatamente la cotización creada en su panel **Cotizaciones Recibidas**, lista para aplicar descuentos y responderla en PDF.
