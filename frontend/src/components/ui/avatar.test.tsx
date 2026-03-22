import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

describe("Avatar", () => {
  it("renders with default classes and data-slot attribute", () => {
    const { container } = render(<Avatar data-testid="avatar" />);
    const avatar = container.firstChild;
    expect(avatar).toHaveAttribute("data-slot", "avatar");
    expect(avatar).toHaveClass("relative", "flex", "size-8", "shrink-0", "overflow-hidden", "rounded-full");
  });

  it("merges custom className", () => {
    const { container } = render(<Avatar className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
    expect(container.firstChild).toHaveClass("relative");
  });

  it("passes through additional props", () => {
    render(<Avatar data-testid="avatar" aria-label="User avatar" />);
    expect(screen.getByTestId("avatar")).toHaveAttribute("aria-label", "User avatar");
  });
});

describe("AvatarImage", () => {
  it("renders with default classes and data-slot attribute", () => {
    render(<AvatarImage src="https://example.com/avatar.jpg" alt="User" />);
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("data-slot", "avatar-image");
    expect(image).toHaveClass("aspect-square", "size-full");
  });

  it("merges custom className", () => {
    render(<AvatarImage src="https://example.com/avatar.jpg" alt="User" className="custom-img" />);
    const image = screen.getByRole("img");
    expect(image).toHaveClass("custom-img");
    expect(image).toHaveClass("aspect-square");
  });

  it("passes src and alt attributes", () => {
    render(<AvatarImage src="https://example.com/avatar.jpg" alt="Test User" />);
    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(image).toHaveAttribute("alt", "Test User");
  });
});

describe("AvatarFallback", () => {
  it("renders with default classes and data-slot attribute", () => {
    render(<AvatarFallback>JD</AvatarFallback>);
    const fallback = screen.getByText("JD");
    expect(fallback).toHaveAttribute("data-slot", "avatar-fallback");
    expect(fallback).toHaveClass("bg-muted", "flex", "size-full", "items-center", "justify-center", "rounded-full");
  });

  it("merges custom className", () => {
    render(<AvatarFallback className="bg-blue-500">AB</AvatarFallback>);
    const fallback = screen.getByText("AB");
    expect(fallback).toHaveClass("bg-blue-500");
    expect(fallback).toHaveClass("flex");
  });

  it("renders children content", () => {
    render(<AvatarFallback data-testid="fallback">Test Content</AvatarFallback>);
    expect(screen.getByTestId("fallback")).toHaveTextContent("Test Content");
  });
});

describe("Avatar composition", () => {
  it("works as a composed component with image", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows fallback when image fails to load", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});