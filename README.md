# 🏰 Control Banquete

Este es un nuevo proyecto basado en el sistema de Control Banquete, listo para ser ejecutado y extendido en cualquier equipo.

## 🛠️ Requisitos
1. Instalar **Node.js** (v18 o superior) desde [nodejs.org](https://nodejs.org).
2. Tener conexión a Internet para que el backend se conecte a la base de datos PostgreSQL remota.

## 🚀 Pasos para Iniciar
Para arrancar el proyecto en un computador nuevo, abre una consola (PowerShell o CMD) en esta carpeta y ejecuta:

```bash
# 1. Instalar dependencias
npm install

# 2. Generar el cliente de base de datos
npx prisma generate

# 3. Arrancar el servidor local
npm start
```

O simplemente haz doble clic en el archivo **`INICIAR_PROYECTO.bat`** (en Windows) para automatizar el arranque.

Luego abre tu navegador en:
**http://localhost:8080/?demo=false**

*(El parámetro ?demo=false asegura que use los datos reales de la base de datos en la nube y desactive el simulador).*
