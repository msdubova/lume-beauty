import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const here = path.dirname(fileURLToPath(import.meta.url))

try {
  const schema = await fs.readFile(path.join(here, 'database', 'schema.sql'), 'utf8')
  await pool.query(schema)
  console.log('Database schema is ready.')
} catch (error) {
  console.error('Could not create database schema:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
