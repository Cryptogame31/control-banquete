const http = require('http');
const data = JSON.stringify({ email: 'admin@controlbanquete.com', password: '123456' });
const req = http.request(
  { hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
  res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', body));
  }
);
req.on('error', e => console.log('ERROR:', e.message));
req.write(data);
req.end();
