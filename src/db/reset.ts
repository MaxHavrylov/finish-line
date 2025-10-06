// Database reset utility
// Add this to your app's debug menu or call manually

import * as SQLite from 'expo-sqlite';
import { getDb } from './index';

export function resetDatabase(): void {
  try {
    console.log('[db-reset] Starting database reset...');
    
    // Close existing connection
    const database = getDb();
    
    // Drop all tables
    const tables = database.getAllSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    
    console.log('[db-reset] Found tables to drop:', tables.map(t => t.name));
    
    for (const table of tables) {
      try {
        database.execSync(`DROP TABLE IF EXISTS ${table.name}`);
        console.log(`[db-reset] Dropped table: ${table.name}`);
      } catch (error) {
        console.warn(`[db-reset] Failed to drop table ${table.name}:`, error);
      }
    }
    
    console.log('[db-reset] Database reset complete. Restart the app to trigger fresh migrations.');
  } catch (error) {
    console.error('[db-reset] Failed to reset database:', error);
  }
}

// Call this function from your app if you want to reset
// resetDatabase();