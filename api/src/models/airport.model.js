const db = require("../config/db.config");

class AirportModel {
  // Initialize the airports table in the database
  static initTable() {
    return new Promise((resolve, reject) => {
      const sql = `
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
      `;

      db.run(sql, (err) => {
        if (err) {
          console.error("Error creating airports table:", err.message);
          return reject(new Error("Failed to initialize airports table."));
        }

        // Create indexes for performance
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

        console.log("Airports table checked/created.");
        resolve();
      });
    });
  }

  // Find airport by ICAO code
  static findByIcao(icao) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM airports WHERE icao = ?`;
      db.get(sql, [icao], (err, row) => {
        if (err) {
          console.error("Error finding airport by ICAO:", err.message);
          return reject(new Error("Database error finding airport."));
        }
        resolve(row); // Returns the airport object or undefined
      });
    });
  }

  // Get all airports
  static findAll() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM airports ORDER BY icao`;
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error("Error retrieving all airports:", err.message);
          return reject(new Error("Database error retrieving airports."));
        }
        resolve(rows); // Returns array of all airports
      });
    });
  }

  // Get filtered airports
  static findFiltered(filters = {}) {
    return new Promise((resolve, reject) => {
      const conditions = [];
      const params = [];

      if (filters.icao) {
        conditions.push("icao LIKE ?");
        params.push(`%${filters.icao}%`);
      }

      if (filters.name) {
        conditions.push("name LIKE ?");
        params.push(`%${filters.name}%`);
      }

      if (filters.country) {
        conditions.push("country LIKE ?");
        params.push(`%${filters.country}%`);
      }

      if (filters.city) {
        conditions.push("city LIKE ?");
        params.push(`%${filters.city}%`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const sql = `SELECT * FROM airports ${whereClause} ORDER BY icao`;

      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error("Error retrieving filtered airports:", err.message);
          return reject(
            new Error("Database error retrieving filtered airports.")
          );
        }
        resolve(rows); // Returns array of filtered airports
      });
    });
  }

  // Create or update an airport
  static upsert(airport) {
    return new Promise((resolve, reject) => {
      // Basic validation
      if (!airport.icao || !airport.name) {
        return reject(new Error("ICAO and name are required fields."));
      }

      const sql = `
        INSERT INTO airports (icao, name, city, country, latitude, longitude, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(icao) DO UPDATE SET
          name = excluded.name,
          city = excluded.city,
          country = excluded.country,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          last_updated = CURRENT_TIMESTAMP
      `;

      const params = [
        airport.icao,
        airport.name,
        airport.city || null,
        airport.country || null,
        airport.coordinates?.latitude || null,
        airport.coordinates?.longitude || null,
      ];

      db.run(sql, params, function (err) {
        if (err) {
          console.error("Error upserting airport:", err.message);
          return reject(new Error("Failed to save airport data."));
        }

        resolve({
          icao: airport.icao,
          changes: this.changes,
        });
      });
    });
  }

  // Bulk upsert airports
  static bulkUpsert(airports) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(airports) || airports.length === 0) {
        return reject(new Error("Must provide an array of airports."));
      }

      const results = {
        total: airports.length,
        inserted: 0,
        updated: 0,
        errors: 0,
      };

      // Use a transaction for better performance
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const stmt = db.prepare(`
          INSERT INTO airports (icao, name, city, country, latitude, longitude, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(icao) DO UPDATE SET
            name = excluded.name,
            city = excluded.city,
            country = excluded.country,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            last_updated = CURRENT_TIMESTAMP
        `);

        airports.forEach((airport) => {
          if (airport.icao && airport.name) {
            stmt.run(
              airport.icao,
              airport.name,
              airport.city || null,
              airport.country || null,
              airport.coordinates?.latitude || null,
              airport.coordinates?.longitude || null,
              function (err) {
                if (err) {
                  console.error(
                    `Error upserting airport ${airport.icao}:`,
                    err.message
                  );
                  results.errors++;
                } else if (this.changes > 0) {
                  results.updated++;
                } else {
                  results.inserted++;
                }
              }
            );
          } else {
            results.errors++;
          }
        });

        stmt.finalize();

        db.run("COMMIT", (err) => {
          if (err) {
            console.error("Error committing transaction:", err.message);
            return reject(new Error("Failed to save airport data."));
          }
          resolve(results);
        });
      });
    });
  }

  // Find airports by array of ICAO codes
  static findByIcaoCodes(icaoCodes) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(icaoCodes) || icaoCodes.length === 0) {
        return resolve([]);
      }

      const placeholders = icaoCodes.map(() => "?").join(",");
      const sql = `SELECT * FROM airports WHERE icao IN (${placeholders}) ORDER BY icao`;

      db.all(sql, icaoCodes, (err, rows) => {
        if (err) {
          console.error("Error finding airports by ICAO codes:", err.message);
          return reject(new Error("Database error finding airports."));
        }
        resolve(rows); // Returns array of matching airports
      });
    });
  }
}

module.exports = AirportModel;
