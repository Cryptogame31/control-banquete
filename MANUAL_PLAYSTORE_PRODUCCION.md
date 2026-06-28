# 📱 Manual Definitivo: Subir Control Banquete a Google Play Store (Producción)

Este manual te guiará paso a paso sobre cómo preparar, empaquetar y subir oficialmente tu aplicación **Control Banquete** a la consola de Google Play, incluyendo la configuración de suscripciones con *Google Play Billing* requerida para productos digitales.

---

## FASE 1: Configurar las Suscripciones en Google Play Console

Dado que la app vende suscripciones digitales (acceso a la plataforma), **es obligatorio usar Google Play Billing**. Para que la aplicación pueda mostrar la ventana de cobro de Google, primero debes registrar los productos (SKUs) en la consola:

1. Entra a tu cuenta en [Google Play Console](https://play.google.com/console/).
2. Crea tu aplicación (si no lo has hecho) y completa la configuración inicial (Categoría, Detalles de contacto, Políticas).
3. En el menú izquierdo, ve a **Monetización > Productos > Suscripciones**.
4. Haz clic en **Crear suscripción**.
5. **CRÍTICO:** Debes crear exactamente estos 3 IDs de producto (SKUs), ya que el código de la app está programado para buscarlos:
   - **`cb_monthly`** (Para el plan mensual)
   - **`cb_quarterly`** (Para el plan trimestral)
   - **`cb_yearly`** (Para el plan anual)
6. Asigna el precio correspondiente a cada uno y actívalos.

> [!IMPORTANT]
> **Nota de Seguridad sobre Pagos:** Actualmente tu servidor tiene una validación básica de compras (confía en el token que envía la app). Una vez que la app esté en producción y generando ingresos, te recomendamos activar la **Google Play Developer API**. Para ello necesitarás crear una *Cuenta de Servicio (Service Account)* en Google Cloud y enlazarla a tu Play Console.

---

## FASE 2: Empaquetar la App (Generar el archivo .aab)

Tu proyecto utiliza la tecnología **TWA (Trusted Web Activity)** a través de Bubblewrap. Esto hace que tu servidor web de EasyPanel corra de forma nativa en Android.

1. **Requisitos en tu PC:** Asegúrate de tener instalado Node.js y el JDK 17.
2. Abre una terminal y ejecuta:
   ```bash
   npm install -g @bubblewrap/cli
   ```
3. Crea una carpeta vacía para el empaquetado:
   ```bash
   mkdir control-banquete-android
   cd control-banquete-android
   ```
4. Inicializa el proyecto apuntando a tu dominio de producción:
   ```bash
   bubblewrap init --manifest=https://TU_DOMINIO.easypanel.host/manifest.json
   ```
   *(Sigue las instrucciones del asistente, presiona Enter para usar los valores por defecto. Cuando te pida crear una "Keystore" o llave de firma, dile que Sí (Yes) y anota la contraseña en un lugar muy seguro).*

5. Compila la aplicación:
   ```bash
   bubblewrap build
   ```
   Al finalizar, obtendrás un archivo llamado **`app-release-bundle.aab`**. Este es el archivo oficial que requiere Google Play.

---

## FASE 3: Enlazar el Dominio (Eliminar la barra de URL)

Para que la aplicación parezca 100% nativa (sin barra de navegador superior), Google debe verificar que tú eres el dueño del dominio web.

1. Al finalizar el paso anterior, Bubblewrap te mostrará un código de huella digital SHA-256 en la terminal, o generará un archivo `assetlinks.json`.
2. Ve al código fuente de tu aplicación (Control Banquete).
3. Crea una carpeta oculta en la raíz llamada `.well-known`.
4. Dentro, crea un archivo llamado `assetlinks.json` y pega el código de Bubblewrap. Debe verse así:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.tudominio.app",
       "sha256_cert_fingerprints": ["TU_HUELLA_SHA_256"]
     }
   }]
   ```
5. Sube estos cambios a EasyPanel. Puedes verificar que funcionó entrando desde el navegador a:
   `https://TU_DOMINIO.easypanel.host/.well-known/assetlinks.json`

---

## FASE 4: Subir a Google Play Console

1. Vuelve a Google Play Console.
2. Ve a la sección **Pruebas > Pruebas internas** o **Producción**.
3. Crea una nueva versión (Create Release).
4. Sube el archivo **`app-release-bundle.aab`** que generaste en la Fase 2.
5. Rellena las notas de la versión (ej: "Lanzamiento oficial V1").
6. Asegúrate de haber completado las declaraciones obligatorias en **Contenido de la aplicación**:
   - Política de privacidad (enlaza a `https://TU_DOMINIO.easypanel.host/legal#privacy`).
   - Eliminación de datos (enlaza a `https://TU_DOMINIO.easypanel.host/legal#data-deletion`).
   - Declaración de que eres una App de compras/servicios.
7. Haz clic en **Enviar para revisión**.

¡Felicidades! Una vez que Google revise la aplicación (suele tardar entre 2 y 7 días), estará disponible públicamente en la tienda.
