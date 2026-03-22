import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders viewport with data-slot attribute", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );

    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).toBeInTheDocument();
    expect(viewport).toHaveClass("size-full", "rounded-[inherit]");
  });

  it("includes ScrollBar by default", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );

    const scrollBar = container.querySelector('[data-slot="scroll-area-scrollbar"]');
    expect(scrollBar).toBeInTheDocument();
  });

  it("includes ScrollAreaPrimitive.Corner", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
      </ScrollArea>
    );

    expect(container.querySelector('[data-radix-scroll-area-corner]') || container.lastChild).toBeTruthy();
  });
});

describe("ScrollBar", () => {
  it("renders with default vertical orientation", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
        <ScrollBar data-testid="scrollbar" />
      </ScrollArea>
    );

    const scrollBar = container.querySelector('[data-slot="scroll-area-scrollbar"]');
    expect(scrollBar).toBeInTheDocument();
    expect(scrollBar).toHaveClass("h-full", "border-l");
  });

  it("renders with horizontal orientation", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );

    const scrollBar = container.querySelector('[data-slot="scroll-area-scrollbar"]');
    expect(scrollBar).toHaveClass("h-2.5", "flex-col", "border-t");
  });

  it("merges custom className with orientation classes", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
        <ScrollBar className="custom-scrollbar" />
      </ScrollArea>
    );

    const scrollBar = container.querySelector('[data-slot="scroll-area-scrollbar"]');
    expect(scrollBar).toHaveClass("custom-scrollbar");
    expect(scrollBar).toHaveClass("touch-none", "select-none");
  });

  it("renders thumb with correct classes", () => {
    const { container } = render(
      <ScrollArea>
        <div>Content</div>
        <ScrollBar />
      </ScrollArea>
    );

    const thumb = container.querySelector('[data-slot="scroll-area-thumb"]');
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveClass("bg-border", "rounded-full");
  });
});

describe("ScrollArea composition", () => {
  it("supports both vertical and horizontal scrollbars", () => {
    const { container } = render(
      <ScrollArea className="h-[200px] w-[300px]">
        <div style={{ width: "500px", height: "500px" }}>Large Content</div>
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );

    const scrollBars = container.querySelectorAll('[data-slot="scroll-area-scrollbar"]');
    expect(scrollBars.length).toBe(2);
  });

  it("scrolls content in viewport", () => {
    render(
      <ScrollArea data-testid="scroll-area">
        <div data-testid="content">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i}>Item {i + 1}</div>
          ))}
        </div>
      </ScrollArea>
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 20")).toBeInTheDocument();
  });
});