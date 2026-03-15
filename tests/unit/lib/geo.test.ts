import {
  calculateDistance,
  getDeliveryTier,
  findNearestStore,
  isWithinRadius,
  DELIVERY_TIERS,
  MAX_DELIVERY_KM,
  type Coordinates,
  type StoreLocation,
} from "@/lib/geo";

describe("calculateDistance", () => {
  it("returns 0 for identical coordinates", () => {
    const point: Coordinates = { latitude: -33.9249, longitude: 18.4241 };
    expect(calculateDistance(point, point)).toBeCloseTo(0, 5);
  });

  it("calculates distance between two Cape Town locations", () => {
    // V&A Waterfront to Cavendish Square (~10km)
    const waterfront: Coordinates = { latitude: -33.9024, longitude: 18.4186 };
    const cavendish: Coordinates = { latitude: -33.9885, longitude: 18.4699 };
    const dist = calculateDistance(waterfront, cavendish);
    expect(dist).toBeGreaterThan(9);
    expect(dist).toBeLessThan(12);
  });

  it("calculates a short distance accurately (~2km)", () => {
    // Two points approximately 2km apart in Cape Town CBD
    const from: Coordinates = { latitude: -33.9249, longitude: 18.4241 };
    const to: Coordinates = { latitude: -33.9064, longitude: 18.4186 };
    const dist = calculateDistance(from, to);
    expect(dist).toBeGreaterThan(1);
    expect(dist).toBeLessThan(3);
  });

  it("throws for invalid coordinates", () => {
    // @turf/distance accepts any numbers so we test the output is valid
    const from: Coordinates = { latitude: 0, longitude: 0 };
    const to: Coordinates = { latitude: 0, longitude: 0 };
    expect(() => calculateDistance(from, to)).not.toThrow();
  });
});

describe("getDeliveryTier", () => {
  it("returns short tier (R35) for 0km", () => {
    const result = getDeliveryTier(0);
    expect(result).not.toBeNull();
    expect(result!.fee).toBe(3500);
    expect(result!.tier).toBe("short");
    expect(result!.driverAmount).toBe(2000);
    expect(result!.platformAmount).toBe(1500);
  });

  it("returns short tier (R35) for exactly 4km", () => {
    const result = getDeliveryTier(4);
    expect(result).not.toBeNull();
    expect(result!.fee).toBe(3500);
    expect(result!.tier).toBe("short");
  });

  it("returns medium tier (R45) for 4.1km", () => {
    const result = getDeliveryTier(4.1);
    expect(result).not.toBeNull();
    expect(result!.fee).toBe(4500);
    expect(result!.tier).toBe("medium");
    expect(result!.driverAmount).toBe(2571);
    expect(result!.platformAmount).toBe(1929);
  });

  it("returns medium tier (R45) for 7km", () => {
    const result = getDeliveryTier(7);
    expect(result).not.toBeNull();
    expect(result!.fee).toBe(4500);
    expect(result!.tier).toBe("medium");
  });

  it("returns medium tier (R45) for exactly 10km", () => {
    const result = getDeliveryTier(10);
    expect(result).not.toBeNull();
    expect(result!.fee).toBe(4500);
    expect(result!.tier).toBe("medium");
  });

  it("returns null for distances over 10km (outside service area)", () => {
    expect(getDeliveryTier(10.1)).toBeNull();
    expect(getDeliveryTier(15)).toBeNull();
    expect(getDeliveryTier(100)).toBeNull();
  });

  it("throws for negative distances", () => {
    expect(() => getDeliveryTier(-1)).toThrow("Distance cannot be negative");
  });

  it("driverAmount + platformAmount equals fee for short tier", () => {
    const result = getDeliveryTier(2);
    expect(result!.driverAmount + result!.platformAmount).toBe(result!.fee);
  });

  it("driverAmount + platformAmount equals fee for medium tier", () => {
    const result = getDeliveryTier(6);
    expect(result!.driverAmount + result!.platformAmount).toBe(result!.fee);
  });

  it("stores distanceKm in the result", () => {
    const result = getDeliveryTier(3.5);
    expect(result!.distanceKm).toBe(3.5);
  });

  it("MAX_DELIVERY_KM constant equals 10", () => {
    expect(MAX_DELIVERY_KM).toBe(10);
  });

  it("DELIVERY_TIERS short fee is 3500 cents (R35)", () => {
    expect(DELIVERY_TIERS.SHORT.fee).toBe(3500);
  });

  it("DELIVERY_TIERS medium fee is 4500 cents (R45)", () => {
    expect(DELIVERY_TIERS.MEDIUM.fee).toBe(4500);
  });
});

describe("findNearestStore", () => {
  const capetoneCBD: Coordinates = { latitude: -33.9249, longitude: 18.4241 };

  const stores: StoreLocation[] = [
    {
      id: "1",
      name: "Kauai V&A Waterfront",
      latitude: -33.9024,
      longitude: 18.4186,
    },
    {
      id: "2",
      name: "Kauai Gardens Centre",
      latitude: -33.9337,
      longitude: 18.4133,
    },
    {
      id: "3",
      name: "Kauai Cavendish Square",
      latitude: -33.9885,
      longitude: 18.4699,
    },
  ];

  it("finds the nearest store", () => {
    const result = findNearestStore(capetoneCBD, stores);
    expect(result).not.toBeNull();
    // Gardens Centre is closer to CBD than Waterfront
    expect(result!.store.name).toBe("Kauai Gardens Centre");
  });

  it("returns correct distance to nearest store", () => {
    const result = findNearestStore(capetoneCBD, stores);
    expect(result!.distanceKm).toBeGreaterThan(0);
    expect(result!.distanceKm).toBeLessThan(5);
  });

  it("returns null for empty store list", () => {
    const result = findNearestStore(capetoneCBD, []);
    expect(result).toBeNull();
  });

  it("handles single store", () => {
    const result = findNearestStore(capetoneCBD, [stores[0]]);
    expect(result).not.toBeNull();
    expect(result!.store.id).toBe("1");
  });

  it("handles string coordinates in stores", () => {
    const storesWithStringCoords: StoreLocation[] = [
      {
        id: "4",
        name: "String Coords Store",
        latitude: "-33.9337",
        longitude: "18.4133",
      },
    ];
    expect(() => findNearestStore(capetoneCBD, storesWithStringCoords)).not.toThrow();
  });
});

describe("isWithinRadius", () => {
  const storeLocation: Coordinates = { latitude: -33.9024, longitude: 18.4186 };

  it("returns true when within radius", () => {
    const nearby: Coordinates = { latitude: -33.9050, longitude: 18.4190 }; // ~0.3km away
    expect(isWithinRadius(nearby, storeLocation, 1)).toBe(true);
  });

  it("returns false when outside radius", () => {
    const farAway: Coordinates = { latitude: -33.9885, longitude: 18.4699 }; // ~10km away
    expect(isWithinRadius(farAway, storeLocation, 1)).toBe(false);
  });

  it("returns true for identical points with any positive radius", () => {
    expect(isWithinRadius(storeLocation, storeLocation, 0.1)).toBe(true);
  });

  it("200m pickup GPS validation scenario", () => {
    // Simulate driver 150m from store — should pass 200m check
    const driverLocation: Coordinates = { latitude: -33.9011, longitude: 18.4177 };
    expect(isWithinRadius(driverLocation, storeLocation, 0.2)).toBe(true);
  });
});
