// Simple Node.js script to check database state
// Run with: node debug_db.js

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// You'll need to find the actual database file location
// For Android simulator it's usually in the app's data directory
// For now, this is just a template

console.log('Database debugging script');
console.log('Note: You need to locate the actual database file from your app');

// Typical locations for React Native/Expo apps:
// Android: /data/data/YOUR_PACKAGE_NAME/databases/finishline.db
// iOS: simulator app documents directory

const possiblePaths = [
  './finishline.db',
  '../finishline.db'
];

for (const dbPath of possiblePaths) {
  if (fs.existsSync(dbPath)) {
    console.log(`Found database at: ${dbPath}`);
    
    try {
      const db = new Database(dbPath);
      
      // Check if provider_follows table exists
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='provider_follows'").all();
      console.log('provider_follows table exists:', tables.length > 0);
      
      if (tables.length > 0) {
        // Check table schema
        const schema = db.prepare("PRAGMA table_info(provider_follows)").all();
        console.log('provider_follows schema:', schema);
      }
      
      // Check migrations
      const migrations = db.prepare("SELECT * FROM _migrations ORDER BY run_at").all();
      console.log('Applied migrations:', migrations);
      
      db.close();
    } catch (error) {
      console.error('Error accessing database:', error);
    }
  }
}

console.log('\nTo fix the issue, you can:');
console.log('1. Clear app data in Android settings (or iOS simulator)');
console.log('2. Or delete the database file if you can locate it');
console.log('3. Restart the app to trigger fresh migrations');