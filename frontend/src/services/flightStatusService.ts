const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface AirportStatusEntry {
  airportIcao: string;
  airportName: string;
  inboundFlightsCount: number;
  inboundFlights: string[];
  outboundFlightsCount: number;
  outboundFlights: string[];
  atcFacilities: unknown[];
}

export interface AirportStatusBatchResponse {
  sessionId: string;
  statuses: Record<string, AirportStatusEntry>;
  errors: Record<string, string>;
  requestedCount: number;
  successCount: number;
}

export const fetchAirportStatusBatch = async (
  icaos: string[]
): Promise<AirportStatusBatchResponse> => {
  const uniqueIcaos = [
    ...new Set(icaos.map((i) => i.trim().toUpperCase()).filter(Boolean)),
  ];
  if (uniqueIcaos.length === 0) {
    return {
      sessionId: "",
      statuses: {},
      errors: {},
      requestedCount: 0,
      successCount: 0,
    };
  }

  const endpoint = `${API_URL}/flights/airport-status/batch?icaos=${encodeURIComponent(
    uniqueIcaos.join(",")
  )}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch airport statuses: ${response.statusText}`);
  }

  const payload = await response.json();
  if (!payload.success || !payload.data) {
    throw new Error("Invalid airport status batch response");
  }

  return payload.data as AirportStatusBatchResponse;
};
