const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // Add cookie parser
const uploadRouter = require("./routes/upload.route");
const authRouter = require("./routes/auth.route");
const airportRouter = require("./routes/airport.route");
const flightsRouter = require("./routes/flights.route"); // Add the new router
const passport = require("./config/passport.config");
const airportService = require("./services/airport.service");
const flightUpdateScheduler = require("./jobs/flightUpdateScheduler"); // Import the scheduler

const app = express();

// CORS configuration - update to include credentials
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://eventdekk.com",
      "https://www.eventdekk.com",
      "https://api.eventdekk.com",
    ];
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Add a specific preflight handler for the upload endpoint
app.options("/upload", cors(corsOptions));

// Middleware
app.use(cookieParser()); // Add before other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use("/upload", uploadRouter);
app.use("/auth", authRouter);
app.use("/airports", airportRouter);
app.use("/flights", flightsRouter); // Add the new router

// Initialize airport data on startup - after ensuring DB is connected
// We'll use a delay to make sure DB initialization has completed
setTimeout(async () => {
  try {
    console.log("Initializing airport database...");
    await airportService.updateAirportDatabase();
    console.log("Airport database initialization complete");

    // Start flight update service (no longer needs SpacetimeDB)
    flightUpdateScheduler
      .startScheduler()
      .then(() => {
        console.log("Flight service started successfully");
      })
      .catch((err) => {
        console.error("Failed to start flight service:", err);
      });
  } catch (error) {
    console.error("Error initializing airport database:", error);
  }
}, 2000); // Give the database 2 seconds to initialize

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  flightUpdateScheduler.stopScheduler();
  // Other cleanup...
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  flightUpdateScheduler.stopScheduler();
  // Other cleanup...
  process.exit(0);
});

module.exports = app;
