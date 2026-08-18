const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Parse .env directly to prioritize local .env configurations over pre-existing system environment variables
let envPort;
try {
  const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env')));
  envPort = envConfig.PORT;
} catch (e) {}

require('dotenv').config();
const app = require('./app');

const PORT = envPort || process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection! Shutting down server...', err);
  server.close(() => {
    process.exit(1);
  });
});
