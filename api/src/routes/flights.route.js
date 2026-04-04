const express = require("express");
const flightsController = require("../controllers/flights.controller");
const router = express.Router();

// GET routes
router.get("/status", flightsController.getConnectionStatus);
router.get("/", flightsController.getFlights); // New route to get all flights
router.get("/airport-status/batch", flightsController.getAirportStatusBatch);
router.get("/aircraft", flightsController.getAircraft);
router.get("/aircraft/liveries", flightsController.getAllLiveries);
router.get("/aircraft/:aircraftId/liveries", flightsController.getAircraftLiveries);

// POST routes
router.post("/update", flightsController.updateLiveFlights);

module.exports = router;
