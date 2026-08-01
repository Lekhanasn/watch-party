const planCatalog = {
  free: {
    name: "Free",
    price: 0,
    downloadLimit: 1,
    watchTimeLimitMinutes: 60,
    canAccessPremiumVideos: false,
    canDownload: true,
    adFree: false,
    features: ["Limited video access", "1 download per day", "Standard viewing"],
  },
  bronze: {
    name: "Bronze",
    price: 499,
    downloadLimit: 3,
    watchTimeLimitMinutes: 180,
    canAccessPremiumVideos: true,
    canDownload: true,
    adFree: false,
    features: ["Premium video access", "3 downloads per day", "Extended watch time"],
  },
  silver: {
    name: "Silver",
    price: 799,
    downloadLimit: 5,
    watchTimeLimitMinutes: 300,
    canAccessPremiumVideos: true,
    canDownload: true,
    adFree: false,
    features: ["Premium video access", "5 downloads per day", "Longer watch sessions"],
  },
  gold: {
    name: "Gold",
    price: 1299,
    downloadLimit: 10,
    watchTimeLimitMinutes: 480,
    canAccessPremiumVideos: true,
    canDownload: true,
    adFree: true,
    features: ["Premium video access", "10 downloads per day", "Ad-free viewing", "Extended watch time"],
  },
};

export function normalizePlan(plan) {
  if (!plan) return "free";
  const normalized = `${plan}`.trim().toLowerCase();
  return normalized in planCatalog ? normalized : "free";
}

export function getPlanDetails(plan) {
  return planCatalog[normalizePlan(plan)] || planCatalog.free;
}

export function canAccessPremiumVideos(plan) {
  return getPlanDetails(plan).canAccessPremiumVideos;
}

export function getDownloadLimit(plan) {
  return getPlanDetails(plan).downloadLimit;
}

export function getWatchTimeLimitMinutes(plan) {
  return getPlanDetails(plan).watchTimeLimitMinutes;
}

export function getPlanOptions() {
  return Object.entries(planCatalog).map(([key, details]) => ({
    value: key,
    label: details.name,
    price: details.price,
    features: details.features,
  }));
}
