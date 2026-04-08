
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',   // DB_HOST
  user: 'root',        // DB_USER
  password: 'Chi23324', // DB_PASSWORD
  database: 'gametoanhoc', // DB_NAME
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
