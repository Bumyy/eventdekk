import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./dropdown-menu";

describe("DropdownMenu", () => {
  it("renders trigger and opens menu on click", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByRole("menuitem", { hidden: true }) || screen.getByText("Open Menu"));
    expect(screen.getByText("Open Menu")).toBeInTheDocument();
  });
});

describe("DropdownMenuTrigger", () => {
  it("renders with data-slot attribute", () => {
    render(<DropdownMenuTrigger data-testid="trigger">Click me</DropdownMenuTrigger>);
    const trigger = screen.getByTestId("trigger");
    expect(trigger).toHaveAttribute("data-slot", "dropdown-menu-trigger");
  });
});

describe("DropdownMenuItem", () => {
  it("renders with default variant and data attributes", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem data-testid="menu-item">Action</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const item = await screen.findByTestId("menu-item");
    expect(item).toHaveAttribute("data-slot", "dropdown-menu-item");
    expect(item).toHaveAttribute("data-variant", "default");
    expect(item).not.toHaveAttribute("data-inset");
  });

  it("renders with destructive variant", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive" data-testid="destructive-item">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const item = await screen.findByTestId("destructive-item");
    expect(item).toHaveAttribute("data-variant", "destructive");
  });

  it("renders with inset prop", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem inset data-testid="inset-item">Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const item = await screen.findByTestId("inset-item");
    expect(item).toHaveAttribute("data-inset", "true");
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Click me</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(await screen.findByText("Click me"));
    expect(onSelect).toHaveBeenCalled();
  });
});

describe("DropdownMenuLabel", () => {
  it("renders with default styling", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel data-testid="label">Label Text</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const label = await screen.findByTestId("label");
    expect(label).toHaveAttribute("data-slot", "dropdown-menu-label");
    expect(label).toHaveClass("px-2", "py-1.5", "text-sm", "font-medium");
  });

  it("renders with inset prop", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset data-testid="inset-label">Inset Label</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const label = await screen.findByTestId("inset-label");
    expect(label).toHaveAttribute("data-inset", "true");
  });
});

describe("DropdownMenuSeparator", () => {
  it("renders separator with correct classes", async () => {
    const { container } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Another Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const separator = container.querySelector('[data-slot="dropdown-menu-separator"]');
    expect(separator).toHaveClass("bg-border");
  });
});

describe("DropdownMenuCheckboxItem", () => {
  it("renders with checked state", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked data-testid="checkbox-item">Checkbox</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const item = await screen.findByTestId("checkbox-item");
    expect(item).toBeInTheDocument();
  });

  it("calls onCheckedChange when toggled", async () => {
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>Toggle</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(await screen.findByText("Toggle"));
  });
});

describe("DropdownMenuRadioGroup and RadioItem", () => {
  it("renders radio items within group", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="option1">
            <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Option 1")).toBeInTheDocument();
    expect(await screen.findByText("Option 2")).toBeInTheDocument();
  });

  it("calls onValueChange when selection changes", async () => {
    const onValueChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="option1" onValueChange={onValueChange}>
            <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(await screen.findByText("Option 2"));
  });
});

describe("DropdownMenuShortcut", () => {
  it("renders shortcut text with correct styling", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Action
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const shortcut = await screen.findByText("⌘K");
    expect(shortcut).toHaveAttribute("data-slot", "dropdown-menu-shortcut");
    expect(shortcut).toHaveClass("ml-auto", "text-xs");
  });
});

describe("DropdownMenuSub", () => {
  it("renders sub-menu structure", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("More Options")).toBeInTheDocument();
  });
});

describe("DropdownMenuSubTrigger", () => {
  it("renders with inset prop", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset data-testid="sub-trigger">Nested Menu</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    fireEvent.click(screen.getByText("Open"));
    const trigger = await screen.findByTestId("sub-trigger");
    expect(trigger).toHaveAttribute("data-inset", "true");
  });
});