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

describe("AvatarFallback", () => {
  it("renders fallback text within Avatar", () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders fallback with custom className", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback className="bg-blue-500">AB</AvatarFallback>
      </Avatar>
    );
    expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
  });
});

describe("Avatar composition", () => {
  it("renders Avatar component structure", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("applies custom className to Avatar root", () => {
    const { container } = render(
      <Avatar className="w-12 h-12">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toHaveClass("w-12", "h-12");
  });
});