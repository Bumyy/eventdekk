export interface Airport {
  id: number;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  last_updated: string;
}

export type AirportMap = Record<string, Airport>;

// API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetches airport data for provided ICAO codes
 */
export const fetchAirportsByIcao = async (
  icaoCodes: string[]
): Promise<AirportMap> => {
  if (!icaoCodes.length) return {};

  // Filter out duplicates and empty codes
  const uniqueCodes = [...new Set(icaoCodes.filter((code) => !!code))];

  try {
    const response = await fetch(
      `${API_URL}/airports/by-icao?icaoCodes=${uniqueCodes.join(",")}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch airports: ${response.statusText}`);
    }

    const airports: Airport[] = await response.json();

    // Convert to map for easier lookup
    const airportMap: AirportMap = {};
    airports.forEach((airport) => {
      airportMap[airport.icao] = airport;
    });

    return airportMap;
  } catch (error) {
    console.error("Error fetching airport data:", error);
    return {};
  }
};
