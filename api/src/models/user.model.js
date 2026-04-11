const db = require("../config/db.config");

class UserModel {
  // Create a new user and return the new user's ID and the stored token
  static create(sdbToken) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO users (sdb_token) VALUES (?)`;
      db.run(sql, [sdbToken], function (err) {
        // Use function() to get 'this'
        if (err) {
          console.error("Error creating user:", err.message);
          return reject(new Error("Failed to create user account."));
        }
        // 'this.lastID' gives the ID of the inserted row
        resolve({ id: this.lastID, sdbToken });
      });
    });
  }

  // Find a user by their internal ID
  static findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, sdb_token FROM users WHERE id = ?`;
      db.get(sql, [id], (err, row) => {
        if (err) {
          console.error("Error finding user by ID:", err.message);
          return reject(new Error("Database error finding user."));
        }
        resolve(row); // Returns the user object { id, sdb_token } or undefined
      });
    });
  }

  // Get the SDB token for a given user ID
  static getSdbToken(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT sdb_token FROM users WHERE id = ?`;
      db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error("Error getting SDB token:", err.message);
          return reject(new Error("Database error getting token."));
        }
        resolve(row ? row.sdb_token : null);
      });
    });
  }

  // Find a user by their SDB token
  static findBySdbToken(sdbToken) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, sdb_token FROM users WHERE sdb_token = ?`;
      db.get(sql, [sdbToken], (err, row) => {
        if (err) {
          console.error("Error finding user by SDB token:", err.message);
          return reject(new Error("Database error finding user."));
        }
        resolve(row || null);
      });
    });
  }
}

module.exports = UserModel;
