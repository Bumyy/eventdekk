import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAircraftLiveries,
  fetchAircraftOptions,
} from "./aircraftService";

type MockResponse = {
  ok: boolean;
  statusText: string;
  json: () => Promise<unknown>;
};

function createMockResponse(
  payload: unknown,
  ok = true,
  statusText = "OK"
): MockResponse {
  return {
    ok,
    statusText,
    json: vi.fn().mockResolvedValue(payload),
  };
}

describe("aircraftService", () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("fetchAircraftOptions", () => {
    it("returns aircraft options when response is valid", async () => {
      const payload = {
        success: true,
        data: [{ id: "a1", name: "A320" }],
      };
      fetchMock.mockResolvedValueOnce(createMockResponse(payload));

      await expect(fetchAircraftOptions()).resolves.toEqual(payload.data);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3001/flights/aircraft"
      );
    });

    it("throws when response is not ok", async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ success: true, data: [] }, false, "Bad Request")
      );

      await expect(fetchAircraftOptions()).rejects.toThrow(
        "Failed to fetch aircraft: Bad Request"
      );
    });

    it("throws when payload is invalid", async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ success: false, data: [] })
      );

      await expect(fetchAircraftOptions()).rejects.toThrow(
        "Invalid aircraft response"
      );
    });
  });

  describe("fetchAircraftLiveries", () => {
    it("returns liveries when response is valid", async () => {
      const payload = {
        success: true,
        data: [
          {
            id: "l1",
            aircraftID: "a1",
            aircraftName: "A320",
            liveryName: "Default",
          },
        ],
      };
      fetchMock.mockResolvedValueOnce(createMockResponse(payload));

      await expect(fetchAircraftLiveries("A320")).resolves.toEqual(payload.data);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3001/flights/aircraft/A320/liveries"
      );
    });

    it("encodes the aircraft id in the request URL", async () => {
      const payload = { success: true, data: [] };
      fetchMock.mockResolvedValueOnce(createMockResponse(payload));

      await fetchAircraftLiveries("A320 neo");
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3001/flights/aircraft/A320%20neo/liveries"
      );
    });

    it("throws when response is not ok", async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ success: true, data: [] }, false, "Unauthorized")
      );

      await expect(fetchAircraftLiveries("a1")).rejects.toThrow(
        "Failed to fetch liveries: Unauthorized"
      );
    });

    it("throws when payload is invalid", async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ success: true, data: {} })
      );

      await expect(fetchAircraftLiveries("a1")).rejects.toThrow(
        "Invalid livery response"
      );
    });
  });
});
