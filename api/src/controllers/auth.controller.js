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
  googleCallback(req, res, next) {
    passport.authenticate(
      "google",
      {
        failureRedirect: `${process.env.REDIRECT_URI}?error=google_failed`, // Redirect on failure
        session: false, // We are not using sessions for login state persistence
      },
      (err, data, info) => {
        // Custom callback to handle the result
        if (err) {
          console.error("Google Auth Error:", err);
          // Redirect to a frontend page showing a generic error
          return res.redirect(`${process.env.REDIRECT_URI}?error=auth_error`);
        }
        if (!data || !data.sdbToken) {
          // Authentication failed (e.g., user denied access on Google's page)
          console.log(
            "Google Auth Failed:",
            info?.message || "No SDB token returned."
          );
          return res.redirect(
            `${process.env.REDIRECT_URI}?error=google_failed`
          );
        }

        console.log("Google Auth Success. Redirecting with token.");
        res.redirect(
          `${process.env.REDIRECT_URI}?token=${encodeURIComponent(
            data.sdbToken
          )}`
        ); // Redirect to a success handler page/route
      }
    )(req, res, next);
  }

  discordCallback(req, res, next) {
    passport.authenticate(
      "discord",
      {
        failureRedirect: `${process.env.REDIRECT_URI}?error=discord_failed`,
        session: false,
      },
      (err, data, info) => {
        // Custom callback
        if (err) {
          console.error("Discord Auth Error:", err);
          return res.redirect(`${process.env.REDIRECT_URI}?error=auth_error`);
        }
        if (!data || !data.sdbToken) {
          console.log(
            "Discord Auth Failed:",
            info?.message || "No SDB token returned."
          );
          return res.redirect("/login?error=discord_failed");
        }
        console.log("Discord Auth Success. Redirecting with token.");
        res.redirect(
          `${process.env.REDIRECT_URI}?token=${encodeURIComponent(
            data.sdbToken
          )}`
        );
      }
    )(req, res, next);
  }

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

  // --- Simple Success Route ---
  // A route to redirect to after successful OAuth that can pass the token
  // In a real app, this might be a frontend route '/login/success'
  handleSuccess(req, res) {
    const token = req.query.token;
    if (!token) {
      return res
        .status(400)
        .send("Authentication succeeded but token is missing.");
    }
    // Send a simple response or render a page that communicates the token to the client-side app
    res.send(`
            <h1>Authentication Successful</h1>
            <p>Your SpacetimeDB Token:</p>
            <pre id="token" style="word-wrap: break-word; white-space: pre-wrap; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${token}</pre>
            <p>In a real application, JavaScript would likely grab this token and store it (e.g., in localStorage or memory) and then redirect the user.</p>
            <script>
                // Example: Storing token in localStorage and redirecting
                try {
                    const token = document.getElementById('token').textContent;
                    localStorage.setItem('sdb_token', token);
                    // Redirect to the main app page after a short delay
                     // window.location.href = '/app'; // Or wherever your app lives
                     console.log('Token stored in localStorage:', token);
                     alert('Login successful! Token stored in localStorage (check console). You would typically redirect now.');
                } catch (e) {
                    console.error('Could not access localStorage or process token.', e);
                    alert('Login succeeded, but could not store token automatically. Please copy the token above.');
                }
            </script>
        `);
  }

  // --- Placeholder Login Page Route ---
  // You'd likely serve a real HTML page here
  serveLoginPage(req, res) {
    const error = req.query.error;
    let errorMessage = "";
    if (error) {
      errorMessage = `<p style="color: red;">Login failed: ${error.replace(
        /_/g,
        " "
      )}</p>`;
    }
    res.send(`
            <h1>Login</h1>
            ${errorMessage}
            <h2>Login with Username/Password</h2>
            <form action="/auth/login" method="post">
                <div>
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div>
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <button type="submit">Login</button>
            </form>
            <hr>
             <h2>Register Username/Password</h2>
             <form action="/auth/register" method="post">
                <div>
                    <label for="reg_username">Username:</label>
                    <input type="text" id="reg_username" name="username" required>
                </div>
                <div>
                    <label for="reg_password">Password:</label>
                    <input type="password" id="reg_password" name="password" required>
                </div>
                <button type="submit">Register</button>
            </form>
            <hr>
            <h2>Login with OAuth</h2>
            <a href="/auth/google"><button>Login with Google</button></a>
            <br><br>
            <a href="/auth/discord"><button>Login with Discord</button></a>
        `);
  }
}

module.exports = new AuthController();
