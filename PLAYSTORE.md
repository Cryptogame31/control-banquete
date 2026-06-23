# 📱 Guía de Adaptación y Publicación en Google Play Store (TWA)

Esta guía explica paso a paso cómo empaquetar el sistema **Control Banquete** como una aplicación móvil nativa de Android (`.aab` o `.apk`) lista para subir a **Google Play Console** usando la tecnología **Trusted Web Activity (TWA)** y la herramienta oficial de Google, **Bubblewrap**.

---

## ¿Cómo Funciona?

Dado que el sistema requiere un servidor en la nube para procesar las cotizaciones, inventarios y abonos en tiempo real, la aplicación móvil funciona cargando el servidor de producción (desplegado en Easypanel, ej: `https://app.tudominio.com`) dentro de un contenedor web ultra-rápido y optimizado. 

Gracias a la firma digital **Digital Asset Links**, la barra de navegación del navegador se oculta por completo, lo que brinda una experiencia 100% nativa.

---

## Requisitos de la PWA (Ya Implementados)

Para poder compilar con Bubblewrap, la web ya cuenta con los requisitos obligatorios de Google:
- [x] Manifiesto web válido (`manifest.json`) con íconos de 192px y 512px, color de tema y nombre.
- [x] Service Worker (`sw.js`) activo que permite soporte sin conexión y almacenamiento en caché.
- [x] Conexión segura HTTPS con certificado SSL (provisto automáticamente por Easypanel).

---

## Paso 1: Requisitos en tu Computador

Para compilar la aplicación en tu entorno local (Windows/Mac/Linux), necesitas instalar:

1. **Node.js** (v16 o superior).
2. **Java Development Kit (JDK 17)**: Requerido para compilar el proyecto de Android.
   - En Windows, puedes descargarlo de [Adoptium (Temurin)](https://adoptium.net) o usar `winget install EclipseAdoptium.Temurin.17.JDK`.
3. **Android Command Line Tools** (o Android Studio): Requerido para el SDK de Android.
   - Si no quieres instalar Android Studio completo, Bubblewrap puede descargar e instalar automáticamente los componentes necesarios del SDK de Android en su primera ejecución.

---

## Paso 2: Instalar Bubblewrap CLI

Abre una terminal (PowerShell o CMD en Windows) e instala la herramienta oficial de Google globalmente:

```bash
npm install -g @bubblewrap/cli
```

---

## Paso 3: Inicializar la Aplicación de Android

Crea una carpeta vacía en tu computador para el proyecto de Android (fuera de la carpeta del código fuente) y navega a ella en la consola:

```bash
mkdir control-banquete-android
cd control-banquete-android
```

Ejecuta el comando de inicialización apuntando al manifiesto de tu aplicación web en producción (reemplaza por tu dominio real):

```bash
bubblewrap init --manifest=https://app.tudominio.com/manifest.json
```

### Preguntas del Asistente:
Bubblewrap leerá el manifiesto web y te hará varias preguntas:
1. **Rutas del SDK y JDK**: Si no las tienes, presiona Enter para que Bubblewrap las instale de manera automática.
2. **Package ID**: Identificador único de tu app en la Play Store. Se recomienda usar el formato inverso del dominio (ej: `com.controlbanquete.app`).
3. **App Name & Short Name**: Presiona Enter para usar los del manifiesto ("Control Banquete").
4. **Display Mode**: Elige `standalone` o `fullscreen` para que se abra a pantalla completa.
5. **Keystore Details**: Te preguntará si quieres crear una nueva clave de firma (Keystore). Di que **Sí (Yes)** y rellena los datos (nombre, organización, contraseñas). 
   > [!WARNING]
   > Guarda muy bien la clave generada (`android.keystore`) y sus contraseñas. Las necesitarás obligatoriamente para subir cualquier actualización futura de la aplicación a Google Play.

---

## Paso 4: Compilar y Firmar el APK y AAB

Una vez finalizada la configuración inicial, compila la aplicación ejecutando:

```bash
bubblewrap build
```

Durante el proceso:
- Se te pedirá la contraseña del Keystore que creaste en el paso anterior.
- El sistema compilará el código y generará dos archivos clave:
  1. `app-release-signed.apk`: Archivo instalable directamente en dispositivos de prueba.
  2. `app-release-bundle.aab` (Android App Bundle): El archivo oficial que debes subir a **Google Play Console**.

---

## Paso 5: Eliminar la Barra del Navegador (Digital Asset Links)

Para probar la propiedad de tu dominio y que Android oculte la barra de navegación del navegador (haciendo que parezca una app nativa), debes subir un archivo de verificación al backend.

Al compilar, Bubblewrap te mostrará una sección de salida con un código JSON o generará un archivo llamado `assetlinks.json`. El formato es similar a este:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.controlbanquete.app",
      "sha256_cert_fingerprints": [
        "XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
      ]
    }
  }
]
```

### Cómo Servirlo en Control Banquete:
El servidor Express está configurado para servir archivos estáticos desde la raíz del proyecto.
1. En la raíz de tu proyecto de código fuente (donde está `server.js`), crea una carpeta llamada **`.well-known`**.
2. Dentro de esa carpeta, crea un archivo llamado **`assetlinks.json`**.
3. Pega el JSON provisto por Bubblewrap (el cual contiene tu firma SHA-256 única).
4. Sube este cambio a GitHub y despliega en Easypanel.
5. Comprueba en tu navegador que el archivo esté accesible públicamente en:
   `https://app.tudominio.com/.well-known/assetlinks.json`

Una vez desplegado este archivo, Android lo verificará al instalar la app y desactivará automáticamente la interfaz del navegador.

---

## Paso 6: Publicar en Google Play Store

1. Ve a [Google Play Console](https://play.google.com/console/) (requiere una cuenta de desarrollador de Google).
2. Haz clic en **Crear aplicación**.
3. Completa los detalles de la tienda (descripción, capturas de pantalla, política de privacidad).
4. Crea un lanzamiento en la pista de **Pruebas internas** o **Producción**.
5. Sube el archivo `app-release-bundle.aab` generado en el Paso 4.
6. Envía la aplicación a revisión por parte de Google. Una vez aprobada, estará disponible para descarga desde la tienda oficial.
