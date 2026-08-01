import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateParty from "./CreateParty";

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => jest.fn(),
  };
});

describe("CreateParty", () => {
  it("shows all supported subscription plans", () => {
    render(
      <MemoryRouter>
        <CreateParty />
      </MemoryRouter>
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Free/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Bronze/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Silver/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Gold/i })).toBeInTheDocument();
  });
});
