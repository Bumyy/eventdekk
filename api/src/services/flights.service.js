const axios = require("axios");
require("dotenv").config();

// Configuration
const IF_API_URL =
  process.env.IF_API_URL || "https://api.infiniteflight.com/public/v2";
const IF_API_KEY = process.env.IF_API_KEY;
const IF_SESSION_ID =
  process.env.IF_SESSION_ID || "ed323139-baa7-4834-b9d6-5fb9f19ff11e";
const CACHE_TTL_MS = parseInt(process.env.FLIGHT_CACHE_TTL_MS, 10) || 5000; // 5 seconds by default
const AIRPORT_STATUS_CACHE_TTL_MS =
  parseInt(process.env.AIRPORT_STATUS_CACHE_TTL_MS, 10) || 15000;
const INACTIVE_CLEANUP_MS = 10000; // 10 seconds with no clients before stopping updates

// Cache state
let flightCache = [];
let lastUpdateTime = null;
let activeClients = 0;
let updateTimer = null;
let updateInProgress = false;
let lastClientActivityTime = Date.now();
let inactivityTimer = null;
const airportStatusCache = new Map();

/**
 * Initialize inactivity timer to stop updates after extended period with no clients
 */
function startInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  inactivityTimer = setTimeout(() => {
    const timeSinceLastActivity = Date.now() - lastClientActivityTime;

    if (activeClients === 0 && timeSinceLastActivity >= INACTIVE_CLEANUP_MS) {
      console.log(
        `No client activity for ${
          INACTIVE_CLEANUP_MS / 1000
        } seconds. Stopping update scheduler.`
      );

      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }

      // Clear cache to free memory if not used for extended period
      flightCache = [];
      console.log("Flight cache cleared due to inactivity");
    }

    // Continue checking for inactivity
    startInactivityTimer();
  }, 60000); // Check every minute
}

// Start inactivity timer when module loads
startInactivityTimer();

/**
 * Check if the cache is stale and needs refreshing
 * @returns {boolean} True if cache is stale
 */
function isCacheStale() {
  if (!lastUpdateTime) return true;
  const now = Date.now();
  return now - lastUpdateTime > CACHE_TTL_MS;
}

/**
 * Register a new client requesting flight data
 * @returns {number} The current number of active clients
 */
function registerClient() {
  activeClients++;
  lastClientActivityTime = Date.now();
  console.log(`Flight client registered. Active clients: ${activeClients}`);

  // Start update timer if this is the first client
  if (activeClients === 1 && !updateTimer) {
    scheduleNextUpdate();
  }

  return activeClients;
}

/**
 * Unregister a client that no longer needs flight data
 * @returns {number} The remaining number of active clients
 */
function unregisterClient() {
  activeClients = Math.max(0, activeClients - 1);
  lastClientActivityTime = Date.now();
  console.log(`Flight client unregistered. Active clients: ${activeClients}`);

  // We keep the timer running for a while even with no clients
  // The inactivity timer will clean up if no activity for extended period

  return activeClients;
}

/**
 * Schedule the next update based on cache staleness
 */
function scheduleNextUpdate() {
  if (updateTimer) {
    clearTimeout(updateTimer);
  }

  // Only schedule updates if we have active clients
  if (activeClients > 0) {
    const timeUntilStale = !lastUpdateTime
      ? 0
      : Math.max(0, CACHE_TTL_MS - (Date.now() - lastUpdateTime));

    updateTimer = setTimeout(async () => {
      if (activeClients > 0) {
        try {
          await updateFlightCache();
        } catch (error) {
          console.error("Scheduled flight cache update failed:", error);
        }
        scheduleNextUpdate();
      }
    }, timeUntilStale);

    console.log(`Next flight update scheduled in ${timeUntilStale}ms`);
  }
}

/**
 * Fetch live flights from the Infinite Flight API
 * @returns {Promise<Array>} Live flight data
 */
async function fetchLiveFlights() {
  try {
    if (!IF_API_KEY) {
      throw new Error("IF_API_KEY not configured");
    }

    const response = await axios.get(
      `${IF_API_URL}/sessions/${IF_SESSION_ID}/flights`,
      {
        headers: {
          Authorization: `Bearer ${IF_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`IF API returned status ${response.status}`);
    }

    return response.data.result || [];
  } catch (error) {
    console.error("Error fetching flights from IF API:", error);
    throw error;
  }
}

function isAirportStatusCacheStale(lastUpdated) {
  if (!lastUpdated) return true;
  return Date.now() - lastUpdated > AIRPORT_STATUS_CACHE_TTL_MS;
}

async function fetchAirportStatus(airportIcao, sessionId = IF_SESSION_ID) {
  if (!IF_API_KEY) {
    throw new Error("IF_API_KEY not configured");
  }

  const normalizedIcao = String(airportIcao || "").trim().toUpperCase();
  if (!normalizedIcao) {
    throw new Error("airportIcao is required");
  }

  const response = await axios.get(
    `${IF_API_URL}/sessions/${sessionId}/airport/${normalizedIcao}/status`,
    {
      headers: {
        Authorization: `Bearer ${IF_API_KEY}`,
        Accept: "application/json",
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`IF API returned status ${response.status}`);
  }

  const result = response.data?.result;
  if (!result) {
    throw new Error("Invalid airport status response from IF API");
  }

  return {
    airportIcao: result.airportIcao,
    airportName: result.airportName,
    inboundFlightsCount: result.inboundFlightsCount || 0,
    inboundFlights: Array.isArray(result.inboundFlights)
      ? result.inboundFlights
      : [],
    outboundFlightsCount: result.outboundFlightsCount || 0,
    outboundFlights: Array.isArray(result.outboundFlights)
      ? result.outboundFlights
      : [],
    atcFacilities: Array.isArray(result.atcFacilities) ? result.atcFacilities : [],
  };
}

async function getAirportStatuses(icaoCodes, options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const sessionId = options.sessionId || IF_SESSION_ID;

  const uniqueIcaos = [...new Set((icaoCodes || [])
    .map((code) => String(code || "").trim().toUpperCase())
    .filter((code) => code.length === 4))];

  const statuses = {};
  const errors = {};

  await Promise.all(
    uniqueIcaos.map(async (icao) => {
      const cacheKey = `${sessionId}:${icao}`;
      const cached = airportStatusCache.get(cacheKey);

      if (!forceRefresh && cached && !isAirportStatusCacheStale(cached.lastUpdated)) {
        statuses[icao] = cached.data;
        return;
      }

      try {
        const data = await fetchAirportStatus(icao, sessionId);
        airportStatusCache.set(cacheKey, {
          data,
          lastUpdated: Date.now(),
        });
        statuses[icao] = data;
      } catch (error) {
        errors[icao] = error.message || "Failed to fetch airport status";
      }
    })
  );

  return {
    sessionId,
    statuses,
    errors,
    requestedCount: uniqueIcaos.length,
    successCount: Object.keys(statuses).length,
  };
}

/**
 * Transform IF API flight data to a simpler format
 * @param {Array} flights - Raw flight data from IF API
 * @returns {Array} Transformed flight data
 */
function transformFlightData(flights) {
  return flights.map((flight) => ({
    flight_id: flight.flightId || String(flight.id),
    callsign: flight.callsign || "UNKNOWN",
    aircraft_id: flight.aircraftId || "UNKNOWN",
    livery_id: flight.liveryId || "DEFAULT",
    latitude: flight.latitude,
    longitude: flight.longitude,
    altitude: Math.round(flight.altitude), // Convert to int
    heading: Math.round(flight.heading), // Convert to int
    ground_speed: Math.round(flight.speed), // Convert to int
    last_updated: new Date().toISOString(),
  }));
}

/**
 * Update the flight cache with fresh data from IF API
 * @returns {Promise<Object>} Result of the update operation
 */
async function updateFlightCache() {
  // Prevent concurrent updates
  if (updateInProgress) {
    console.log("Flight update already in progress, skipping");
    return { success: true, cached: true, flightCount: flightCache.length };
  }

  updateInProgress = true;
  try {
    console.log("Fetching live flights from IF API...");
    const rawFlights = await fetchLiveFlights();
    console.log(`Received ${rawFlights.length} flights from IF API`);

    flightCache = transformFlightData(rawFlights);
    lastUpdateTime = Date.now();

    console.log(`Flight cache updated with ${flightCache.length} flights`);
    return {
      success: true,
      flightCount: flightCache.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to update flight cache:", error);
    return {
      success: false,
      error: error.message,
    };
  } finally {
    updateInProgress = false;
  }
}

/**
 * Get flights from cache, updating if stale
 * @param {boolean} forceRefresh - Force a refresh of the cache
 * @returns {Promise<Object>} The flight data and metadata
 */
async function getFlights(forceRefresh = false) {
  // Update last client activity time
  lastClientActivityTime = Date.now();

  if (forceRefresh || isCacheStale()) {
    await updateFlightCache();
  }

  return {
    flights: flightCache,
    count: flightCache.length,
    lastUpdated: lastUpdateTime ? new Date(lastUpdateTime).toISOString() : null,
    cached: !forceRefresh,
  };
}

/**
 * Update live flights (no longer sends to SpacetimeDB)
 * @param {boolean} forceRefresh - Force a refresh of the cache
 * @returns {Promise<Object>} Result of the operation
 */
async function updateLiveFlights(forceRefresh = false) {
  try {
    // Only update cache if needed
    if (forceRefresh || isCacheStale()) {
      await updateFlightCache();
    }

    return {
      success: true,
      flightCount: flightCache.length,
      lastUpdated: lastUpdateTime
        ? new Date(lastUpdateTime).toISOString()
        : null,
      message: "Flight data updated in cache",
    };
  } catch (error) {
    console.error("Failed to update live flights:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Add cleanup method for when server is shutting down
function cleanup() {
  if (updateTimer) {
    clearTimeout(updateTimer);
    updateTimer = null;
  }

  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  activeClients = 0;
  flightCache = [];
  airportStatusCache.clear();
  console.log("Flight service cleaned up");
}

module.exports = {
  fetchLiveFlights,
  updateFlightCache,
  updateLiveFlights,
  getFlights,
  registerClient,
  unregisterClient,
  isCacheStale,
  getAirportStatuses,
  cleanup, // Export cleanup function
  getActiveClients: () => activeClients, // Export active client count
  getLastActivity: () => lastClientActivityTime, // Export last activity time
};
