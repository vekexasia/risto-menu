import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Flag } from "./Flag";

describe("Flag", () => {
  it("renders the bundled SVG for a known locale", () => {
    render(<Flag code="it" label="Italiano" />);
    const img = screen.getByRole("img", { name: "Italiano" });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });

  it("uses the customUrl when provided, even for a known locale", () => {
    render(<Flag code="it" customUrl="https://cdn.example.com/flags/it.png" label="Italiano" />);
    const img = screen.getByRole("img", { name: "Italiano" });
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/flags/it.png");
  });

  it("falls back to a code chip for unknown locales without customUrl", () => {
    render(<Flag code="vec" label="Vèneto" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("VEC")).toBeInTheDocument();
  });

  it("uses customUrl for unknown locales", () => {
    render(<Flag code="vec" customUrl="https://cdn.example.com/flags/vec.png" label="Vèneto" />);
    const img = screen.getByRole("img", { name: "Vèneto" });
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/flags/vec.png");
  });

  it("treats null customUrl as absent", () => {
    render(<Flag code="vec" customUrl={null} label="Vèneto" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("VEC")).toBeInTheDocument();
  });

  it("falls back to uppercased code when no label is provided", () => {
    render(<Flag code="zz" />);
    expect(screen.getByText("ZZ")).toBeInTheDocument();
  });

  it("hides decorative flags from assistive tech", () => {
    const { container } = render(<Flag code="it" decorative />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
  });
});
