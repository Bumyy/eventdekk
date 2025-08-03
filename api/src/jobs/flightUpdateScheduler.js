const flightsService = require("../services/flights.service");
require("dotenv").config();

/**
 * Start the flight update scheduler
 */
async function startScheduler() {
  try {
    console.log("Initializing flight service...");

    // Do an initial cache fill
    await flightsService.updateFlightCache();

    console.log("Flight service initialized. Updates will occur on-demand.");
    return true;
  } catch (error) {
    console.error("Failed to initialize flight service:", error);
    throw error;
  }
}

/**
 * Stop the flight update scheduler and clean up resources
 */
function stopScheduler() {
  console.log("Flight service shutdown initiated");
  flightsService.cleanup();
}

module.exports = {
  startScheduler,
  stopScheduler,
};
