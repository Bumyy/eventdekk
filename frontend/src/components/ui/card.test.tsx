import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "./card";

describe("Card", () => {
  it("renders with default classes and data-slot attribute", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-slot", "card");
    expect(card).toHaveClass("bg-card", "text-card-foreground", "flex", "flex-col", "gap-3", "rounded-xl", "border", "shadow-sm");
  });

  it("merges custom className", () => {
    render(<Card className="custom-card w-full" data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("custom-card", "w-full");
    expect(card).toHaveClass("bg-card");
  });

  it("passes through additional props", () => {
    render(<Card data-testid="card" aria-label="Info card">Content</Card>);
    expect(screen.getByTestId("card")).toHaveAttribute("aria-label", "Info card");
  });

  it("renders children", () => {
    render(
      <Card>
        <div>Child 1</div>
        <div>Child 2</div>
      </Card>
    );
    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
  });
});

describe("CardHeader", () => {
  it("renders with data-slot attribute and default classes", () => {
    render(<CardHeader data-testid="header">Header Content</CardHeader>);
    const header = screen.getByTestId("header");
    expect(header).toHaveAttribute("data-slot", "card-header");
    expect(header).toHaveClass("@container/card-header", "grid", "gap-1.5", "px-6");
  });

  it("merges custom className", () => {
    render(<CardHeader className="pb-4">Header</CardHeader>);
    const header = screen.getByText("Header");
    expect(header).toHaveClass("pb-4");
    expect(header).toHaveClass("grid");
  });
});

describe("CardTitle", () => {
  it("renders with data-slot attribute and default classes", () => {
    render(<CardTitle data-testid="title">Card Title Text</CardTitle>);
    const title = screen.getByTestId("title");
    expect(title).toHaveAttribute("data-slot", "card-title");
    expect(title).toHaveClass("leading-none", "font-semibold");
  });

  it("merges custom className", () => {
    render(<CardTitle className="text-xl">Title</CardTitle>);
    const title = screen.getByText("Title");
    expect(title).toHaveClass("text-xl");
    expect(title).toHaveClass("font-semibold");
  });
});

describe("CardDescription", () => {
  it("renders with data-slot attribute and default classes", () => {
    render(<CardDescription data-testid="desc">Description text</CardDescription>);
    const desc = screen.getByTestId("desc");
    expect(desc).toHaveAttribute("data-slot", "card-description");
    expect(desc).toHaveClass("text-muted-foreground", "text-sm");
  });

  it("merges custom className", () => {
    render(<CardDescription className="mt-2">Description</CardDescription>);
    const desc = screen.getByText("Description");
    expect(desc).toHaveClass("mt-2");
    expect(desc).toHaveClass("text-sm");
  });
});

describe("CardAction", () => {
  it("renders with data-slot attribute and default classes", () => {
    render(<CardAction data-testid="action">Action Button</CardAction>);
    const action = screen.getByTestId("action");
    expect(action).toHaveAttribute("data-slot", "card-action");
    expect(action).toHaveClass("col-start-2", "row-span-2", "row-start-1", "self-start", "justify-self-end");
  });

  it("merges custom className", () => {
    render(<CardAction className="ml-2">Action</CardAction>);
    const action = screen.getByText("Action");
    expect(action).toHaveClass("ml-2");
    expect(action).toHaveClass("col-start-2");
  });
});

describe("CardContent", () => {
  it("renders with data-slot attribute and default classes", () => {
    render(<CardContent data-testid="content">Main content</CardContent>);
    const content = screen.getByTestId("content");
    expect(content).toHaveAttribute("data-slot", "card-content");
    expect(content).toHaveClass("px-6");
  });

  it("merges custom className", () => {
    render(<CardContent className="py-4">Content</CardContent>);
    const content = screen.getByText("Content");
    expect(content).toHaveClass("py-4");
    expect(content).toHaveClass("px-6");
  });
});

describe("CardFooter", () => {
  it("renders with data-slot attribute and default classes", () => {
    render(<CardFooter data-testid="footer">Footer content</CardFooter>);
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveAttribute("data-slot", "card-footer");
    expect(footer).toHaveClass("flex", "items-center", "px-6");
  });

  it("merges custom className", () => {
    render(<CardFooter className="justify-between">Footer</CardFooter>);
    const footer = screen.getByText("Footer");
    expect(footer).toHaveClass("justify-between");
    expect(footer).toHaveClass("flex");
  });
});

describe("Card composition", () => {
  it("renders complete card structure", () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Card body content</CardContent>
        <CardFooter>Footer actions</CardFooter>
      </Card>
    );

    const card = screen.getByTestId("full-card");
    expect(card).toBeInTheDocument();
    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Card body content")).toBeInTheDocument();
    expect(screen.getByText("Footer actions")).toBeInTheDocument();
  });

  it("renders minimal card structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Simple Card</CardTitle>
        </CardHeader>
        <CardContent>Simple content</CardContent>
      </Card>
    );

    expect(screen.getByText("Simple Card")).toBeInTheDocument();
    expect(screen.getByText("Simple content")).toBeInTheDocument();
  });

  it("renders card with only content", () => {
    render(
      <Card>
        <CardContent>Just content</CardContent>
      </Card>
    );

    expect(screen.getByText("Just content")).toBeInTheDocument();
  });
});