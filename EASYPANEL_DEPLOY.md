# 🚀 Guía de Despliegue en Easypanel

Esta guía explica paso a paso cómo desplegar el proyecto **Control Banquete** en **Easypanel** utilizando una base de datos PostgreSQL independiente y enlazada de forma segura.

---

## Requisitos Previos

1. Tener una cuenta en **Easypanel** y un servidor VPS conectado.
2. Haber subido tu proyecto a un nuevo repositorio de GitHub (ej. `tu-usuario/control-banquete`).
3. Haber vinculado tu cuenta de GitHub con Easypanel.

---

## Paso 1: Crear un Nuevo Proyecto en Easypanel

1. Entra a tu panel de administración de Easypanel.
2. Haz clic en **Create Project** en la esquina superior derecha.
3. Asigna un nombre al proyecto (ej. `control-banquete`) y haz clic en **Create**.

---

## Paso 2: Crear el Servicio de Base de Datos PostgreSQL

Easypanel permite aprovisionar bases de datos con un solo clic.

1. Dentro de tu proyecto recién creado, haz clic en **Add Service** y selecciona **PostgreSQL**.
2. Easypanel le dará un nombre por defecto (generalmente `postgres`). Puedes cambiarlo o dejarlo así.
3. Haz clic en **Create**.
4. Easypanel levantará un contenedor de PostgreSQL y generará credenciales aleatorias seguras automáticamente.

---

## Paso 3: Crear el Servicio de la Aplicación (App)

1. En el mismo proyecto, haz clic en **Add Service** y selecciona **App**.
2. Configura los detalles del repositorio de GitHub:
   - **Source**: Selecciona **GitHub**.
   - **Repository**: Selecciona tu repositorio `control-banquete`.
   - **Branch**: Selecciona `main` (o la rama principal de tu proyecto).
3. Haz clic en **Create**.

---

## Paso 4: Configurar Variables de Entorno y Enlace de Base de Datos

Para que la aplicación se conecte de forma segura a la base de datos PostgreSQL que creamos en el Paso 2:

1. Ve a la pestaña **Environment** (o *Env Variables*) de tu servicio de **App**.
2. Agrega las siguientes variables:
   - **`PORT`**: `8080` (el puerto interno que expone la app).
   - **`JWT_SECRET`**: `un-secreto-muy-seguro-aqui` (una cadena aleatoria larga para firmar tokens de inicio de sesión).
   - **`DATABASE_URL`**: `${postgres.connectionString}`
     > [!IMPORTANT]
     > Reemplaza `postgres` por el nombre exacto de tu servicio de base de datos de Easypanel si le pusiste otro nombre en el Paso 2. 
     > Easypanel inyectará la cadena de conexión interna en tiempo de ejecución de manera automática y segura.
   - **`NODE_ENV`**: `production`
   - **`USE_MOCK_DATA`**: `false` (desactiva el simulador para usar la base de datos real).
3. Haz clic en **Save** para guardar las variables.

---

## Paso 5: Configurar Puertos y Dominio

1. Ve a la pestaña **Domains** de tu servicio de **App**.
2. Configura tu dominio o subdominio (ej: `app.tudominio.com` o usa el dominio gratuito provisto por Easypanel).
3. Asegúrate de que el **Container Port** esté configurado en `8080`.
4. Easypanel se encargará de configurar el proxy reverso Nginx y solicitar el certificado SSL (HTTPS) de forma automática con Let's Encrypt.

---

## Paso 6: Configurar el Comando de Inicio (Opcional pero Recomendado)

Dado que es una base de datos nueva y limpia, necesitamos que el esquema Prisma se aplique en el primer arranque.

1. En tu servicio de **App**, ve a **Build** o **General**.
2. En el apartado **Start Command**, cámbialo a:
   ```bash
   npx prisma db push && node server.js
   ```
   *Esto garantiza que en cada despliegue, Prisma verifique si hay cambios en el esquema y cree/actualice las tablas de la base de datos de forma automática.*

---

## Paso 7: Desplegar la Aplicación

1. Ve a la pestaña **General** de tu servicio de **App**.
2. Haz clic en **Deploy**.
3. Nixpacks detectará que es un proyecto Node.js, leerá el archivo `nixpacks.toml` para instalar `openssl` (requerido para Prisma en Linux) e instalará las dependencias.
4. Una vez compilado, el servidor Express se iniciará. En el primer arranque, detectará que la base de datos está vacía y ejecutará la siembra (`initializeDatabase` en `server.js`) creando los usuarios semilla con los nuevos correos `@controlbanquete.com`.

¡Tu aplicación ya estará en vivo y lista para usar!
