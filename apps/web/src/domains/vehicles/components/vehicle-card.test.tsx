import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleVehicle } from "../fixtures";
import { VehicleCard } from "./vehicle-card";

describe("VehicleCard", () => {
  it("links the title to the vehicle page", () => {
    render(<VehicleCard vehicle={sampleVehicle} />);
    const link = screen.getByRole("link", { name: "2024 Toyota Corolla" });
    expect(link).toHaveAttribute("href", "/cars/2024-toyota-corolla-8d2b7a52");
  });

  it("shows the daily price, host, city and an image placeholder when there is no photo", () => {
    render(<VehicleCard vehicle={sampleVehicle} />);
    expect(screen.getByText("$49")).toBeInTheDocument();
    expect(screen.getByText("Kathryn Murphy")).toBeInTheDocument();
    expect(screen.getByText("Lisbon")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2024 Toyota Corolla" })).toBeInTheDocument();
  });

  it("exposes a single link per card to assistive tech", () => {
    render(<VehicleCard vehicle={sampleVehicle} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
