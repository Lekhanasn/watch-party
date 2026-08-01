import {
  canAccessPremiumVideos,
  getDownloadLimit,
  getPlanDetails,
  getWatchTimeLimitMinutes,
  normalizePlan,
} from "./subscriptionPlans";

describe("subscription plan helpers", () => {
  it("normalizes plan names and exposes tier details", () => {
    expect(normalizePlan("FREE")).toBe("free");
    expect(normalizePlan("silver")).toBe("silver");
    expect(getPlanDetails("gold").name).toBe("Gold");
    expect(getPlanDetails("bronze").price).toBe(499);
  });

  it("gives free users limited access and paid tiers richer features", () => {
    expect(getDownloadLimit("free")).toBe(1);
    expect(getDownloadLimit("silver")).toBe(5);
    expect(getWatchTimeLimitMinutes("free")).toBe(60);
    expect(getWatchTimeLimitMinutes("gold")).toBe(480);
    expect(canAccessPremiumVideos("free")).toBe(false);
    expect(canAccessPremiumVideos("silver")).toBe(true);
    expect(getPlanDetails("gold").features).toContain("Ad-free viewing");
  });
});
