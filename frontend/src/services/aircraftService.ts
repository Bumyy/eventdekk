const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface AircraftOption {
  id: string;
  name: string;
}

export interface LiveryOption {
  id: string;
  aircraftID: string;
  aircraftName: string;
  liveryName: string;
}

export async function fetchAircraftOptions(): Promise<AircraftOption[]> {
  const response = await fetch(`${API_URL}/flights/aircraft`);
  if (!response.ok) {
    throw new Error(`Failed to fetch aircraft: ${response.statusText}`);
  }

  const payload = await response.json();
  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error("Invalid aircraft response");
  }

  return payload.data;
}

export async function fetchAircraftLiveries(
  aircraftId: string
): Promise<LiveryOption[]> {
  const response = await fetch(
    `${API_URL}/flights/aircraft/${encodeURIComponent(aircraftId)}/liveries`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch liveries: ${response.statusText}`);
  }

  const payload = await response.json();
  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error("Invalid livery response");
  }

  return payload.data;
}
