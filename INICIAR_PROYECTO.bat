@echo off
echo ===================================================
echo 🏰 Iniciando Control Banquete
echo ===================================================
echo.
echo [1/3] Instalando dependencias de Node.js...
call npm install
echo.
echo [2/3] Generando cliente de base de datos Prisma y aplicando esquema...
call npx prisma generate
call npx prisma db push
echo.
echo [3/3] Iniciando servidor Express local...
echo.
echo Tip: Visita http://localhost:8080/?demo=false en tu navegador
echo.
npm start
pause
