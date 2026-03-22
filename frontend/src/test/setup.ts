import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined" && !window.ResizeObserver) {
  // @ts-expect-error test polyfill
  window.ResizeObserver = ResizeObserverMock;
}

afterEach(() => {
  cleanup();
});
