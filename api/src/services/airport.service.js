const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const AirportModel = require("../models/airport.model");

class AirportService {
  async fetchAirportsFromCSV() {
    const csvPath = path.join(__dirname, "../data/airports.csv");

    return new Promise((resolve, reject) => {
      const airports = [];

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on("data", (row) => {
          if (row.type === "large_airport" || row.type === "medium_airport") {
            airports.push({
              icao: row.ident,
              name: row.name,
              city: row.municipality || null,
              country: row.iso_country,
              coordinates: {
                latitude: parseFloat(row.latitude_deg),
                longitude: parseFloat(row.longitude_deg),
              },
            });
          }
        })
        .on("end", () => {
          console.log(`Parsed ${airports.length} airports from CSV`);
          resolve(airports);
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  async updateAirportDatabase() {
    try {
      const airports = await this.fetchAirportsFromCSV();

      const result = await AirportModel.bulkUpsert(airports);
      console.log(
        `Airport database updated: ${result.inserted} inserted, ${result.updated} updated, ${result.errors} errors`
      );

      return result;
    } catch (error) {
      console.error("Error updating airport database:", error.message);
      throw error;
    }
  }

  async getAllAirports() {
    return AirportModel.findAll();
  }

  async getFilteredAirports(filter = {}) {
    return AirportModel.findFiltered(filter);
  }

  async getAirportByIcao(icao) {
    if (!icao) {
      throw new Error("ICAO code is required");
    }
    return AirportModel.findByIcao(icao);
  }

  async getAirportsByIcaoCodes(icaoCodes) {
    if (!Array.isArray(icaoCodes) || icaoCodes.length === 0) {
      throw new Error("Valid array of ICAO codes is required");
    }

    return AirportModel.findByIcaoCodes(icaoCodes);
  }
}

module.exports = new AirportService();
