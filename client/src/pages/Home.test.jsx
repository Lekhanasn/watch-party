import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";

describe("Home", () => {
  it("shows the upgraded landing experience", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText(/Movies, live chats, and shared playback/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Party/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Join Party/i })).toBeInTheDocument();
  });
});
