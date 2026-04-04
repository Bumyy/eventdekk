const flightsService = require("../services/flights.service");

// Track client sessions
const clientSessions = new Map();
const SESSION_TIMEOUT_MS = 5000;
let cleanupInterval = null;

/**
 * Initialize cleanup interval for sessions
 */
function initializeSessionCleanup() {
  if (cleanupInterval === null) {
    console.log("Starting automatic session cleanup interval");
    // Run cleanup every 30 seconds
    cleanupInterval = setInterval(cleanupSessions, 10000);

    // Ensure cleanup stops when Node.js exits
    process.on("beforeExit", () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
      }
    });
  }
}

// Start the cleanup interval when module loads
initializeSessionCleanup();

/**
 * Generate or retrieve a session ID for the client
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string} The session ID
 */
function getClientSession(req, res) {
  // First check for session ID in cookie
  const cookieSessionId = req.cookies && req.cookies.flightSessionId;

  // Then check for session ID in header
  const headerSessionId = req.headers["x-session-id"];

  // Finally check query parameter
  const querySessionId = req.query.sessionId;

  // Try to use existing session ID from any source
  const existingSessionId =
    cookieSessionId || headerSessionId || querySessionId;

  if (existingSessionId && clientSessions.has(existingSessionId)) {
    // Update last activity time for existing session
    clientSessions.set(existingSessionId, Date.now());
    return existingSessionId;
  }

  // Create a new session ID if we don't have a valid one
  const sessionId = `session_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 10)}`;
  clientSessions.set(sessionId, Date.now());
  flightsService.registerClient();

  // Set session cookie for future requests (if response object available)
  if (res && res.cookie) {
    res.cookie("flightSessionId", sessionId, {
      maxAge: SESSION_TIMEOUT_MS,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  console.log(`New flight session created: ${sessionId}`);
  return sessionId;
}

/**
 * Clean up inactive client sessions
 */
function cleanupSessions() {
  const now = Date.now();
  let cleaned = 0;
  let activeCount = clientSessions.size;

  if (activeCount === 0) {
    return; // No sessions to clean up
  }

  for (const [sessionId, lastActive] of clientSessions.entries()) {
    if (now - lastActive > SESSION_TIMEOUT_MS) {
      clientSessions.delete(sessionId);
      flightsService.unregisterClient();
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(
      `Cleaned up ${cleaned} inactive flight data sessions. Active sessions remaining: ${clientSessions.size}`
    );
  } else {
    console.log(`Session cleanup ran. Active sessions: ${clientSessions.size}`);
  }
}

/**
 * Get all flights
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFlights(req, res) {
  try {
    // Register this client and get a session ID
    const sessionId = getClientSession(req, res);

    // Get the forceRefresh parameter
    const forceRefresh = req.query.forceRefresh === "true";

    // Get flights from cache or API
    const flightData = await flightsService.getFlights(forceRefresh);

    // Add session ID to response
    res.set("X-Session-ID", sessionId);

    res.status(200).json({
      success: true,
      sessionId,
      data: flightData,
    });
  } catch (error) {
    console.error("Error in getFlights controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve flight data",
      error: error.message,
    });
  }
}

/**
 * Trigger a manual update of live flights
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateLiveFlights(req, res) {
  try {
    const forceRefresh = req.body.forceRefresh === true;
    const result = await flightsService.updateLiveFlights(forceRefresh);

    if (result.success) {
      res.status(200).json({
        message: `Successfully updated ${result.flightCount} flights`,
        ...result,
      });
    } else {
      res.status(500).json({
        message: "Failed to update live flights",
        ...result,
      });
    }
  } catch (error) {
    console.error("Error in updateLiveFlights controller:", error);
    res.status(500).json({
      message: "An unexpected error occurred",
      error: error.message,
    });
  }
}

/**
 * Get airport status for a batch of ICAOs
 * Query params:
 * - icaos: comma separated ICAO list
 * - forceRefresh: true|false
 * - sessionId: optional IF session id
 */
async function getAirportStatusBatch(req, res) {
  try {
    const icaosRaw = req.query.icaos || "";
    const icaos = icaosRaw
      .split(",")
      .map((icao) => icao.trim().toUpperCase())
      .filter(Boolean);

    if (icaos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameter: icaos",
      });
    }

    const forceRefresh = req.query.forceRefresh === "true";
    const sessionId = req.query.sessionId;

    const data = await flightsService.getAirportStatuses(icaos, {
      forceRefresh,
      sessionId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getAirportStatusBatch controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve airport statuses",
      error: error.message,
    });
  }
}

async function getAircraft(req, res) {
  try {
    const forceRefresh = req.query.forceRefresh === "true";
    const data = await flightsService.getAircraft(forceRefresh);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getAircraft controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve aircraft",
      error: error.message,
    });
  }
}

async function getAllLiveries(req, res) {
  try {
    const forceRefresh = req.query.forceRefresh === "true";
    const data = await flightsService.getAllLiveries(forceRefresh);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getAllLiveries controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve liveries",
      error: error.message,
    });
  }
}

async function getAircraftLiveries(req, res) {
  try {
    const aircraftId = req.params.aircraftId;
    const forceRefresh = req.query.forceRefresh === "true";

    if (!aircraftId) {
      return res.status(400).json({
        success: false,
        message: "Missing aircraftId parameter",
      });
    }

    const data = await flightsService.getAircraftLiveries(aircraftId, forceRefresh);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in getAircraftLiveries controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve aircraft liveries",
      error: error.message,
    });
  }
}

/**
 * Get status of service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getConnectionStatus(req, res) {
  // Get cache status
  const cacheStatus = {
    isStale: flightsService.isCacheStale(),
    activeClients: clientSessions.size,
    lastUpdated: flightsService.getFlights().then((data) => data.lastUpdated),
  };

  res.status(200).json({
    status: "running",
    cache: cacheStatus,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getFlights,
  updateLiveFlights,
  getConnectionStatus,
  getAirportStatusBatch,
  getAircraft,
  getAllLiveries,
  getAircraftLiveries,
  // Export for testing and explicit cleanup
  cleanupSessions,
};
