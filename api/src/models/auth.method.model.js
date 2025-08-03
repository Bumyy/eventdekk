const db = require("../config/db.config");

class AuthMethodModel {
  // Find an auth method by provider details
  static findByProvider(methodType, providerId, issuer) {
    return new Promise((resolve, reject) => {
      // Handle potential null issuer for Discord if decided
      const sql = `SELECT * FROM auth_methods WHERE method_type = ? AND provider_id = ? AND issuer = ?`;
      const params = [methodType, providerId, issuer];

      db.get(sql, params, (err, row) => {
        if (err) {
          console.error("Error finding auth method by provider:", err.message);
          return reject(new Error("Database error finding auth method."));
        }
        resolve(row); // Returns the auth method object or undefined
      });
    });
  }

  // Find an auth method by username (for password login)
  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM auth_methods WHERE method_type = 'password' AND username = ?`;
      db.get(sql, [username], (err, row) => {
        if (err) {
          console.error("Error finding auth method by username:", err.message);
          return reject(new Error("Database error finding user by username."));
        }
        resolve(row); // Returns the auth method object or undefined
      });
    });
  }

  // Create a new auth method linked to a user
  static create(userId, methodType, details) {
    return new Promise((resolve, reject) => {
      const {
        providerId = null,
        issuer = null,
        username = null,
        passwordHash = null,
      } = details;

      // Basic validation
      if (!userId || !methodType) {
        return reject(new Error("User ID and method type are required."));
      }
      if (methodType === "password" && !username) {
        return reject(new Error("Username is required for password method."));
      }
      if (
        (methodType === "google" || methodType === "discord") &&
        !providerId
      ) {
        return reject(new Error("Provider ID is required for OAuth method."));
      }

      const sql = `INSERT INTO auth_methods (user_id, method_type, provider_id, issuer, username, password_hash)
                         VALUES (?, ?, ?, ?, ?, ?)`;
      const params = [
        userId,
        methodType,
        providerId,
        issuer,
        username,
        passwordHash,
      ];

      db.run(sql, params, function (err) {
        if (err) {
          // Handle unique constraint violation (e.g., username already exists)
          if (
            err.message.includes(
              "UNIQUE constraint failed: auth_methods.username"
            )
          ) {
            return reject(new Error("Username already exists."));
          }
          if (
            err.message.includes(
              "UNIQUE constraint failed: auth_methods.method_type, auth_methods.provider_id, auth_methods.issuer"
            )
          ) {
            return reject(
              new Error("This external account is already linked.")
            );
          }
          console.error("Error creating auth method:", err.message);
          return reject(new Error("Failed to link authentication method."));
        }
        resolve({ id: this.lastID }); // Return ID of the new auth method row
      });
    });
  }

  // Potentially add methods to find all methods for a user (for linking UI)
  // static findByUserId(userId) { ... }
}

module.exports = AuthMethodModel;
