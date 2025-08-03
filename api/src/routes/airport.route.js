const express = require("express");
const airportService = require("../services/airport.service");
const router = express.Router();

// Get all airports
router.get("/", async (req, res) => {
  try {
    const airports = await airportService.getAllAirports();
    res.status(200).json(airports);
  } catch (error) {
    console.error("Error fetching airports:", error);
    res
      .status(500)
      .json({ message: "Error fetching airport data", error: error.message });
  }
});

// Get airports by ICAO codes
router.get("/by-icao", async (req, res) => {
  try {
    const { icaoCodes } = req.query;

    // Check if icaoCodes is provided
    if (!icaoCodes) {
      return res.status(400).json({ message: "ICAO codes are required" });
    }

    // Convert to array if it's a comma-separated string
    const icaoArray = Array.isArray(icaoCodes)
      ? icaoCodes
      : icaoCodes.split(",").map((code) => code.trim().toUpperCase());

    const airports = await airportService.getAirportsByIcaoCodes(icaoArray);
    res.status(200).json(airports);
  } catch (error) {
    console.error("Error fetching airports by ICAO codes:", error);
    res.status(500).json({
      message: "Error fetching airports by ICAO codes",
      error: error.message,
    });
  }
});

module.exports = router;
