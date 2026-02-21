import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Define the path for the local SQLite database
const dbPath = path.resolve(process.cwd(), 'mimi.db');

let dbInstance: Database | null = null;

export const initDb = async () => {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Connected to SQLite database at', dbPath);

    // Initialize Schema
    await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      age INTEGER,
      gestational_week INTEGER,
      risk_level TEXT DEFAULT 'low'
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      transcript TEXT NOT NULL,
      detected_symptoms TEXT, -- JSON array string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      symptoms TEXT, -- JSON array string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, acknowledged
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

    console.log('SQLite Schema Initialized.');

    return dbInstance;
};

export const getDb = async () => {
    if (!dbInstance) {
        return await initDb();
    }
    return dbInstance;
};
