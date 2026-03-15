import distance from "@turf/distance";
import { point } from "@turf/helpers";

// ---- Delivery tier constants (all amounts in cents) ----
export const DELIVERY_TIERS = {
  SHORT: {
    maxKm: 4,
    fee: 3500, // R35.00
    driverAmount: 2000, // R20.00
    platformAmount: 1500, // R15.00
  },
  MEDIUM: {
    minKm: 4,
    maxKm: 10,
    fee: 4500, // R45.00
    driverAmount: 2571, // R25.71
    platformAmount: 1929, // R19.29
  },
} as const;

export const MAX_DELIVERY_KM = 10;

// ---- Types ----
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DeliveryTier {
  fee: number; // in cents
  driverAmount: number; // in cents
  platformAmount: number; // in cents
  distanceKm: number;
  tier: "short" | "medium";
}

// ---- Calculate distance in km between two coordinate pairs ----
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const fromPoint = point([from.longitude, from.latitude]);
  const toPoint = point([to.longitude, to.latitude]);

  // @turf/distance returns distance in kilometers by default
  return distance(fromPoint, toPoint, { units: "kilometers" });
}

// ---- Determine delivery tier from distance ----
// Returns null if distance > 10km (outside service area)
export function getDeliveryTier(distanceKm: number): DeliveryTier | null {
  if (distanceKm < 0) {
    throw new Error("Distance cannot be negative");
  }

  if (distanceKm > MAX_DELIVERY_KM) {
    return null; // Outside service area
  }

  if (distanceKm <= DELIVERY_TIERS.SHORT.maxKm) {
    return {
      fee: DELIVERY_TIERS.SHORT.fee,
      driverAmount: DELIVERY_TIERS.SHORT.driverAmount,
      platformAmount: DELIVERY_TIERS.SHORT.platformAmount,
      distanceKm,
      tier: "short",
    };
  }

  return {
    fee: DELIVERY_TIERS.MEDIUM.fee,
    driverAmount: DELIVERY_TIERS.MEDIUM.driverAmount,
    platformAmount: DELIVERY_TIERS.MEDIUM.platformAmount,
    distanceKm,
    tier: "medium",
  };
}

// ---- Store type for findNearestStore ----
export interface StoreLocation {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
}

export interface NearestStoreResult {
  store: StoreLocation;
  distanceKm: number;
}

// ---- Find nearest store to a given coordinate ----
export function findNearestStore(
  customerCoords: Coordinates,
  stores: StoreLocation[],
): NearestStoreResult | null {
  if (!stores || stores.length === 0) {
    return null;
  }

  let nearest: NearestStoreResult | null = null;

  for (const store of stores) {
    const storeCoords: Coordinates = {
      latitude: Number(store.latitude),
      longitude: Number(store.longitude),
    };

    const distanceKm = calculateDistance(customerCoords, storeCoords);

    if (nearest === null || distanceKm < nearest.distanceKm) {
      nearest = { store, distanceKm };
    }
  }

  return nearest;
}

// ---- Verify if a GPS coordinate is within a given radius of a reference point ----
export function isWithinRadius(
  coords: Coordinates,
  reference: Coordinates,
  radiusKm: number,
): boolean {
  const dist = calculateDistance(coords, reference);
  return dist <= radiusKm;
}
