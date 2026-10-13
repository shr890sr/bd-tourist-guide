const path = require('node:path');
const express = require('express');
const database = require('./db');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const projectRoot = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 3000;

app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));
app.use('/assets', express.static(path.join(projectRoot, 'assets')));
app.get('/', (_request, response) => {
  response.sendFile(path.join(projectRoot, 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`BD Tourist Guide is available at http://localhost:${port}`);
});

process.on('beforeExit', () => database.close());
