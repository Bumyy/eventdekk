const sqlite3 = require("sqlite3").verbose();
const path = require("path");
require("dotenv").config();

const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, "..", "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    initializeDb();
  }
});

// Function to initialize database tables if they don't exist
function initializeDb() {
  db.serialize(() => {
    // users table: Stores the core user and their SDB token
    db.run(
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sdb_token TEXT NOT NULL, -- The JWT token from SpacetimeDB
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) console.error("Error creating users table:", err.message);
        else console.log("Users table checked/created.");
      }
    );

    // auth_methods table: Links different login methods to a user
    db.run(
      `
      CREATE TABLE IF NOT EXISTS auth_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        method_type TEXT NOT NULL CHECK(method_type IN ('google', 'discord', 'password')), -- 'google', 'discord', 'password'
        provider_id TEXT,          -- Google sub, Discord ID (unique per provider)
        issuer TEXT,               -- OIDC issuer URL (e.g., https://accounts.google.com)
        username TEXT UNIQUE,      -- Unique username for 'password' type
        password_hash TEXT,        -- Hashed password for 'password' type
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(method_type, provider_id, issuer) -- Ensure unique external IDs per type
      )
    `,
      (err) => {
        if (err)
          console.error("Error creating auth_methods table:", err.message);
        else console.log("AuthMethods table checked/created.");
      }
    );

    // airports table: Stores airport data
    db.run(
      `
      CREATE TABLE IF NOT EXISTS airports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        icao TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        city TEXT,
        country TEXT,
        latitude REAL,
        longitude REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) console.error("Error creating airports table:", err.message);
        else {
          console.log("Airports table checked/created.");

          // Create indexes for airports table
          db.run(
            "CREATE INDEX IF NOT EXISTS idx_airports_icao ON airports(icao)",
            (err) => {
              if (err) console.error("Error creating ICAO index:", err.message);
            }
          );

          db.run(
            "CREATE INDEX IF NOT EXISTS idx_airports_country ON airports(country)",
            (err) => {
              if (err)
                console.error("Error creating country index:", err.message);
            }
          );

          db.run(
            "CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city)",
            (err) => {
              if (err) console.error("Error creating city index:", err.message);
            }
          );
        }
      }
    );
  });
}

module.exports = db;
