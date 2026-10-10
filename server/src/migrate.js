import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { config } from './config.js';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const conn = await mysql.createConnection({ ...config.db, multipleStatements: true });
await conn.query(sql);
await conn.end();
console.log('Schéma MySQL appliqué.');
