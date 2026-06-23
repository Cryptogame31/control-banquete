const fs = require('fs');

const serverContent = fs.readFileSync('server.js', 'utf8');
const lines = serverContent.split('\n');

const startIndex = lines.findIndex(l => l.includes('1. Configuración de Firebase Dinámica'));
const endIndex = lines.findIndex(l => l.includes('// Helper para dibujar el PDFKit de forma profesional'));

if (startIndex === -1 || endIndex === -1) {
  console.log('Error finding start or end indices');
  process.exit(1);
}

const newEndpoints = fs.readFileSync('new_endpoints.js', 'utf8');

const newServer = [
  ...lines.slice(0, startIndex - 1),
  newEndpoints,
  ...lines.slice(endIndex)
].join('\n');

fs.writeFileSync('server.js', newServer, 'utf8');
console.log('Replaced successfully');
