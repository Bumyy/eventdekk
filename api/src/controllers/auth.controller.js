const authService = require("../services/auth.service");
const AuthMethodModel = require("../models/auth.method.model");
const passport = require("passport");
const authMiddleware = require("../middleware/auth.middleware");

class AuthController {
  // --- OAuth Initiators ---
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

  // --- OAuth Linking Initiators ---
  googleLink(req, res, next) {
    const sdbToken = req.query.token;
    if (!sdbToken) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const state = Buffer.from(JSON.stringify({ link: true, sdbToken })).toString('base64');
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: state
    })(req, res, next);
  }

  discordLink(req, res, next) {
    const sdbToken = req.query.token;
    if (!sdbToken) {
      return res.status(401).json({ message: "Authentication required." });
    }
    const state = Buffer.from(JSON.stringify({ link: true, sdbToken })).toString('base64');
    passport.authenticate("discord", {
      scope: ["identify", "email"],
      state: state
    })(req, res, next);
  }

  // --- OAuth Callbacks ---
  googleCallback = (req, res, next) => {
    const getCallbackUrl = (tokenOrError, type = "token", profileData = null, isNewUser = false, isLinked = false) => {
      const baseUrl =
        process.env.REDIRECT_URI?.replace(/\/$/, "") || "http://localhost:5173";
      const callbackPath = baseUrl.includes("/auth/callback")
        ? ""
        : "/auth/callback";

      if (type === "error") {
        const param = `error=${tokenOrError}`;
        return `${baseUrl}${callbackPath}?${param}`;
      }

      let url = `${baseUrl}${callbackPath}?token=${encodeURIComponent(tokenOrError)}`;
      url += `&isNewUser=${isNewUser}`;
      url += `&isLinked=${isLinked}`;

      if (profileData) {
        if (profileData.displayName) {
          url += `&displayName=${encodeURIComponent(profileData.displayName)}`;
        }
        if (profileData.profilePicture) {
          url += `&profilePicture=${encodeURIComponent(profileData.profilePicture)}`;
        }
      }

      return url;
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
        if (data && data.error) {
          return res.redirect(getCallbackUrl(data.error, "error"));
        }
        if (!data || !data.sdbToken) {
          console.log(
            "Google Auth Failed:",
            info?.message || "No SDB token returned."
          );
          return res.redirect(getCallbackUrl("google_failed", "error"));
        }

        console.log("Google Auth Success. Redirecting with token.");
        res.redirect(
          getCallbackUrl(
            data.sdbToken,
            "token",
            data.profileData,
            data.isNewUser,
            data.isLinked || false
          )
        );
      }
    )(req, res, next);
  };

  discordCallback = (req, res, next) => {
    const getCallbackUrl = (tokenOrError, type = "token", profileData = null, isNewUser = false, isLinked = false) => {
      const baseUrl =
        process.env.REDIRECT_URI?.replace(/\/$/, "") || "http://localhost:5173";
      const callbackPath = baseUrl.includes("/auth/callback")
        ? ""
        : "/auth/callback";

      if (type === "error") {
        const param = `error=${tokenOrError}`;
        return `${baseUrl}${callbackPath}?${param}`;
      }

      let url = `${baseUrl}${callbackPath}?token=${encodeURIComponent(tokenOrError)}`;
      url += `&isNewUser=${isNewUser}`;
      url += `&isLinked=${isLinked}`;

      if (profileData) {
        if (profileData.displayName) {
          url += `&displayName=${encodeURIComponent(profileData.displayName)}`;
        }
        if (profileData.profilePicture) {
          url += `&profilePicture=${encodeURIComponent(profileData.profilePicture)}`;
        }
      }

      return url;
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
        if (data && data.error) {
          return res.redirect(getCallbackUrl(data.error, "error"));
        }
        if (!data || !data.sdbToken) {
          console.log(
            "Discord Auth Failed:",
            info?.message || "No SDB token returned."
          );
          return res.redirect(getCallbackUrl("discord_failed", "error"));
        }
        console.log("Discord Auth Success. Redirecting with token.");
        res.redirect(
          getCallbackUrl(
            data.sdbToken,
            "token",
            data.profileData,
            data.isNewUser,
            data.isLinked || false
          )
        );
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

    try {
      const { sdbToken } = await authService.registerPasswordUser(
        username,
        password
      );
      res
        .status(201)
        .json({ message: "Registration successful.", token: sdbToken });
    } catch (error) {
      if (error.message.includes("already taken")) {
        return res.status(409).json({ message: error.message });
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
        if (err) {
          console.error("Local Login Error:", err);
          return res
            .status(500)
            .json({ message: "Login failed due to an internal error." });
        }
        if (!data || !data.sdbToken) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials." });
        }
        res
          .status(200)
          .json({ message: "Login successful.", token: data.sdbToken });
      }
    )(req, res, next);
  }

  // --- Get Linked Accounts ---
  async getLinkedAccounts(req, res) {
    try {
      const methods = await AuthMethodModel.findByUserId(req.user.id);
      const linkedAccounts = methods.map((m) => ({
        type: m.method_type,
        linkedAt: m.created_at,
      }));
      res.status(200).json({ linkedAccounts });
    } catch (error) {
      console.error("Error getting linked accounts:", error);
      res.status(500).json({ message: "Failed to get linked accounts." });
    }
  }

  // --- Logout ---
  async logout(req, res) {
    res.status(200).json({ message: "Logged out successfully." });
  }
}

module.exports = new AuthController();