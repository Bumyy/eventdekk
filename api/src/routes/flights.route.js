const express = require("express");
const flightsController = require("../controllers/flights.controller");
const router = express.Router();

// GET routes
router.get("/status", flightsController.getConnectionStatus);
router.get("/", flightsController.getFlights); // New route to get all flights

// POST routes
router.post("/update", flightsController.updateLiveFlights);

module.exports = router;
