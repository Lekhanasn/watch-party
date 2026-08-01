export function getInitialTheme(region, currentTime = new Date()) {
  const normalizedRegion = (region || "").toLowerCase();
  const shouldUseLightTheme = normalizedRegion.includes("kolkata") || normalizedRegion.includes("india") || normalizedRegion.includes("asia/");

  const istTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const lightWindowStart = 10 * 60;
  const lightWindowEnd = 12 * 60;

  if (shouldUseLightTheme && totalMinutes >= lightWindowStart && totalMinutes <= lightWindowEnd) {
    return "light";
  }

  return "dark";
}

export function getRegionLabel(region) {
  return region || "Unknown region";
}

function normalizeLocationValue(value) {
  return `${value || ""}`.trim().toLowerCase();
}

export function requiresOtpVerification({ currentDevice, storedDevice, currentRegion, storedRegion, currentCity, storedCity, currentState, storedState }) {
  return (
    currentDevice !== storedDevice ||
    normalizeLocationValue(currentRegion) !== normalizeLocationValue(storedRegion) ||
    normalizeLocationValue(currentCity) !== normalizeLocationValue(storedCity) ||
    normalizeLocationValue(currentState) !== normalizeLocationValue(storedState)
  );
}
