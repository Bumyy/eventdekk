import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";

describe("Dialog", () => {
  it("renders trigger and opens dialog on click", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog content here</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open Dialog" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Dialog Title")).toBeInTheDocument();
  });

  it("closes dialog when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    const closeButton = screen.getByRole("button", { name: "Close" });
    await user.click(closeButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DialogTrigger", () => {
  it("renders with data-slot attribute", () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Click me</DialogTrigger>
      </Dialog>
    );
    const trigger = screen.getByTestId("trigger");
    expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");
  });

  it("passes through additional props", () => {
    render(
      <Dialog>
        <DialogTrigger aria-label="Open dialog">Open</DialogTrigger>
      </Dialog>
    );
    expect(screen.getByRole("button", { name: "Open dialog" })).toBeInTheDocument();
  });
});

describe("DialogContent", () => {
  it("renders with data-slot attribute", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent data-testid="content">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const content = await screen.findByTestId("content");
    expect(content).toHaveAttribute("data-slot", "dialog-content");
  });

  it("merges custom className", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent className="custom-dialog">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const content = await screen.findByRole("dialog");
    expect(content).toHaveClass("custom-dialog");
    expect(content).toHaveClass("bg-background");
  });

  it("renders close button", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(await screen.findByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});

describe("DialogHeader", () => {
  it("renders with data-slot attribute and default classes", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader data-testid="header">Header Content</DialogHeader>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const header = await screen.findByTestId("header");
    expect(header).toHaveAttribute("data-slot", "dialog-header");
    expect(header).toHaveClass("flex", "flex-col", "gap-2");
  });
});

describe("DialogFooter", () => {
  it("renders with data-slot attribute and default classes", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter data-testid="footer">Footer</DialogFooter>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const footer = await screen.findByTestId("footer");
    expect(footer).toHaveAttribute("data-slot", "dialog-footer");
    expect(footer).toHaveClass("flex", "flex-col-reverse", "gap-2");
  });
});

describe("DialogTitle", () => {
  it("renders with data-slot attribute and default classes", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle data-testid="title">Dialog Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const title = await screen.findByTestId("title");
    expect(title).toHaveAttribute("data-slot", "dialog-title");
    expect(title).toHaveClass("text-lg", "leading-none", "font-semibold");
  });

  it("merges custom className", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle className="text-2xl">Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const title = await screen.findByText("Title");
    expect(title).toHaveClass("text-2xl");
    expect(title).toHaveClass("font-semibold");
  });
});

describe("DialogDescription", () => {
  it("renders with data-slot attribute and default classes", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription data-testid="desc">Description text</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    const desc = await screen.findByTestId("desc");
    expect(desc).toHaveAttribute("data-slot", "dialog-description");
    expect(desc).toHaveClass("text-muted-foreground", "text-sm");
  });
});

describe("DialogClose", () => {
  it("closes dialog when clicked inside content", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogClose data-testid="custom-close">Close Me</DialogClose>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByTestId("custom-close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Dialog composition", () => {
  it("renders complete dialog structure", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open Complete Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Title</DialogTitle>
            <DialogDescription>Complete description</DialogDescription>
          </DialogHeader>
          <div>Body content</div>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open Complete Dialog" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByText("Complete Title")).toBeInTheDocument();
    expect(await screen.findByText("Complete description")).toBeInTheDocument();
    expect(await screen.findByText("Body content")).toBeInTheDocument();
    expect(await screen.findByText("Cancel")).toBeInTheDocument();
  });

  it("passes onOpenChange callback", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});