const authService = require("../services/auth.service");
const passport = require("passport");

class AuthController {
  // --- OAuth Initiators ---
  // Redirects user to the provider's login page
  googleLogin(req, res, next) {
    passport.authenticate("google", { scope: ["profile", "email"] })(
      req,
      res,
      next
    );
  }

  discordLogin(req, res, next) {
    passport.authenticate("discord", { scope: ["identify", "email"] })(
      req,
      res,
      next
    );
  }

  // --- OAuth Callbacks ---
  // Provider redirects back here after user authorizes/denies
  googleCallback = (req, res, next) => {
    // Helper to build callback URL
    const getCallbackUrl = (tokenOrError, type = "token") => {
      const baseUrl =
        process.env.REDIRECT_URI?.replace(/\/$/, "") || "http://localhost:5173";
      const callbackPath = baseUrl.includes("/auth/callback")
        ? ""
        : "/auth/callback";
      const param =
        type === "token"
          ? `token=${encodeURIComponent(tokenOrError)}`
          : `error=${tokenOrError}`;
      return `${baseUrl}${callbackPath}?${param}`;
    };

    passport.authenticate(
      "google",
      {
        failureRedirect: getCallbackUrl("google_failed", "error"),
        session: false,
      },
      (err, data, info) => {
        if (err) {
          console.error("Google Auth Error:", err);
          return res.redirect(getCallbackUrl("auth_error", "error"));
        }
        if (!data || !data.sdbToken) {
          console.log(
            "Google Auth Failed:",
            info?.message || "No SDB token returned."
          );
          return res.redirect(getCallbackUrl("google_failed", "error"));
        }

        console.log("Google Auth Success. Redirecting with token.");
        res.redirect(getCallbackUrl(data.sdbToken, "token"));
      }
    )(req, res, next);
  };

  discordCallback = (req, res, next) => {
    // Helper to build callback URL
    const getCallbackUrl = (tokenOrError, type = "token") => {
      const baseUrl =
        process.env.REDIRECT_URI?.replace(/\/$/, "") || "http://localhost:5173";
      const callbackPath = baseUrl.includes("/auth/callback")
        ? ""
        : "/auth/callback";
      const param =
        type === "token"
          ? `token=${encodeURIComponent(tokenOrError)}`
          : `error=${tokenOrError}`;
      return `${baseUrl}${callbackPath}?${param}`;
    };

    passport.authenticate(
      "discord",
      {
        failureRedirect: getCallbackUrl("discord_failed", "error"),
        session: false,
      },
      (err, data, info) => {
        if (err) {
          console.error("Discord Auth Error:", err);
          return res.redirect(getCallbackUrl("auth_error", "error"));
        }
        if (!data || !data.sdbToken) {
          console.log(
            "Discord Auth Failed:",
            info?.message || "No SDB token returned."
          );
          return res.redirect(getCallbackUrl("discord_failed", "error"));
        }
        console.log("Discord Auth Success. Redirecting with token.");
        res.redirect(getCallbackUrl(data.sdbToken, "token"));
      }
    )(req, res, next);
  };

  // --- Username/Password Registration ---
  async register(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }
    // Add more validation (password strength, username format) here

    try {
      const { sdbToken } = await authService.registerPasswordUser(
        username,
        password
      );
      // Return the SDB token upon successful registration
      res
        .status(201)
        .json({ message: "Registration successful.", token: sdbToken });
    } catch (error) {
      // Handle specific errors like "Username already taken"
      if (error.message.includes("already taken")) {
        return res.status(409).json({ message: error.message }); // 409 Conflict
      }
      console.error("Registration Error:", error);
      res
        .status(500)
        .json({ message: "Registration failed due to an internal error." });
    }
  }

  // --- Username/Password Login ---
  localLogin(req, res, next) {
    passport.authenticate(
      "local",
      {
        session: false,
      },
      (err, data, info) => {
        // Custom callback
        if (err) {
          console.error("Local Login Error:", err);
          return res
            .status(500)
            .json({ message: "Login failed due to an internal error." });
        }
        if (!data || !data.sdbToken) {
          // Authentication failed (user not found or wrong password)
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials." });
        }
        // Success! Return the SDB token.
        res
          .status(200)
          .json({ message: "Login successful.", token: data.sdbToken });
      }
    )(req, res, next);
  }
}

module.exports = new AuthController();
