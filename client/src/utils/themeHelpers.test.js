import { getInitialTheme, getRegionLabel, requiresOtpVerification } from "./themeHelpers";

describe("theme helpers", () => {
  it("uses light theme for midday IST logins", () => {
    const theme = getInitialTheme("Asia/Kolkata", new Date("2024-01-01T10:30:00+05:30"));
    expect(theme).toBe("light");
  });

  it("uses dark theme outside the preferred time window", () => {
    const theme = getInitialTheme("Asia/Kolkata", new Date("2024-01-01T20:30:00+05:30"));
    expect(theme).toBe("dark");
  });

  it("requests OTP verification for new regions, cities, states, or devices", () => {
    expect(
      requiresOtpVerification({
        currentDevice: "device-b",
        storedDevice: "device-a",
        currentRegion: "Asia/Kolkata",
        storedRegion: "Asia/Mumbai",
        currentCity: "Kolkata",
        storedCity: "Mumbai",
        currentState: "West Bengal",
        storedState: "Maharashtra",
      })
    ).toBe(true);

    expect(
      requiresOtpVerification({
        currentDevice: "device-b",
        storedDevice: "device-b",
        currentRegion: "Asia/Kolkata",
        storedRegion: "Asia/Kolkata",
        currentCity: "Kolkata",
        storedCity: "Kolkata",
        currentState: "West Bengal",
        storedState: "West Bengal",
      })
    ).toBe(false);
  });

  it("formats region labels cleanly", () => {
    expect(getRegionLabel("Asia/Kolkata")).toBe("Asia/Kolkata");
  });
});
