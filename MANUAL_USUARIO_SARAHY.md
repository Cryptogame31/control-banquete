# 📖 MANUAL DE USUARIO
# 🏰 Casa de Banquetes Sarahy — Sistema de Gestión Integral

Este manual explica detalladamente el funcionamiento de la aplicación desde la perspectiva del usuario final. Describe cómo cada rol (Superadministrador, Clientes y Equipos de Trabajo) interactúa con la plataforma.

---

## 🔑 1. INGRESO Y LOGIN
1. Abre tu navegador y dirígete a la dirección del sistema (en local: `http://localhost:8080/?demo=false` o el dominio web de producción).
2. Se presentará la pantalla de inicio de sesión de color azul pizarra oscuro con detalles dorados.
3. Introduce tu correo electrónico y tu contraseña y presiona **Iniciar Sesión**.
4. Dependiendo del rol asignado a tu cuenta, el sistema te redirigirá a tu panel de control personalizado.

---

## 👑 2. PANEL DE SUPER ADMINISTRADOR (SUPERADMIN)
El Superadministrador tiene acceso absoluto a todas las herramientas del sistema organizadas en pestañas en la parte superior.

### 📊 A. Dashboard
* Muestra el número de cotizaciones pendientes de revisión.
* Presenta el **Calendario Mensual** de eventos programados. Al hacer clic sobre cualquier día o celda del calendario, se abre el modal para agendar un evento en esa fecha específica.

### 📄 B. Cotizaciones de Clientes
Muestra la lista de cotizaciones que los clientes han realizado en línea desde el cotizador público.
* **Ver / Editar Cotización**: Abre los detalles. Permite modificar invitados, salón o servicios.
* **Aplicar Descuento**: Introduce un descuento (fijo en COP o en porcentaje) y escribe una etiqueta descriptiva (ej. *"Descuento por Temporada"*). El total neto se recalculará automáticamente.
* **Descargar PDF**: Genera y descarga en tu PC la propuesta formal del evento con diseño corporativo premium.
* **Convertir en Evento**: Cuando el cliente confirma el evento y se recibe el abono inicial, presiona este botón. La cotización se guardará como un **Evento Agendado** en el calendario.

### 🗓️ C. Gestión de Eventos (Calendario y Modal de Evento)
Esta sección contiene la agenda viva de celebraciones. Al hacer clic en un evento o presionar **+ Crear Evento**, se abre un modal completo que permite configurar:
1. **Información General**: Cliente propietario (con buscador en tiempo real para localizarlo rápidamente), tipo de fiesta (*Boda, Quinces, Grados, Fiesta Infantil, Empresarial*), fecha, hora e invitados.
2. **Conceptos del Catálogo**: 
   * **Plan de Alimentación (Catering)**: Selecciona el menú de alimentación (o *"Sin Alimentación"* si no incluye comida).
   * **Plan de Fotografía**, **Estilo de Decoración** y **Paquete Recreativo**.
3. **Control Financiero (Abonos)**: 
   * Registra los abonos que realiza el cliente especificando fecha, tipo de pago (*Abono Inicial, Saldo, Extra*) y monto.
   * El sistema calcula automáticamente el total pagado y el saldo pendiente.
4. **Citas y Ensayos**: Programa fechas de visitas técnicas, degustación de platos o ensayos generales. El cliente las verá en su portal.
5. **Cronograma del Día (Timeline)**: Establece las actividades por horas (ej: *"18:00 - Llegada de invitados"*).
6. **Servicios Adicionales**: Marca los servicios extra contratados (meseros extra, licores, sonido, etc.).
7. **Fotografía**: Registra el enlace de Google Drive con las fotos finales y revisa la selección enviada por el cliente.

### 🛍️ D. Catálogo de Servicios y Tarifas
Aquí se gestiona el inventario de conceptos comercializados.
* **Crear / Editar Producto**: Agrega salones, paquetes de fotografía, estilos de decoración, servicios adicionales o platos individuales para el menú.
* **Múltiples Unidades (`allowMultiples`)**: Marca la casilla *"Permitir solicitar múltiples unidades"* para aquellos elementos (como botellas de licor o cajas de cerveza) donde el cliente requiera cotizar cantidades en vez de un sí/no simple.
* **Gestiones y Compras**: Asocia tareas operativas (ej. *"Contratar mariachis"*) o insumos de compra (ej. *"Comprar 5kg de lomo"*) a un servicio. Estas se cargarán automáticamente al checklist operativo cuando se confirme un evento con dicho servicio.
* **Priorización de Productos (Subir / Bajar)**: 
  * Para organizar cómo aparecen las opciones en el cotizador, haz clic en las flechas **▲ (Subir)** o **▼ (Bajar)** en la fila del producto.
  * El catálogo se reordenará y guardará la prioridad de forma permanente.

### 🛠️ E. Valores de Operación (Configuración Global)
* Modifica los costos fijos base (como el valor base de mesero o alimentación base por persona).
* Configura los números de WhatsApp que recibirán las notificaciones de cotizaciones y selecciones de fotos.
* Modifica la lista global de colores disponibles para mantelería.
* Edita el clausulado del **Contrato Legal** que firman los clientes.

### 🚚 F. Panel de Operación / Equipos
Consolida el trabajo logístico y de abastecimiento de todos los eventos próximos:
* **Logística (Gestiones)**: Checklist interactivo de tareas agrupadas por evento y área (Cocina, Logística, Compras, etc.). Cuenta con un buscador en vivo y filtros por estado (*Pendientes / Realizadas*).
* **Compras**: Consolidado de todos los insumos necesarios para los banquetes activos. Puedes filtrar por evento o insumo, marcar los artículos como comprados y guardarlos. Al guardar, el sistema te preguntará si deseas cargar las existencias directamente al **Inventario**.
* **Inventario**: Consulta y edición manual del stock de insumos físicos de la empresa.

---

## 👤 3. PORTAL DEL CLIENTE (NOVIOS / QUINCEAÑERA)
El cliente cuenta con un portal interactivo optimizado para móviles y computadores, estructurado en tres pestañas:

### 🏠 A. Mi Reserva
* **Cuenta Regresiva**: Contador en tiempo real con los días y horas que faltan para el evento.
* **Estado de Cuenta**: Resumen gráfico del valor total, abonos realizados y saldo pendiente de pago.
* **Contrato de Servicio**: Panel donde el cliente puede leer el contrato legal redactado por el administrador y **firmarlo digitalmente** con una pantalla táctil o mouse. Una vez firmado, queda grabado como soporte.
* **Citas Programadas**: Cronograma de reuniones agendadas por la administración.

### 🍽️ B. Selección de Menú
* Permite al cliente diseñar su banquete seleccionando la entrada, plato principal, postre, líquido, etc., de las opciones permitidas para su tipo de evento.
* **Color de Mantelería**: Si el administrador lo habilitó, el cliente verá una cuadrícula de colores disponibles y podrá seleccionar su combinación.
  * *Regla*: Solo se permiten realizar **2 cambios** de selección y esta opción se bloquea automáticamente **10 días antes** del evento por razones de logística.

### 📸 C. Módulo de Fotografía
Se activa automáticamente **10 días después** de que el evento pasa a estado *"realizado"*.
* **Descarga de Fotos**: Botón directo para acceder a la carpeta de Google Drive configurada por el administrador.
* **Selección de Favoritas**: El cliente puede escribir los códigos o números de sus fotos favoritas en el cuadro de texto.
* Al hacer clic en **Enviar Selección**, se abrirá su WhatsApp con un mensaje pre-formateado dirigido al administrador y al fotógrafo con su listado final.

---

## 🛒 4. PORTALES OPERATIVOS (EQUIPOS DE TRABAJO)
Los miembros del equipo (*Cocina, Logística, Compras*) inician sesión y acceden a una vista simplificada enfocada en sus tareas:

* **Cocina (Chef)**:
  * Visualiza los platos y catering contratados para los eventos próximos.
  * El sistema calcula y escala automáticamente los ingredientes de las recetas multiplicándolos por la cantidad exacta de invitados del evento, generando una hoja de producción al instante.
* **Logística**:
  * Consulta las fechas, salones, horas y el cronograma de actividades de cada evento.
  * Marca las gestiones de montaje y logística a su cargo como completadas.
* **Compras**:
  * Consulta el consolidado de insumos requeridos.
  * Registra las compras realizadas marcándolas en el checklist para actualizar las existencias.

---
*Manual de Usuario generado para v16 — Casa de Banquetes Sarahy*
