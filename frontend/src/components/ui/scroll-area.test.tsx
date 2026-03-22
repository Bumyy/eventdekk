import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollArea, ScrollBar } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders with children and default styling", () => {
    const { container } = render(
      <ScrollArea data-testid="scroll-area">
        <div>Content 1</div>
        <div>Content 2</div>
      </ScrollArea>
    );

    const scrollArea = container.querySelector('[data-slot="scroll-area"]');
    expect(scrollArea).toBeInTheDocument();
    expect(scrollArea).toHaveClass("relative");
    expect(screen.getByText("Content 1")).toBeInTheDocument();
    expect(screen.getByText("Content 2")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    const { container } = render(
      <ScrollArea className="h-[200px] w-[300px]">
        <div>Content</div>
      </ScrollArea>
    );

    const scrollArea = container.querySelector('[data-slot="scroll-area"]');
    expect(scrollArea).toHaveClass("h-[200px]", "w-[300px]");
  });

  it("renders viewport inside scroll area", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );

    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).toBeInTheDocument();
  });

  it("renders content within viewport", () => {
    render(
      <ScrollArea>
        <div data-testid="child">Test Content</div>
      </ScrollArea>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

describe("ScrollArea with ScrollBar", () => {
  it("renders scroll area with content", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
        <ScrollBar />
      </ScrollArea>
    );

    expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("scroll area structure contains expected elements", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );

    expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="scroll-area-viewport"]')).toBeInTheDocument();
  });
});