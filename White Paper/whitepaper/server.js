const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5199;
const DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(DIR, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath);
    const ct = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ┌────────────────────────────────────────────────────┐');
  console.log('  │  NDN IPFS Chain — Interactive White Paper Server   │');
  console.log('  ├────────────────────────────────────────────────────┤');
  console.log(`  │  🌐  http://localhost:${PORT}                          │`);
  console.log('  │  Press Ctrl+C to stop                              │');
  console.log('  └────────────────────────────────────────────────────┘');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process first.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});
