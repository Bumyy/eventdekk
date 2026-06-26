const UserModel = require("../models/user.model");
const AuthMethodModel = require("../models/auth.method.model");
const bcrypt = require("bcrypt");
require("dotenv").config();

const SALT_ROUNDS = 10;

async function generateSpacetimeDBToken() {
  console.log("Generating SpacetimeDB token...");
  console.log("URL:", process.env.SPACETIME_DB_IDENTITY_URL);

  const response = await fetch(process.env.SPACETIME_DB_IDENTITY_URL, {
    method: "POST",
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("STDB token response error:", errorText);
    throw new Error("Failed to generate SDB token");
  }
  const data = await response.json();
  console.log("Generated new STDB token: " + data.token);

  return data.token;
}

class AuthService {
  /**
   * Handles login/signup via OAuth providers (Google, Discord).
   * Finds existing link or creates new user + link.
   */
  async findOrCreateUserByProvider(methodType, providerId, issuer) {
    try {
      // 1. Check if this provider ID is already linked
      let authMethod = await AuthMethodModel.findByProvider(
        methodType,
        providerId,
        issuer
      );

      if (authMethod) {
        // 2a. Found: Get the associated user's SDB token
        const sdbToken = await UserModel.getSdbToken(authMethod.user_id);
        if (!sdbToken) {
          // This shouldn't happen if data is consistent, but handle it
          console.error(
            `AuthMethod ${authMethod.id} found, but no user or SDB token for user_id ${authMethod.user_id}`
          );
          throw new Error(
            "Account inconsistency detected. Please contact support."
          );
        }
        const user = await UserModel.findById(authMethod.user_id); // Get user info if needed elsewhere
        console.log(`User ${user.id} logged in via ${methodType}.`);
        return { user, sdbToken, isNewUser: false };
      } else {
        // 2b. Not found: Create a new user and link this method
        console.log(`Creating new user via ${methodType} login...`);

        // Generate the SDB token *first* for the new user
        const newSdbToken = await generateSpacetimeDBToken();
        if (!newSdbToken)
          throw new Error("Failed to obtain SpacetimeDB token.");

        // Create the central user record
        const newUser = await UserModel.create(newSdbToken);

        // Link the OAuth method to the new user
        await AuthMethodModel.create(newUser.id, methodType, {
          providerId,
          issuer,
        });
        console.log(
          `New user ${newUser.id} created and linked via ${methodType}.`
        );

        return { user: newUser, sdbToken: newSdbToken, isNewUser: true };
      }
    } catch (error) {
      console.error(
        `Error in findOrCreateUserByProvider (${methodType}):`,
        error
      );
      throw error; // Re-throw to be caught by Passport/controller
    }
  }

  /**
   * Handles user registration via username/password.
   */
  async registerPasswordUser(username, password) {
    try {
      // 1. Check if username already exists
      const existingMethod = await AuthMethodModel.findByUsername(username);
      if (existingMethod) {
        throw new Error("Username already taken.");
      }

      // 2. Hash the password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // 3. Generate SDB token for the new user
      const newSdbToken = await generateSpacetimeDBToken();
      if (!newSdbToken) throw new Error("Failed to obtain SpacetimeDB token.");

      // 4. Create the central user record
      const newUser = await UserModel.create(newSdbToken);

      // 5. Link the password method to the new user
      await AuthMethodModel.create(newUser.id, "password", {
        username,
        passwordHash,
      });
      console.log(
        `New user ${newUser.id} registered with username ${username}.`
      );

      return { user: newUser, sdbToken: newSdbToken };
    } catch (error) {
      console.error(`Error in registerPasswordUser (${username}):`, error);
      throw error;
    }
  }

  /**
   * Verifies username and password for local login.
   */
  async verifyPasswordUser(username, password) {
    try {
      // 1. Find the auth method by username
      const authMethod = await AuthMethodModel.findByUsername(username);
      if (!authMethod || !authMethod.password_hash) {
        return { user: null, sdbToken: null, message: "User not found." };
      }

      // 2. Compare the provided password with the stored hash
      const isMatch = await bcrypt.compare(password, authMethod.password_hash);
      if (!isMatch) {
        return { user: null, sdbToken: null, message: "Incorrect password." };
      }

      // 3. Password matches, get the SDB token
      const sdbToken = await UserModel.getSdbToken(authMethod.user_id);
      if (!sdbToken) {
        console.error(
          `Password verified for username ${username}, but no SDB token found for user_id ${authMethod.user_id}`
        );
        throw new Error("Account inconsistency detected.");
      }
      const user = await UserModel.findById(authMethod.user_id);
      console.log(`User ${user.id} logged in via password.`);

      return { user, sdbToken };
    } catch (error) {
      console.error(`Error in verifyPasswordUser (${username}):`, error);
      throw error;
    }
  }

  // --- Linking Logic ---
  async linkProviderToUser(currentUserId, methodType, providerId, issuer) {
    try {
      const existingLink = await AuthMethodModel.findByProvider(
        methodType,
        providerId,
        issuer
      );

      if (existingLink && existingLink.user_id !== currentUserId) {
        throw new Error(
          "This external account is already linked to a different user."
        );
      }

      if (existingLink && existingLink.user_id === currentUserId) {
        console.log(
          `Account ${methodType} already linked to user ${currentUserId}.`
        );
        return { success: true, message: "Account already linked." };
      }

      await AuthMethodModel.create(currentUserId, methodType, {
        providerId,
        issuer,
      });
      console.log(`Linked ${methodType} account to user ${currentUserId}.`);
      return { success: true, message: "Account linked successfully." };
    } catch (error) {
      console.error(
        `Error linking ${methodType} to user ${currentUserId}:`,
        error
      );
      throw error;
    }
  }

  // Helper to find user by internal ID (used by hypothetical deserializeUser)
  async findUserById(id) {
    return UserModel.findById(id);
  }
}

module.exports = new AuthService();
