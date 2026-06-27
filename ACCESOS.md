# 🚀 Accesos e Información de Inicio — Control Banquete

Este documento contiene todos los enlaces de producción, credenciales de administrador y la configuración de inicio para el despliegue en EasyPanel de tu aplicación móvil de Google Play Store.

---

## 🌐 Enlaces de Producción (EasyPanel)

El dominio público asignado a tu aplicación es:  
👉 **`https://control-banquete-controlban.uah3tl.easypanel.host`**

### 📱 Flujo de la App (Página de Inicio)
* **Pantalla de Entrada**: Al entrar al dominio sin haber iniciado sesión, la aplicación te enviará automáticamente a la pantalla de creación de cuentas (SuperAdmin):  
  🔗 [https://control-banquete-controlban.uah3tl.easypanel.host/register.html](https://control-banquete-controlban.uah3tl.easypanel.host/register.html)
* **Inicio de Sesión**: Para usuarios con cuentas creadas (SuperAdmin, chef, cotizadores, clientes):  
  🔗 [https://control-banquete-controlban.uah3tl.easypanel.host/login.html](https://control-banquete-controlban.uah3tl.easypanel.host/login.html)
* **Gestión de Planes y Facturación**: Pantalla nativa con diseño para Play Store para suscribirse a los planes (Mensual $10, Trimestral $35, Anual $95):  
  🔗 [https://control-banquete-controlban.uah3tl.easypanel.host/subscription.html](https://control-banquete-controlban.uah3tl.easypanel.host/subscription.html)

---

## 🛡️ Credenciales del Ultra Admin (Administrador Global)

Esta es la cuenta especial e independiente del sistema diseñada para que el administrador principal gestione la plataforma, edite las suscripciones, extienda días de prueba y elimine negocios.

* **Enlace del panel**:  
  🔗 [https://control-banquete-controlban.uah3tl.easypanel.host/ultraadmin.html](https://control-banquete-controlban.uah3tl.easypanel.host/ultraadmin.html)
* **Credenciales por defecto**:
  * **Email / Usuario**: `ultra@controlbanquete.com`
  * **Contraseña**: `UltraAdmin2026!`

---

## ⚖️ Enlaces de Políticas (Requeridos por Google Play Console)

Google Play Store exige que pongas enlaces públicos a los términos legales y de eliminación de datos de tu aplicación en la ficha de Play Console.

| Documento Legal | Enlace Directo |
| :--- | :--- |
| **Política de Privacidad** | [Ver Privacidad](https://control-banquete-controlban.uah3tl.easypanel.host/legal.html#privacy) |
| **Términos de Servicio** | [Ver Términos](https://control-banquete-controlban.uah3tl.easypanel.host/legal.html#terms) |
| **Política de Cancelación y Reembolso** | [Ver Cancelación](https://control-banquete-controlban.uah3tl.easypanel.host/legal.html#cancellation) |
| **Solicitud de Eliminación de Datos** | [Ver Eliminación de Datos](https://control-banquete-controlban.uah3tl.easypanel.host/legal.html#data-deletion) |

---

## 🍽️ Enlace del Cotizador Público de tu Negocio

Cada negocio (SuperAdmin) tiene una página pública para que sus clientes coticen de manera independiente. El enlace dinámico se compone del ID del negocio (`tenantId`).

* **Estructura del enlace**:  
  `https://control-banquete-controlban.uah3tl.easypanel.host/cotizar.html?t={ID_DEL_NEGOCIO}`

---

## ⚙️ Parámetros del Servidor y Base de Datos

### 1. Inyección de Base de Datos en EasyPanel
Asegúrate de agregar la variable de entorno para conectar la base de datos PostgreSQL:
* **Key**: `DATABASE_URL`
* **Value**: `postgresql://postgres:control321***@72.61.11.171:5432/controlbanquete?schema=public`

### 2. Puerto de Escucha
* El puerto configurado internamente y mapeado en la pestaña **General** de tu App en EasyPanel es el **`8080`**.
